const characterizationService = require('../../src/services/characterizationService');

describe('CharacterizationService', () => {
    describe('calculateOperationTimeScore', () => {
        it('should return 0 for "menos_6_meses"', () => {
            const score = characterizationService.calculateOperationTimeScore('menos_6_meses');
            expect(score).toBe(0);
        });

        it('should return 1 for "6_12_meses"', () => {
            const score = characterizationService.calculateOperationTimeScore('6_12_meses');
            expect(score).toBe(1);
        });

        it('should return 2 for "12_24_meses"', () => {
            const score = characterizationService.calculateOperationTimeScore('12_24_meses');
            expect(score).toBe(2);
        });

        it('should return 3 for "mas_24_meses"', () => {
            const score = characterizationService.calculateOperationTimeScore('mas_24_meses');
            expect(score).toBe(3);
        });

        it('should return 0 for invalid input', () => {
            const score = characterizationService.calculateOperationTimeScore('invalid');
            expect(score).toBe(0);
        });
    });

    describe('calculateFinanceScores', () => {
        it('should calculate maximum finance score correctly', () => {
            const financeData = {
                monthlyNetSales: '3_mas_smmlv',
                monthlyProfitability: '2_mas_smmlv',
                monthlyFixedCosts: '2_mas_smmlv'
            };
            const score = characterizationService.calculateFinanceScores(financeData);
            expect(score).toBe(6); // 2 + 2 + 2
        });

        it('should calculate minimum finance score correctly', () => {
            const financeData = {
                monthlyNetSales: 'menos_1_smmlv',
                monthlyProfitability: 'menos_medio_smmlv',
                monthlyFixedCosts: 'menos_medio_smmlv'
            };
            const score = characterizationService.calculateFinanceScores(financeData);
            expect(score).toBe(0);
        });

        it('should calculate intermediate finance score', () => {
            const financeData = {
                monthlyNetSales: '1_3_smmlv',
                monthlyProfitability: 'medio_1_smmlv',
                monthlyFixedCosts: 'medio_1_smmlv'
            };
            const score = characterizationService.calculateFinanceScores(financeData);
            expect(score).toBe(3); // 1 + 1 + 1
        });
    });

    describe('calculateGlobalClassification', () => {
        it('should classify as "idea_inicial" for score less than 30%', () => {
            const classification = characterizationService.calculateGlobalClassification(3);
            expect(classification).toBe('idea_inicial');
            // 3/13 = 23%
        });

        it('should classify as "en_desarrollo" for score between 30% and 70%', () => {
            const classification = characterizationService.calculateGlobalClassification(7);
            expect(classification).toBe('en_desarrollo');
            // 7/13 = 53.8%
        });

        it('should classify as "consolidado" for score 70% or more', () => {
            const classification = characterizationService.calculateGlobalClassification(10);
            expect(classification).toBe('consolidado');
            // 10/13 = 76.9%
        });

        it('should handle edge case at 30% threshold', () => {
            const classification = characterizationService.calculateGlobalClassification(4);
            // 4/13 = 30.7%
            expect(classification).toBe('en_desarrollo');
        });

        it('should handle maximum score', () => {
            const classification = characterizationService.calculateGlobalClassification(13);
            expect(classification).toBe('consolidado');
            // 13/13 = 100%
        });
    });

    describe('calculateWorkTeamScores', () => {
        it('should calculate maximum work team score', () => {
            const workTeamData = {
                businessTrainingLevel: 'administracion_emprendimiento',
                hasTrainedStaff: true,
                hasDefinedRoles: true
            };
            const score = characterizationService.calculateWorkTeamScores(workTeamData);
            expect(score).toBe(4); // 2 + 1 + 1
        });

        it('should calculate minimum work team score', () => {
            const workTeamData = {
                businessTrainingLevel: 'sin_formacion',
                hasTrainedStaff: false,
                hasDefinedRoles: false
            };
            const score = characterizationService.calculateWorkTeamScores(workTeamData);
            expect(score).toBe(0);
        });

        it('should handle partial work team score', () => {
            const workTeamData = {
                businessTrainingLevel: 'tecnica_profesional',
                hasTrainedStaff: true,
                hasDefinedRoles: false
            };
            const score = characterizationService.calculateWorkTeamScores(workTeamData);
            expect(score).toBe(2); // 1 + 1 + 0
        });
    });
});
