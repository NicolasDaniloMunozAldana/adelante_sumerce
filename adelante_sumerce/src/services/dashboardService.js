const { Business, BusinessModel, Finance, WorkTeam, Rating } = require('../models');
const cacheService = require('./cacheService');

class DashboardService {
    async getDashboardData(userId) {
        const cacheKey = cacheService.generateCacheKey('dashboard:user', { userId });

        // Usar caché crítico para dashboard
        return await cacheService.getCriticalData(
            cacheKey,
            async () => {
                try {
                    // Buscar el emprendimiento más reciente del usuario
                    const business = await Business.findOne({
                        where: { userId },
                        include: [
                            { model: BusinessModel },
                            { model: Finance },
                            { model: WorkTeam },
                            { model: Rating }
                        ],
                        order: [['id', 'DESC']] // Obtener el más reciente
                    });

                    if (!business || !business.Rating) {
                        return null; // No hay caracterización disponible
                    }

                    const rating = business.Rating;

                    // Calcular máximo puntaje posible
                    const maxTotal = 13; // 3 (datos generales) + 6 (finanzas) + 4 (equipo)

                    // Convertir valores que vienen de la BD como string a number
                    const totalPercentage = parseFloat(rating.totalPercentage) || 0;
                    const generalDataScore = parseInt(rating.generalDataScore) || 0;
                    const businessModelScore = parseInt(rating.businessModelScore) || 0;
                    const financeScore = parseInt(rating.financeScore) || 0;
                    const workTeamScore = parseInt(rating.workTeamScore) || 0;
                    const socialImpactScore = parseInt(rating.socialImpactScore) || 0;
                    const totalScore = parseInt(rating.totalScore) || 0;

                    // Preparar datos para el dashboard
                    const dashboardData = {
                        puntajeTotal: totalScore,
                        maxTotal: maxTotal,
                        porcentaje: parseFloat(totalPercentage.toFixed(2)),
                        estado: this.getEstadoLabel(rating.globalClassification),
                        secciones: [
                            {
                                nombre: 'Datos Generales',
                                puntaje: generalDataScore,
                                max: 3,
                                porcentaje: parseFloat(((generalDataScore / 3) * 100).toFixed(2))
                            },
                            {
                                nombre: 'Modelo de Negocio',
                                puntaje: businessModelScore,
                                max: 0, // No se especificó en los requisitos
                                porcentaje: 0
                            },
                            {
                                nombre: 'Finanzas',
                                puntaje: financeScore,
                                max: 6,
                                porcentaje: parseFloat(((financeScore / 6) * 100).toFixed(2))
                            },
                            {
                                nombre: 'Equipo de Trabajo',
                                puntaje: workTeamScore,
                                max: 4,
                                porcentaje: parseFloat(((workTeamScore / 4) * 100).toFixed(2))
                            },
                            {
                                nombre: 'Impacto Social',
                                puntaje: socialImpactScore,
                                max: 0, // No se especificó en los requisitos
                                porcentaje: 0
                            }
                        ].filter(s => s.max > 0), // Filtrar secciones sin puntaje
                        
                        // Información adicional del emprendimiento
                        emprendimiento: {
                            nombre: business.name,
                            sector: business.economicSector,
                            anioCreacion: business.creationYear,
                            encargado: business.managerName
                        },
                        
                        // Fecha del cálculo
                        fechaCalculo: rating.calculationDate
                    };

                    return dashboardData;

                } catch (error) {
                    console.error('Error al obtener datos del dashboard:', error);
                    throw error;
                }
            }
        );
    }

    getEstadoLabel(classification) {
        const labels = {
            'idea_inicial': 'Idea Inicial',
            'en_desarrollo': 'En Desarrollo',
            'consolidado': 'Consolidado'
        };
        return labels[classification] || 'Sin clasificar';
    }

    async getAllBusinessesByUser(userId) {
        const cacheKey = cacheService.generateCacheKey('businesses:user', { userId });

        // Usar caché para lista de emprendimientos
        return await cacheService.getOrFetch(
            cacheKey,
            async () => {
                try {
                    const businesses = await Business.findAll({
                        where: { userId },
                        include: [
                            { model: Rating }
                        ],
                        order: [['id', 'DESC']]
                    });

                    return businesses.map(business => ({
                        id: business.id,
                        nombre: business.name,
                        sector: business.economicSector,
                        fechaRegistro: business.registrationDate,
                        puntajeTotal: business.Rating ? business.Rating.totalScore : 0,
                        clasificacion: business.Rating ? this.getEstadoLabel(business.Rating.globalClassification) : 'Sin calificar'
                    }));

                } catch (error) {
                    console.error('Error al obtener emprendimientos del usuario:', error);
                    throw error;
                }
            },
            3600 // TTL de 1 hora
        );
    }
}

module.exports = new DashboardService();
