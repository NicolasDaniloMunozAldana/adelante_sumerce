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

        // Obtener los datos de caracterización del usuario
        // El servicio SIEMPRE retorna (null o datos), nunca lanza excepción
        const caracterizacion = await dashboardService.getDashboardData(userId);

        res.render('home/dashboard', {
            title: 'Dashboard - Salga Adelante Sumercé',
            currentPage: 'dashboard',
            caracterizacion: caracterizacion,
            dbWarning: false // BD funcionando
            // user está disponible en res.locals.user (de injectUserToViews)
        });
    } catch (error) {
        // Este catch solo debería ejecutarse en casos excepcionales
        console.error('Error inesperado al cargar el dashboard:', error);

        res.render('home/dashboard', {
            title: 'Dashboard - Salga Adelante Sumercé',
            currentPage: 'dashboard',
            caracterizacion: null,
            dbWarning: true,
            warningMessage: 'El sistema está experimentando problemas. Los datos se mostrarán cuando el sistema se recupere.'
        });
    }
};

// Mostrar la página de caracterización
exports.showCaracterizacion = async (req, res) => {
    try {
        const userId = req.user.id; // Desde JWT

        // Usar el servicio que SIEMPRE retorna un valor (null o datos)
        // Nunca lanzará excepción, incluso si la BD está caída
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
                isReadOnly: true,
                dbWarning: false // BD funcionando correctamente
                // user está disponible en res.locals.user
            });
        } else {
            // No hay datos previos, mostrar formulario vacío
            // Esto funciona tanto si la BD está operativa como caída
            res.render('home/caracterizacion', {
                title: 'Caracterización - Salga Adelante Sumercé',
                currentPage: 'caracterizacion',
                existingData: null,
                isReadOnly: false,
                dbWarning: false // Sin advertencia si no hay error
                // user está disponible en res.locals.user
            });
        }
    } catch (error) {
        // Este catch solo debería ejecutarse en casos excepcionales
        // (no cuando la BD está caída, ya que el servicio maneja eso)
        console.error('Error inesperado al mostrar el formulario de caracterización:', error);
        
        // Aún así, mostrar el formulario vacío con una advertencia
        res.render('home/caracterizacion', {
            title: 'Caracterización - Salga Adelante Sumercé',
            currentPage: 'caracterizacion',
            existingData: null,
            isReadOnly: false,
            dbWarning: true, // Mostrar advertencia de que puede haber problemas
            warningMessage: 'El sistema está experimentando problemas. Puedes completar el formulario y se guardará cuando el sistema se recupere.'
            // user está disponible en res.locals.user
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
