const express = require('express');
const router = express.Router();
const reportService = require('../services/reportService');
const { ensureAuthenticated } = require('../middlewares/authMiddleware');

/**
 * Ruta para generar el reporte PDF
 * El userId se obtiene de req.user (JWT), no de sesión
 */
router.get('/generate-pdf', ensureAuthenticated, async (req, res) => {
    try {
        const userId = req.user.id; // Desde JWT, no desde sesión
        
        // Generar el PDF
        const pdf = await reportService.generateBusinessReport(userId);

        // Configurar headers para descarga
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=reporte-caracterizacion.pdf');
        res.setHeader('Content-Length', pdf.length);

        // Enviar el PDF
        res.send(pdf);

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al generar el reporte PDF',
            error: error.message
        });
    }
});

module.exports = router;
