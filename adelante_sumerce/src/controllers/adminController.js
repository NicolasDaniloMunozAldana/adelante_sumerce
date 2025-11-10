const { Business, BusinessModel, Finance, WorkTeam, Rating, User } = require('../models');
const comparativeReportService = require('../services/comparativeReportService');
const adminReportService = require('../services/adminReportService');

class AdminController {
    /**
     * Obtener todos los emprendimientos registrados
     */
    async getAllBusinesses(req, res) {
        try {
            const businesses = await Business.findAll({
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

            const business = await Business.findOne({
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

            res.json({
                success: true,
                data: {
                    totalBusinesses,
                    totalUsers,
                    classificationCounts: byClassification,
                    bySector: sectorCounts,
                    averageScore: parseFloat(averageScore)
                }
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
            const users = await User.findAll({
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

            const business = await Business.findOne({
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
     */
    async generateComparativePDF(req, res) {
        try {
            const { classification, sector } = req.query;
            const filters = {};

            if (classification) filters.classification = classification;
            if (sector) filters.sector = sector;

            const pdf = await comparativeReportService.generateComparativePDF(filters);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=reporte-comparativo-${Date.now()}.pdf`);
            res.send(pdf);

        } catch (error) {
            console.error('Error generando reporte PDF:', error);
            res.status(500).json({
                success: false,
                message: 'Error al generar el reporte PDF',
                error: error.message
            });
        }
    }

    /**
     * Generar reporte comparativo en Excel
     */
    async generateComparativeExcel(req, res) {
        try {
            const { classification, sector } = req.query;
            const filters = {};

            if (classification) filters.classification = classification;
            if (sector) filters.sector = sector;

            const buffer = await comparativeReportService.generateComparativeExcel(filters);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=reporte-comparativo-${Date.now()}.xlsx`);
            res.send(buffer);

        } catch (error) {
            console.error('Error generando reporte Excel:', error);
            res.status(500).json({
                success: false,
                message: 'Error al generar el reporte Excel',
                error: error.message
            });
        }
    }

    /**
     * Generar reporte individual de un emprendimiento para el administrador
     */
    async generateBusinessPDF(req, res) {
        try {
            const { id } = req.params;

            // Verificar que el emprendimiento existe
            const business = await Business.findOne({
                where: { id },
                include: [{ model: Rating }]
            });

            if (!business || !business.Rating) {
                return res.status(404).json({
                    success: false,
                    message: 'No se encontró caracterización para este emprendimiento'
                });
            }

            const pdf = await adminReportService.generateBusinessReport(id);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=evaluacion-${business.name.replace(/\s+/g, '-')}-${Date.now()}.pdf`);
            res.send(pdf);

        } catch (error) {
            console.error('Error generando reporte individual:', error);
            res.status(500).json({
                success: false,
                message: 'Error al generar el reporte',
                error: error.message
            });
        }
    }
}

module.exports = new AdminController();
