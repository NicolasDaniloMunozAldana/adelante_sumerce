const { Business, BusinessModel, Finance, WorkTeam, Rating } = require('../models');
const characterizationService = require('../services/characterizationService');

exports.showCharacterizationForm = async (req, res) => {
    try {
        res.render('home/caracterizacion');
    } catch (error) {
        console.error('Error al mostrar el formulario de caracterización:', error);
        res.status(500).send('Error al cargar el formulario');
    }
};

exports.saveCharacterization = async (req, res) => {
    try {
        const userId = req.user.id; // Asumiendo que tienes el usuario en la sesión
        
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
            hasDefinedRoles: req.body.rolesDefinidos === 'si'
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
        const results = await characterizationService.getCharacterizationResults(businessId);
        
        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Error al obtener resultados de caracterización:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener resultados',
            error: error.message
        });
    }
};
