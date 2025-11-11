const express = require('express');
const router = express.Router();
const kafkaProducer = require('../kafka/kafkaProducer');
const { ensureAuthenticated } = require('../middlewares/authMiddleware');
const { Business, BusinessModel, Finance, WorkTeam, Rating } = require('../models');

/**
 * Ruta para solicitar generación de reporte PDF
 * Envía un evento a Kafka para que el microservicio lo procese
 */
router.get('/generate-pdf', ensureAuthenticated, async (req, res) => {
    try {
        const userId = req.user.id;
        const userEmail = req.user.email;

        // Obtener datos del emprendimiento
        const business = await Business.findOne({
            where: { userId },
            include: [
                { model: BusinessModel },
                { model: Finance },
                { model: WorkTeam },
                { model: Rating }
            ],
            order: [['id', 'DESC']]
        });

        if (!business) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró caracterización para este usuario'
            });
        }

        // Convertir a JSON plano para Kafka
        const businessData = business.toJSON();

        // Enviar evento a Kafka
        await kafkaProducer.sendGenerateUserReportEvent(
            userId,
            userEmail,
            businessData
        );

        // Responder inmediatamente al usuario
        res.json({
            success: true,
            message: 'Tu reporte está siendo generado y será enviado a tu correo electrónico',
            email: userEmail
        });

    } catch (error) {
        console.error('Error al solicitar generación de reporte:', error);
        res.status(500).json({
            success: false,
            message: 'Error al solicitar la generación del reporte',
            error: error.message
        });
    }
});

module.exports = router;
