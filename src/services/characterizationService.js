const { Business, BusinessModel, Finance, WorkTeam, Rating } = require('../models');
const sequelize = require('../config/database');

class CharacterizationService {
    calculateOperationTimeScore(operationMonths) {
        switch (operationMonths) {
            case 'menos_6_meses': return 0;
            case '6_12_meses': return 1;
            case '1_3_anios': return 2;
            case '4_mas_anios': return 3;
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

            return {
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

        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    async getCharacterizationResults(businessId) {
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
}

module.exports = new CharacterizationService();
