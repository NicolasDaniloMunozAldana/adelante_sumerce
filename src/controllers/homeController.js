const dashboardService = require('../services/dashboardService');

/**
 * Controller para las páginas principales de la aplicación
 */

// Mostrar la página de inicio
exports.showHome = (req, res) => {
    res.render('home/home', {
        title: 'Inicio - Salga Adelante Sumercé',
        currentPage: 'home',
        user: req.session.user
    });
};

// Mostrar el dashboard
exports.showDashboard = async (req, res) => {
    try {
        const userId = req.session.user.id;        
        
        // Obtener los datos de caracterización del usuario
        const caracterizacion = await dashboardService.getDashboardData(userId);
        
        res.render('home/dashboard', {
            title: 'Dashboard - Salga Adelante Sumercé',
            currentPage: 'dashboard',
            user: req.session.user,
            caracterizacion: caracterizacion
        });
    } catch (error) {
        console.error('Error al cargar el dashboard:', error);
        res.status(500).render('home/dashboard', {
            title: 'Dashboard - Salga Adelante Sumercé',
            currentPage: 'dashboard',
            user: req.session.user,
            caracterizacion: null,
            error: 'Error al cargar los datos del dashboard'
        });
    }
};

// Mostrar la página de caracterización
exports.showCaracterizacion = (req, res) => {
    res.render('home/caracterizacion', {
        title: 'Caracterización - Salga Adelante Sumercé',
        currentPage: 'caracterizacion',
        user: req.session.user
    });
};

// Mostrar la página de soporte
exports.showSoporte = (req, res) => {
    res.render('home/soporte', {
        title: 'Soporte - Salga Adelante Sumercé',
        currentPage: 'soporte',
        user: req.session.user
    });
};

// Mostrar la página de contacto
exports.showContacto = (req, res) => {
    res.render('home/contacto', {
        title: 'Contacto - Salga Adelante Sumercé',
        currentPage: 'contacto',
        user: req.session.user
    });
};
