const { Business, BusinessModel, Finance, WorkTeam, Rating } = require('../models');
const sequelize = require('../config/database');

class CharacterizationService {
    calculateOperationTimeScore(operationMonths) {
        // Model enum: '0_6_meses', '6_12_meses', '12_24_meses', 'mas_24_meses'
        switch (operationMonths) {
            case '0_6_meses': return 0;
            case '6_12_meses': return 1;
            case '12_24_meses': return 2;
            case 'mas_24_meses': return 3;
            default: return 0;
        }
    }

    calculateFinanceScores(financeData) {
        let score = 0;

        // Ventas netas mensuales (model: 'menos_1_smmlv','1_3_smmlv','3_6_smmlv','mas_6_smmlv')
        switch (financeData.monthlyNetSales) {
            case 'menos_1_smmlv': score += 0; break;
            case '1_3_smmlv': score += 1; break;
            case '3_6_smmlv': score += 2; break;
            case 'mas_6_smmlv': score += 2; break; // top tier
        }

        // Rentabilidad mensual (model: 'baja_menos_1_smmlv','medio_1_smmlv','alta_mas_3_smmlv')
        switch (financeData.monthlyProfitability) {
            case 'baja_menos_1_smmlv': score += 0; break;
            case 'medio_1_smmlv': score += 1; break;
            case 'alta_mas_3_smmlv': score += 2; break;
        }

        // Costos fijos mensuales (model: 'bajo_menos_1_smmlv','medio_1_smmlv','alto_mas_3_smmlv')
        switch (financeData.monthlyFixedCosts) {
            case 'bajo_menos_1_smmlv': score += 2; break; // lower costs -> better score
            case 'medio_1_smmlv': score += 1; break;
            case 'alto_mas_3_smmlv': score += 0; break;
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

    // Map form values to model enums for Finance
    mapFinanceFormToEnums(finance) {
        const mapped = { ...finance };
        // monthlyNetSales: form may send '3_mas_smmlv'
        if (mapped.monthlyNetSales === '3_mas_smmlv') mapped.monthlyNetSales = 'mas_6_smmlv';
        // monthlyProfitability: form 'menos_medio_smmlv'|'medio_1_smmlv'|'2_mas_smmlv'
        if (mapped.monthlyProfitability === 'menos_medio_smmlv') mapped.monthlyProfitability = 'baja_menos_1_smmlv';
        if (mapped.monthlyProfitability === '2_mas_smmlv') mapped.monthlyProfitability = 'alta_mas_3_smmlv';
        // monthlyFixedCosts: form 'menos_medio_smmlv'|'medio_1_smmlv'|'2_mas_smmlv'
        if (mapped.monthlyFixedCosts === 'menos_medio_smmlv') mapped.monthlyFixedCosts = 'bajo_menos_1_smmlv';
        if (mapped.monthlyFixedCosts === '2_mas_smmlv') mapped.monthlyFixedCosts = 'alto_mas_3_smmlv';
        // financingSources
        const financeMap = {
            'recursos_propios': 'propios',
            'credito_bancario': 'credito_bancario',
            'inversionistas': 'inversion_externa',
            'subsidios': 'otro',
            'mixto': 'otro'
        };
        if (financeMap[mapped.financingSources]) mapped.financingSources = financeMap[mapped.financingSources];
        return mapped;
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
            const mappedFinance = this.mapFinanceFormToEnums(financeData);
            mappedFinance.businessId = businessId;
            await Finance.create(mappedFinance, { transaction: t });

            // 4. Crear equipo de trabajo
            workTeamData.businessId = businessId;
            await WorkTeam.create(workTeamData, { transaction: t });

            // 5. Calcular puntajes
            const operationTimeScore = this.calculateOperationTimeScore(businessData.operationMonths);
            const financeScore = this.calculateFinanceScores(mappedFinance);
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
