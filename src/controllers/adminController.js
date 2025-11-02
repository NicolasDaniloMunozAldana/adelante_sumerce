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
                        attributes: ['id', 'email', 'firstName', 'lastName', 'phoneContact']
                    },
                    { model: BusinessModel },
                    { model: Finance },
                    { model: WorkTeam },
                    { model: Rating }
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
                        attributes: ['id', 'email', 'firstName', 'lastName', 'phoneContact']
                    },
                    { model: BusinessModel },
                    { model: Finance },
                    { model: WorkTeam },
                    { model: Rating }
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

            // Contar por clasificación
            const byClassification = await Rating.findAll({
                attributes: [
                    'globalClassification',
                    [Business.sequelize.fn('COUNT', Business.sequelize.col('globalClassification')), 'count']
                ],
                group: ['globalClassification'],
                raw: true
            });

            // Contar por sector económico
            const bySector = await Business.findAll({
                attributes: [
                    'economicSector',
                    [Business.sequelize.fn('COUNT', Business.sequelize.col('economicSector')), 'count']
                ],
                group: ['economicSector'],
                raw: true
            });

            res.json({
                success: true,
                data: {
                    totalBusinesses,
                    totalUsers,
                    byClassification,
                    bySector
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
}

module.exports = new AdminController();
