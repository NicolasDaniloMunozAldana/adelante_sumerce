const { Business, BusinessModel, Finance, WorkTeam, Rating, User } = require('../models');

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

            console.log(businesses);
            
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
                currentPage: 'admin-dashboard',
                user: req.session.user
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
                currentPage: 'admin-emprendimientos',
                user: req.session.user
            });
        } catch (error) {
            console.error('Error al mostrar página de emprendimientos:', error);
            res.status(500).send('Error al cargar la página de emprendimientos');
        }
    }
}

module.exports = new AdminController();
