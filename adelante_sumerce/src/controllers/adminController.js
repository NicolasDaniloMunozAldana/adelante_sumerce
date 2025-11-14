const { Business, BusinessModel, Finance, WorkTeam, Rating, User } = require('../models');
const kafkaProducer = require('../kafka/kafkaProducer');
const cacheService = require('../services/cacheService');

class AdminController {
    /**
     * Obtener todos los emprendimientos registrados
     */
    async getAllBusinesses(req, res) {
        try {
            const cacheKey = cacheService.generateCacheKey('admin:all-businesses');

            const businesses = await cacheService.getOrFetch(
                cacheKey,
                async () => {
                    return await Business.findAll({
                        include: [
                            { 
                                model: User,
                                attributes: ['id', 'email', 'firstName', 'lastName', 'phoneContact'],
                                required: false
                            },
                            { 
                                model: BusinessModel,
                                required: false
                            },
                            { 
                                model: Finance,
                                required: false
                            },
                            { 
                                model: WorkTeam,
                                required: false
                            },
                            { 
                                model: Rating,
                                required: false
                            }
                        ],
                        order: [['registrationDate', 'DESC']]
                    });
                },
                1800 // 30 minutos
            );

            
            res.json({
                success: true,
                count: businesses.length,
                data: businesses
            });
        } catch (error) {
            console.error('Error al obtener emprendimientos:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener los emprendimientos',
                error: error.message
            });
        }
    }

    /**
     * Obtener un emprendimiento específico por ID
     */
    async getBusinessById(req, res) {
        try {
            const { id } = req.params;
            const cacheKey = cacheService.generateCacheKey('admin:business', { businessId: id });

            const business = await cacheService.getCriticalData(
                cacheKey,
                async () => {
                    return await Business.findOne({
                        where: { id },
                        include: [
                            { 
                                model: User,
                                attributes: ['id', 'email', 'firstName', 'lastName', 'phoneContact'],
                                required: false
                            },
                            { 
                                model: BusinessModel,
                                required: false
                            },
                            { 
                                model: Finance,
                                required: false
                            },
                            { 
                                model: WorkTeam,
                                required: false
                            },
                            { 
                                model: Rating,
                                required: false
                            }
                        ]
                    });
                }
            );

            if (!business) {
                return res.status(404).json({
                    success: false,
                    message: 'Emprendimiento no encontrado'
                });
            }

            res.json({
                success: true,
                data: business
            });
        } catch (error) {
            console.error('Error al obtener emprendimiento:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener el emprendimiento',
                error: error.message
            });
        }
    }

    /**
     * Obtener estadísticas generales de emprendimientos
     */
    async getStatistics(req, res) {
        try {
            const cacheKey = cacheService.generateCacheKey('admin:statistics');

            const statistics = await cacheService.getOrFetch(
                cacheKey,
                async () => {
                    const totalBusinesses = await Business.count();
                    const totalUsers = await User.count({ where: { role: 'emprendedor' } });

                    // Contar por clasificación usando el nombre de columna correcto
                    const classificationCounts = await Rating.findAll({
                        attributes: [
                            [Rating.sequelize.col('clasificacion_global'), 'classification'],
                            [Rating.sequelize.fn('COUNT', Rating.sequelize.col('clasificacion_global')), 'count']
                        ],
                        group: ['clasificacion_global'],
                        raw: true
                    });

                    // Convertir array a objeto para facilitar el acceso
                    const byClassification = {
                        idea_inicial: 0,
                        en_desarrollo: 0,
                        consolidado: 0
                    };
                    
                    classificationCounts.forEach(item => {
                        if (item.classification) {
                            byClassification[item.classification] = parseInt(item.count);
                        }
                    });

                    // Contar por sector económico usando el nombre de columna correcto
                    const sectorCounts = await Business.findAll({
                        attributes: [
                            [Business.sequelize.col('sector_economico'), 'sector'],
                            [Business.sequelize.fn('COUNT', Business.sequelize.col('sector_economico')), 'count']
                        ],
                        group: ['sector_economico'],
                        raw: true
                    });

                    // Calcular promedio de score
                    const avgScoreResult = await Rating.findOne({
                        attributes: [
                            [Rating.sequelize.fn('AVG', Rating.sequelize.col('puntaje_total')), 'averageScore']
                        ],
                        raw: true
                    });

                    const averageScore = avgScoreResult?.averageScore || 0;

                    return {
                        totalBusinesses,
                        totalUsers,
                        classificationCounts: byClassification,
                        bySector: sectorCounts,
                        averageScore: parseFloat(averageScore)
                    };
                },
                1800 // 30 minutos
            );

            res.json({
                success: true,
                data: statistics
            });
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener estadísticas',
                error: error.message
            });
        }
    }

    /**
     * Obtener todos los usuarios emprendedores
     */
    async getAllUsers(req, res) {
        try {
            const cacheKey = cacheService.generateCacheKey('admin:all-users');

            const users = await cacheService.getOrFetch(
                cacheKey,
                async () => {
                    return await User.findAll({
                        where: { role: 'emprendedor' },
                        attributes: ['id', 'email', 'firstName', 'lastName', 'phoneContact', 'registrationDate'],
                        include: [
                            {
                                model: Business,
                                attributes: ['id', 'name', 'economicSector']
                            }
                        ],
                        order: [['registrationDate', 'DESC']]
                    });
                },
                1800 // 30 minutos
            );

            res.json({
                success: true,
                count: users.length,
                data: users
            });
        } catch (error) {
            console.error('Error al obtener usuarios:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener los usuarios',
                error: error.message
            });
        }
    }

    /**
     * Mostrar dashboard del administrador
     */
    async showAdminDashboard(req, res) {
        try {
            res.render('admin/dashboard', {
                title: 'Panel de Administración - Adelante Sumercé',
                currentPage: 'admin-dashboard'
                // user está disponible en res.locals.user (de injectUserToViews)
            });
        } catch (error) {
            console.error('Error al mostrar dashboard del administrador:', error);
            res.status(500).send('Error al cargar el panel de administración');
        }
    }

    /**
     * Mostrar página de emprendimientos
     */
    async showEmprendimientos(req, res) {
        try {
            res.render('admin/emprendimientos', {
                title: 'Emprendimientos - Adelante Sumercé',
                currentPage: 'admin-emprendimientos'
                // user está disponible en res.locals.user (de injectUserToViews)
            });
        } catch (error) {
            console.error('Error al mostrar página de emprendimientos:', error);
            res.status(500).send('Error al cargar la página de emprendimientos');
        }
    }

    /**
     * Mostrar dashboard detallado de un emprendimiento específico
     */
    async showBusinessDashboard(req, res) {
        try {
            const { id } = req.params;
            const cacheKey = cacheService.generateCacheKey('admin:business-dashboard', { businessId: id });

            const business = await cacheService.getCriticalData(
                cacheKey,
                async () => {
                    return await Business.findOne({
                        where: { id },
                        include: [
                            { 
                                model: User,
                                attributes: ['id', 'email', 'firstName', 'lastName', 'phoneContact'],
                                required: false
                            },
                            { 
                                model: BusinessModel,
                                required: false
                            },
                            { 
                                model: Finance,
                                required: false
                            },
                            { 
                                model: WorkTeam,
                                required: false
                            },
                            { 
                                model: Rating,
                                required: false
                            }
                        ]
                    });
                }
            );

            if (!business) {
                return res.status(404).send('Emprendimiento no encontrado');
            }

            // Preparar datos del dashboard similar al del emprendedor
            let caracterizacion = null;
            
            if (business.Rating) {
                const rating = business.Rating;
                const maxTotal = 13;
                const totalScore = parseInt(rating.totalScore) || 0;
                const totalPercentage = parseFloat(rating.totalPercentage) || 0;

                const getEstadoLabel = (classification) => {
                    const labels = {
                        'idea_inicial': 'Idea Inicial',
                        'en_desarrollo': 'En Desarrollo',
                        'consolidado': 'Consolidado'
                    };
                    return labels[classification] || 'Sin clasificar';
                };

                caracterizacion = {
                    puntajeTotal: totalScore,
                    maxTotal: maxTotal,
                    porcentaje: parseFloat(totalPercentage.toFixed(2)),
                    estado: getEstadoLabel(rating.globalClassification),
                    secciones: [
                        {
                            nombre: 'Datos Generales',
                            puntaje: parseInt(rating.generalDataScore) || 0,
                            max: 3,
                            porcentaje: parseFloat((((parseInt(rating.generalDataScore) || 0) / 3) * 100).toFixed(2))
                        },
                        {
                            nombre: 'Finanzas',
                            puntaje: parseInt(rating.financeScore) || 0,
                            max: 6,
                            porcentaje: parseFloat((((parseInt(rating.financeScore) || 0) / 6) * 100).toFixed(2))
                        },
                        {
                            nombre: 'Equipo de Trabajo',
                            puntaje: parseInt(rating.workTeamScore) || 0,
                            max: 4,
                            porcentaje: parseFloat((((parseInt(rating.workTeamScore) || 0) / 4) * 100).toFixed(2))
                        }
                    ],
                    emprendimiento: {
                        nombre: business.name,
                        sector: business.economicSector,
                        anioCreacion: business.creationYear,
                        encargado: business.managerName
                    },
                    fechaCalculo: rating.calculationDate
                };
            }

            // Preparar datos del formulario de caracterización
            const businessData = {
                nombreEmprendimiento: business.name,
                anioCreacion: business.creationYear,
                sectorEconomico: business.economicSector,
                nombreEncargado: business.managerName,
                celularEncargado: business.managerContact,
                correoEncargado: business.managerEmail,
                tiempoOperacion: business.operationMonths,
                propuestaValor: business.BusinessModel?.valueProposition || '',
                segmentoClientes: business.BusinessModel?.customerSegment || '',
                canalesVenta: business.BusinessModel?.salesChannels || '',
                fuentesIngreso: business.BusinessModel?.incomeSources || '',
                ventasNetas: business.Finance?.monthlyNetSales || '',
                rentabilidad: business.Finance?.monthlyProfitability || '',
                fuentesFinanciamiento: business.Finance?.financingSources || '',
                costosFijos: business.Finance?.monthlyFixedCosts || '',
                formacionEmpresarial: business.WorkTeam?.businessTrainingLevel || '',
                personalCapacitado: business.WorkTeam?.hasTrainedStaff ? 'si' : 'no',
                rolesDefinidos: business.WorkTeam?.hasDefinedRoles ? 'si' : 'no',
                cantidadEmpleados: business.WorkTeam?.employeeCount || 0
            };

            res.render('admin/business-detail', {
                title: `Detalle: ${business.name} - Adelante Sumercé`,
                currentPage: 'admin-emprendimientos',
                user: req.user,
                business: business,
                caracterizacion: caracterizacion,
                formData: businessData,
                userData: business.User
                // user está disponible en res.locals.user (de injectUserToViews)
            });

        } catch (error) {
            console.error('Error al mostrar dashboard del emprendimiento:', error);
            res.status(500).send('Error al cargar el dashboard del emprendimiento');
        }
    }

    /**
     * Obtener label de estado según clasificación
     */
    getEstadoLabel(classification) {
        const labels = {
            'idea_inicial': 'Idea Inicial',
            'en_desarrollo': 'En Desarrollo',
            'consolidado': 'Consolidado'
        };
        return labels[classification] || 'Sin clasificar';
    }

    /**
     * Generar reporte comparativo en PDF
     * Envía un evento a Kafka para que el microservicio lo procese
     */
    async generateComparativePDF(req, res) {
        try {
            const { classification, sector } = req.query;
            const filters = {};

            if (classification) filters.classification = classification;
            if (sector) filters.sector = sector;

            // Obtener todos los emprendimientos según los filtros desde cache
            const whereClause = {};
            if (sector) whereClause.economicSector = sector;

            const cacheKey = cacheService.generateCacheKey('comparative_businesses', { 
                sector, 
                classification 
            });
            
            const businesses = await cacheService.getCriticalData(
                cacheKey,
                async () => {
                    return await Business.findAll({
                        where: whereClause,
                        include: [
                            { model: User },
                            { model: BusinessModel },
                            { model: Finance },
                            { model: WorkTeam },
                            { model: Rating }
                        ],
                        order: [['id', 'ASC']]
                    });
                },
                24 * 60 * 60 // 24 horas - datos críticos para reportes
            );

            // Filtrar por clasificación si se especificó
            let filteredBusinesses = businesses;
            if (classification) {
                filteredBusinesses = businesses.filter(b => b.Rating?.globalClassification === classification);
            }

            if (filteredBusinesses.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No se encontraron emprendimientos para generar el reporte'
                });
            }

            // Convertir a JSON plano para Kafka
            const businessesData = filteredBusinesses.map(b => b.toJSON());

            // Enviar evento a Kafka
            await kafkaProducer.sendGenerateComparativePDFEvent(
                req.user.email,
                businessesData,
                filters
            );

            res.json({
                success: true,
                message: `El reporte comparativo PDF está siendo generado y será enviado a ${req.user.email}`,
                businessCount: businessesData.length,
                email: req.user.email
            });

        } catch (error) {
            console.error('Error solicitando reporte PDF:', error);
            res.status(500).json({
                success: false,
                message: 'Error al solicitar el reporte PDF',
                error: error.message
            });
        }
    }

    /**
     * Generar reporte comparativo en Excel
     * Envía un evento a Kafka para que el microservicio lo procese
     */
    async generateComparativeExcel(req, res) {
        try {
            const { classification, sector } = req.query;
            const filters = {};

            if (classification) filters.classification = classification;
            if (sector) filters.sector = sector;

            // Obtener todos los emprendimientos según los filtros desde cache
            const whereClause = {};
            if (sector) whereClause.economicSector = sector;

            const cacheKey = cacheService.generateCacheKey('comparative_businesses', { 
                sector, 
                classification 
            });
            
            const businesses = await cacheService.getCriticalData(
                cacheKey,
                async () => {
                    return await Business.findAll({
                        where: whereClause,
                        include: [
                            { model: User },
                            { model: BusinessModel },
                            { model: Finance },
                            { model: WorkTeam },
                            { model: Rating }
                        ],
                        order: [['id', 'ASC']]
                    });
                },
                24 * 60 * 60 // 24 horas - datos críticos para reportes
            );

            // Filtrar por clasificación si se especificó
            let filteredBusinesses = businesses;
            if (classification) {
                filteredBusinesses = businesses.filter(b => b.Rating?.globalClassification === classification);
            }

            if (filteredBusinesses.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No se encontraron emprendimientos para generar el reporte'
                });
            }

            // Convertir a JSON plano para Kafka
            const businessesData = filteredBusinesses.map(b => b.toJSON());

            // Enviar evento a Kafka
            await kafkaProducer.sendGenerateComparativeExcelEvent(
                req.user.email,
                businessesData,
                filters
            );

            res.json({
                success: true,
                message: `El reporte comparativo Excel está siendo generado y será enviado a ${req.user.email}`,
                businessCount: businessesData.length,
                email: req.user.email
            });

        } catch (error) {
            console.error('Error solicitando reporte Excel:', error);
            res.status(500).json({
                success: false,
                message: 'Error al solicitar el reporte Excel',
                error: error.message
            });
        }
    }

    /**
     * Generar reporte individual de un emprendimiento para el administrador
     * Envía un evento a Kafka para que el microservicio lo procese
     */
    async generateBusinessPDF(req, res) {
        try {
            const { id } = req.params;

            // Obtener el emprendimiento con todas sus relaciones desde cache
            const cacheKey = cacheService.generateCacheKey('business_full', { id });
            const business = await cacheService.getCriticalData(
                cacheKey,
                async () => {
                    return await Business.findOne({
                        where: { id },
                        include: [
                            { model: User, attributes: ['id', 'email', 'firstName', 'lastName', 'phoneContact'] },
                            { model: BusinessModel },
                            { model: Finance },
                            { model: WorkTeam },
                            { model: Rating }
                        ]
                    });
                },
                24 * 60 * 60 // 24 horas - datos críticos para reportes
            );

            if (!business || !business.Rating) {
                return res.status(404).json({
                    success: false,
                    message: 'No se encontró caracterización para este emprendimiento'
                });
            }

            // Convertir a JSON plano para Kafka
            const businessData = business.toJSON();

            // Enviar evento a Kafka
            await kafkaProducer.sendGenerateAdminReportEvent(
                id,
                req.user.email,
                businessData
            );

            res.json({
                success: true,
                message: `El reporte de evaluación del emprendimiento "${business.name}" está siendo generado y será enviado a ${req.user.email}`,
                businessName: business.name,
                email: req.user.email
            });

        } catch (error) {
            console.error('Error solicitando reporte individual:', error);
            res.status(500).json({
                success: false,
                message: 'Error al solicitar el reporte',
                error: error.message
            });
        }
    }
}

module.exports = new AdminController();
