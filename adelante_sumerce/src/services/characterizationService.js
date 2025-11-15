const { Business, BusinessModel, Finance, WorkTeam, Rating } = require('../models');
const sequelize = require('../config/database');
const cacheService = require('./cacheService');

class CharacterizationService {
    calculateOperationTimeScore(operationMonths) {
        switch (operationMonths) {
            case 'menos_6_meses': return 0;
            case '6_12_meses': return 1;
            case '12_24_meses': return 2;
            case 'mas_24_meses': return 3;
            default: return 0;
        }
    }

    calculateFinanceScores(financeData) {
        let score = 0;

        // Ventas netas mensuales
        switch (financeData.monthlyNetSales) {
            case 'menos_1_smmlv': score += 0; break;
            case '1_3_smmlv': score += 1; break;
            case '3_mas_smmlv': score += 2; break;
        }

        // Rentabilidad mensual
        switch (financeData.monthlyProfitability) {
            case 'menos_medio_smmlv': score += 0; break;
            case 'medio_1_smmlv': score += 1; break;
            case '2_mas_smmlv': score += 2; break;
        }

        // Costos fijos mensuales
        switch (financeData.monthlyFixedCosts) {
            case 'menos_medio_smmlv': score += 0; break;
            case 'medio_1_smmlv': score += 1; break;
            case '2_mas_smmlv': score += 2; break;
        }

        return score;
    }

    calculateWorkTeamScores(workTeamData) {
        let score = 0;

        // Formación empresarial
        switch (workTeamData.businessTrainingLevel) {
            case 'sin_formacion': score += 0; break;
            case 'tecnica_profesional': score += 1; break;
            case 'administracion_emprendimiento': score += 2; break;
        }

        // Personal capacitado
        score += workTeamData.hasTrainedStaff ? 1 : 0;

        // Roles definidos
        score += workTeamData.hasDefinedRoles ? 1 : 0;

        return score;
    }

    calculateGlobalClassification(totalScore) {
        // Máximo puntaje posible: 13 puntos
        const percentage = (totalScore / 13) * 100;

        if (percentage < 30) return 'idea_inicial';
        if (percentage < 70) return 'en_desarrollo';
        return 'consolidado';
    }

    async saveCharacterization(businessData, businessModelData, financeData, workTeamData) {
        const t = await sequelize.transaction();

        try {
            // 1. Crear el emprendimiento
            const business = await Business.create(businessData, { transaction: t });
            const businessId = business.id;

            // 2. Crear modelo de negocio
            businessModelData.businessId = businessId;
            await BusinessModel.create(businessModelData, { transaction: t });

            // 3. Crear finanzas
            financeData.businessId = businessId;
            await Finance.create(financeData, { transaction: t });

            // 4. Crear equipo de trabajo
            workTeamData.businessId = businessId;
            await WorkTeam.create(workTeamData, { transaction: t });

            // 5. Calcular puntajes
            const operationTimeScore = this.calculateOperationTimeScore(businessData.operationMonths);
            const financeScore = this.calculateFinanceScores(financeData);
            const workTeamScore = this.calculateWorkTeamScores(workTeamData);

            const totalScore = operationTimeScore + financeScore + workTeamScore;
            const globalClassification = this.calculateGlobalClassification(totalScore);

            // 6. Crear calificación
            const rating = await Rating.create({
                businessId,
                generalDataScore: operationTimeScore,
                businessModelScore: 0, // Este puntaje no se especificó en los requisitos
                financeScore,
                workTeamScore,
                socialImpactScore: 0, // Este puntaje no se especificó en los requisitos
                totalScore,
                totalPercentage: (totalScore / 13) * 100,
                globalClassification
            }, { transaction: t });

            await t.commit();

            // 7. INVALIDAR CACHÉS relacionados con este usuario
            await cacheService.invalidateUserCache(businessData.userId);
            
            // También invalidar el caché de dashboard y lista de emprendimientos
            const dashboardKey = cacheService.generateCacheKey('dashboard:user', { 
                userId: businessData.userId 
            });
            const businessesKey = cacheService.generateCacheKey('businesses:user', { 
                userId: businessData.userId 
            });
            await cacheService.delete(dashboardKey);
            await cacheService.delete(businessesKey);

            // 8. CACHEAR los nuevos datos inmediatamente (datos críticos)
            const cacheKey = cacheService.generateCacheKey('characterization:user', { 
                userId: businessData.userId 
            });
            
            const result = {
                business,
                rating,
                scores: {
                    operationTimeScore,
                    financeScore,
                    workTeamScore,
                    totalScore,
                    globalClassification
                }
            };

            // Guardar en caché con TTL extendido (datos críticos)
            await cacheService.set(cacheKey, result, cacheService.CRITICAL_DATA_TTL);

            return result;

        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    async getCharacterizationResults(businessId) {
        const cacheKey = cacheService.generateCacheKey('characterization:business', { 
            businessId 
        });

        // Usar getCriticalData para datos críticos que deben servirse aunque la BD esté caída
        return await cacheService.getCriticalData(
            cacheKey,
            async () => {
                const results = await Business.findOne({
                    where: { id: businessId },
                    include: [
                        { model: BusinessModel },
                        { model: Finance },
                        { model: WorkTeam },
                        { model: Rating }
                    ]
                });

                if (!results) {
                    throw new Error('No se encontró la caracterización');
                }

                return results;
            }
        );
    }

    /**
     * Obtiene la caracterización de un usuario por su ID
     * Datos críticos que deben servirse aunque la BD esté caída
     * SIEMPRE retorna un valor (null si no hay datos), nunca lanza excepción
     * @param {number} userId - ID del usuario
     * @returns {Promise<Object|null>} Datos de caracterización o null
     */
    async getCharacterizationByUserId(userId) {
        const cacheKey = cacheService.generateCacheKey('characterization:user', { 
            userId 
        });

        try {
            // Primero intentar obtener desde caché
            const cachedData = await cacheService.get(cacheKey);
            if (cachedData !== null) {
                return cachedData;
            }

            // Si no hay caché, intentar consultar la BD
            const business = await Business.findOne({
                where: { userId },
                include: [
                    { model: BusinessModel },
                    { model: Finance },
                    { model: WorkTeam },
                    { model: Rating }
                ]
            });

            // Si encontramos datos, cachearlos
            if (business) {
                await cacheService.set(cacheKey, business, cacheService.CRITICAL_DATA_TTL);
            }

            // Retornar los datos (puede ser null si no existe)
            return business;

        } catch (error) {
            // Si la BD falla, intentar una última vez con datos antiguos de caché
            
            const staleData = await cacheService.get(cacheKey);
            if (staleData !== null) {
                // Extender el TTL de los datos antiguos
                await cacheService.set(cacheKey, staleData, cacheService.CRITICAL_DATA_TTL);
                return staleData;
            }
            
            // Si no hay datos en caché y la BD está caída, retornar null
            // Esto permite que el formulario se muestre vacío
            return null;
        }
    }
}

module.exports = new CharacterizationService();
