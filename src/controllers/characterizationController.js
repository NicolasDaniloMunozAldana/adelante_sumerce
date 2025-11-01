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
        const userId =  req.session.user.id;
        
        console.log('🟢 [saveCharacterization] Usuario autenticado:', userId);
        console.log('📩 [saveCharacterization] Datos recibidos en req.body:', req.body);

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
        console.log('📊 Datos Generales:', businessData);

        // Modelo de Negocio (Sección B)
        const businessModelData = {
            valueProposition: req.body.propuestaValor,
            customerSegment: req.body.segmentoClientes,
            salesChannels: req.body.canalesVenta,
            incomeSources: req.body.fuentesIngreso
        };
        console.log('📦 Modelo de Negocio:', businessModelData);

        // Finanzas (Sección C)
        const financeData = {
            monthlyNetSales: req.body.ventasNetas,
            monthlyProfitability: req.body.rentabilidad,
            financingSources: req.body.fuentesFinanciamiento,
            monthlyFixedCosts: req.body.costosFijos
        };
        console.log('💰 Finanzas:', financeData);

        // Equipo de Trabajo (Sección D)
        const workTeamData = {
            businessTrainingLevel: req.body.formacionEmpresarial,
            hasTrainedStaff: req.body.personalCapacitado === 'si',
            hasDefinedRoles: req.body.rolesDefinidos === 'si',
            employeeCount: parseInt(req.body.cantidadEmpleados) || 0
        };
        console.log('👥 Equipo de Trabajo:', workTeamData);

        // Guardar toda la información y calcular puntajes
        const result = await characterizationService.saveCharacterization(
            businessData,
            businessModelData,
            financeData,
            workTeamData
        );

        console.log('✅ [saveCharacterization] Resultado del servicio:', result);

        res.json({
            success: true,
            message: 'Caracterización guardada exitosamente',
            data: result
        });

    } catch (error) {
        console.error('❌ Error al guardar la caracterización:', error);
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
                error: error
            });
        }
    }
};
