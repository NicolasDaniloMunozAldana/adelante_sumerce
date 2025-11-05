const dashboardService = require('../services/dashboardService');
const { Business, BusinessModel, Finance, WorkTeam } = require('../models');

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
exports.showCaracterizacion = async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        // Verificar si el usuario ya tiene un emprendimiento registrado
        const existingBusiness = await Business.findOne({
            where: { userId },
            include: [
                { model: BusinessModel },
                { model: Finance },
                { model: WorkTeam }
            ]
        });

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
                user: req.session.user,
                existingData: businessData,
                isReadOnly: true
            });
        } else {
            res.render('home/caracterizacion', {
                title: 'Caracterización - Salga Adelante Sumercé',
                currentPage: 'caracterizacion',
                user: req.session.user,
                existingData: null,
                isReadOnly: false
            });
        }
    } catch (error) {
        console.error('Error al mostrar el formulario de caracterización:', error);
        res.status(500).send('Error al cargar el formulario');
    }
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
