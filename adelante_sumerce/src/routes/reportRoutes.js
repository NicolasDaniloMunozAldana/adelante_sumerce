const express = require('express');
const router = express.Router();
const reportRequestService = require('../services/reportRequestService');
const { ensureAuthenticated } = require('../middlewares/authMiddleware');

/**
 * Rutas para solicitudes de reportes de usuario
 * Estas rutas NO generan reportes directamente, sino que envían
 * eventos a Kafka para que el microservicio report_service los procese
 */

/**
 * GET /api/reports/generate-pdf
 * Solicita la generación de un reporte PDF del emprendimiento del usuario
 * El reporte será generado por el microservicio y enviado por email
 */
router.get('/generate-pdf', ensureAuthenticated, async (req, res) => {
    try {
        const userId = req.user.id;
        const userEmail = req.user.email;

        // Delegar la lógica al servicio
        const result = await reportRequestService.requestUserReport(userId, userEmail);

        res.json(result);

    } catch (error) {
        console.error('Error al solicitar generación de reporte:', error);

        const statusCode = error.statusCode || 500;
        
        res.status(statusCode).json({
            success: false,
            message: error.message || 'Error al solicitar la generación del reporte',
            error: error.message
        });
    }
});

module.exports = router;
