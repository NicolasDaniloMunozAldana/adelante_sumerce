const dashboardService = require('../services/dashboardService');
const characterizationService = require('../services/characterizationService');

/**
 * Controller para las páginas principales de la aplicación
 * NOTA: req.user viene del JWT (middleware ensureAuthenticated)
 * res.locals.user está disponible en vistas gracias a injectUserToViews
 */

// Mostrar la página de inicio
exports.showHome = (req, res) => {
    res.render('home/home', {
        title: 'Inicio - Salga Adelante Sumercé',
        currentPage: 'home'
        // user está disponible en res.locals.user (de injectUserToViews)
    });
};

// Mostrar el dashboard
exports.showDashboard = async (req, res) => {
    try {
        const userId = req.user.id; // Desde JWT

        // Obtener los datos de caracterización del usuario (con caché)
        const caracterizacion = await dashboardService.getDashboardData(userId);

        res.render('home/dashboard', {
            title: 'Dashboard - Salga Adelante Sumercé',
            currentPage: 'dashboard',
            caracterizacion: caracterizacion
            // user está disponible en res.locals.user (de injectUserToViews)
        });
    } catch (error) {
        console.error('Error al cargar el dashboard:', error);

        res.status(500).render('home/dashboard', {
            title: 'Dashboard - Salga Adelante Sumercé',
            currentPage: 'dashboard',
            caracterizacion: null,
            error: 'Error al cargar los datos del dashboard'
        });
    }
};

// Mostrar la página de caracterización
exports.showCaracterizacion = async (req, res) => {
    try {
        const userId = req.user.id; // Desde JWT

        // Usar el servicio con caché que funciona aunque la BD esté caída
        const existingBusiness = await characterizationService.getCharacterizationByUserId(userId);

        // Si ya tiene un emprendimiento, pasar los datos a la vista
        if (existingBusiness) {
            const businessData = {
                nombreEmprendimiento: existingBusiness.name,
                anioCreacion: existingBusiness.creationYear,
                sectorEconomico: existingBusiness.economicSector,
                nombreEncargado: existingBusiness.managerName,
                celularEncargado: existingBusiness.managerContact,
                correoEncargado: existingBusiness.managerEmail,
                tiempoOperacion: existingBusiness.operationMonths,
                propuestaValor: existingBusiness.BusinessModel?.valueProposition || '',
                segmentoClientes: existingBusiness.BusinessModel?.customerSegment || '',
                canalesVenta: existingBusiness.BusinessModel?.salesChannels || '',
                fuentesIngreso: existingBusiness.BusinessModel?.incomeSources || '',
                ventasNetas: existingBusiness.Finance?.monthlyNetSales || '',
                rentabilidad: existingBusiness.Finance?.monthlyProfitability || '',
                fuentesFinanciamiento: existingBusiness.Finance?.financingSources || '',
                costosFijos: existingBusiness.Finance?.monthlyFixedCosts || '',
                formacionEmpresarial: existingBusiness.WorkTeam?.businessTrainingLevel || '',
                personalCapacitado: existingBusiness.WorkTeam?.hasTrainedStaff ? 'si' : 'no',
                rolesDefinidos: existingBusiness.WorkTeam?.hasDefinedRoles ? 'si' : 'no',
                cantidadEmpleados: existingBusiness.WorkTeam?.employeeCount || 0
            };

            res.render('home/caracterizacion', {
                title: 'Caracterización - Salga Adelante Sumercé',
                currentPage: 'caracterizacion',
                existingData: businessData,
                isReadOnly: true
                // user está disponible en res.locals.user
            });
        } else {
            res.render('home/caracterizacion', {
                title: 'Caracterización - Salga Adelante Sumercé',
                currentPage: 'caracterizacion',
                existingData: null,
                isReadOnly: false
                // user está disponible en res.locals.user
            });
        }
    } catch (error) {
        console.error('Error al mostrar el formulario de caracterización:', error);
        
        // Si hay un error (BD caída y no hay caché), mostrar mensaje apropiado
        res.status(500).render('error', {
            message: 'No se pudo cargar el formulario de caracterización. Por favor, intente más tarde.',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

// Mostrar página de soporte
exports.showSoporte = (req, res) => {
    res.render('home/soporte', {
        title: 'Soporte - Salga Adelante Sumercé',
        currentPage: 'soporte'
        // user está disponible en res.locals.user
    });
};

// Mostrar página de contacto
exports.showContacto = (req, res) => {
    res.render('home/contacto', {
        title: 'Contacto - Salga Adelante Sumercé',
        currentPage: 'contacto'
        // user está disponible en res.locals.user
    });
};
