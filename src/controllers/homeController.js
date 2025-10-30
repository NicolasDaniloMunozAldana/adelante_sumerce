const { Business, Rating } = require('../models');

// Mostrar la página de inicio
exports.showHome = (req, res) => {
    res.render('home/home', {
        title: 'Inicio - Salga Adelante Sumercé',
        currentPage: 'home'
    });
};

// Mostrar la página de caracterización
exports.showCaracterizacion = (req, res) => {
    res.render('home/caracterizacion', {
        title: 'Caracterización - Salga Adelante Sumercé',
        currentPage: 'caracterizacion'
    });
};

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
        const user = req.session.user;
        const focusBusinessId = req.query.businessId ? parseInt(req.query.businessId) : null;

        // DEMO_MODE: sin BD, devolver datos simulados
        if (process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true') {
            const items = [
                {
                    id: 101,
                    name: 'Café Sumercé',
                    createdAt: new Date(),
                    rating: {
                        percentage: 62,
                        classification: 'En desarrollo',
                        calculatedAt: new Date()
                    },
                    secciones: [
                        { nombre: 'Datos Generales', puntaje: 2, max: 3 },
                        { nombre: 'Finanzas', puntaje: 5, max: 6 },
                        { nombre: 'Equipo de Trabajo', puntaje: 1, max: 4 }
                    ]
                }
            ];
            const secciones = items[0].secciones.map(s => ({
                nombre: s.nombre,
                puntaje: s.puntaje,
                porcentaje: Math.round((s.puntaje / s.max) * 100),
                max: s.max
            }));
            const puntajeTotal = secciones.reduce((a, b) => a + b.puntaje, 0);
            const maxTotal = secciones.reduce((a, b) => a + b.max, 0);
            const caracterizacion = {
                puntajeTotal,
                porcentaje: Math.round((puntajeTotal / maxTotal) * 100),
                estado: 'En desarrollo',
                secciones,
                maxTotal,
                maxScale: Math.max(...secciones.map(s => s.max))
            };
            return res.render('home/dashboard', {
                title: 'Dashboard - Salga Adelante Sumercé',
                currentPage: 'dashboard',
                user,
                items,
                focus: items[0],
                caracterizacion
            });
        }

        // Obtener emprendimientos del usuario con su calificación (si existe)
        const businesses = await Business.findAll({
            where: { userId: user.id },
            include: [{ model: Rating }],
            order: [['id', 'DESC']]
        });

        // Mapear datos para la vista
        const items = businesses.map(b => ({
            id: b.id,
            name: b.name,
            createdAt: b.registrationDate,
            rating: b.Rating ? {
                percentage: Number(b.Rating.totalPercentage),
                classification: b.Rating.globalClassification,
                calculatedAt: b.Rating.calculationDate
            } : null
        }));

        // Seleccionar foco: businessId específico o el más reciente con rating
        let focus = null;
        if (focusBusinessId) {
            focus = items.find(i => i.id === focusBusinessId) || null;
        }
        if (!focus) {
            focus = items.find(i => i.rating) || null;
        }

        res.render('home/dashboard', {
            title: 'Dashboard - Salga Adelante Sumercé',
            currentPage: 'dashboard',
            user,
            items,
            focus
        });
    } catch (err) {
        console.error('Error al cargar el dashboard:', err);
        res.status(500).render('home/dashboard', {
            title: 'Dashboard - Salga Adelante Sumercé',
            currentPage: 'dashboard',
            user: req.session.user,
            items: [],
            focus: null
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

// Mostrar la página de soporte
exports.showSoporte = (req, res) => {
    res.render('home/soporte', {
        title: 'Soporte - Salga Adelante Sumercé',
        currentPage: 'soporte'
    });
};

// Mostrar la página de contacto
exports.showContacto = (req, res) => {
    res.render('home/contacto', {
        title: 'Contacto - Salga Adelante Sumercé',
        currentPage: 'contacto'
    });
};
