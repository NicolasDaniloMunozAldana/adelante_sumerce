const { Business, BusinessModel, Finance, WorkTeam, Rating } = require('../models');
const characterizationService = require('../services/characterizationService');

exports.showCharacterizationForm = async (req, res) => {
    try {
        const userId = req.user.id; // Desde JWT (req.user), no desde sesión
        
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
                existingData: businessData,
                isReadOnly: true 
            });
        } else {
            res.render('home/caracterizacion', { 
                existingData: null,
                isReadOnly: false 
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

exports.saveCharacterization = async (req, res) => {
    try {
        const userId = req.user.id; // Desde JWT (req.user), no desde sesión
        
        // Datos generales (Sección A)
        const businessData = {
            userId,
            name: req.body.nombreEmprendimiento,
            creationYear: parseInt(req.body.anioCreacion),
            economicSector: req.body.sectorEconomico,
            managerName: req.body.nombreEncargado,
            managerContact: req.body.celularEncargado,
            managerEmail: req.body.correoEncargado,
            operationMonths: req.body.tiempoOperacion
        };

        // Modelo de Negocio (Sección B)
        const businessModelData = {
            valueProposition: req.body.propuestaValor,
            customerSegment: req.body.segmentoClientes,
            salesChannels: req.body.canalesVenta,
            incomeSources: req.body.fuentesIngreso
        };

        // Finanzas (Sección C)
        const financeData = {
            monthlyNetSales: req.body.ventasNetas,
            monthlyProfitability: req.body.rentabilidad,
            financingSources: req.body.fuentesFinanciamiento,
            monthlyFixedCosts: req.body.costosFijos
        };

        // Equipo de Trabajo (Sección D)
        const workTeamData = {
            businessTrainingLevel: req.body.formacionEmpresarial,
            hasTrainedStaff: req.body.personalCapacitado === 'si',
            hasDefinedRoles: req.body.rolesDefinidos === 'si',
            employeeCount: parseInt(req.body.cantidadEmpleados) || 0
        };

        // Guardar toda la información y calcular puntajes
        const result = await characterizationService.saveCharacterization(
            businessData,
            businessModelData,
            financeData,
            workTeamData
        );


        res.json({
            success: true,
            message: 'Caracterización guardada exitosamente',
            data: result
        });

    } catch (error) {
        console.error('Error al guardar la caracterización:', error);
        res.status(500).json({
            success: false,
            message: 'Error al guardar la caracterización',
            error: error.message
        });
    }
};


exports.getCharacterizationResults = async (req, res) => {
    try {
        const businessId = req.params.businessId;
        
        // Usar el servicio con caché
        const results = await characterizationService.getCharacterizationResults(businessId);
        
        if (req.headers['accept'] === 'application/json') {
            res.json({
                success: true,
                data: results
            });
        } else {
            // Renderizar la vista con los resultados
            res.render('home/dashboard', {
                business: results,
                rating: results.Rating
            });
        }
    } catch (error) {
        console.error('Error al obtener resultados de caracterización:', error);
        if (req.headers['accept'] === 'application/json') {
            res.status(500).json({
                success: false,
                message: 'Error al obtener resultados',
                error: error.message
            });
        } else {
            res.status(500).render('error', {
                message: 'Error al obtener los resultados de la caracterización',
                error: process.env.NODE_ENV === 'development' ? error : {}
            });
        }
    }
};
