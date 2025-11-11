const { Business, BusinessModel, Finance, WorkTeam, Rating } = require('../models');
const kafkaProducer = require('../kafka/kafkaProducer');

/**
 * Servicio para manejar las solicitudes de generación de reportes
 * Este servicio actúa como intermediario entre las rutas y Kafka
 */
class ReportRequestService {
    /**
     * Solicita la generación de un reporte de emprendimiento para un usuario
     * @param {number} userId - ID del usuario
     * @param {string} userEmail - Email del usuario
     * @returns {Promise<Object>} Resultado de la solicitud
     */
    async requestUserReport(userId, userEmail) {
        try {
            // Obtener datos completos del emprendimiento
            const businessData = await this.fetchBusinessDataForUser(userId);

            // Enviar evento a Kafka
            await kafkaProducer.sendGenerateUserReportEvent(
                userId,
                userEmail,
                businessData
            );

            return {
                success: true,
                message: 'Tu reporte está siendo generado y será enviado a tu correo electrónico',
                email: userEmail
            };

        } catch (error) {
            console.error('Error en requestUserReport:', error);
            throw error;
        }
    }

    /**
     * Obtiene los datos completos del emprendimiento de un usuario
     * @param {number} userId - ID del usuario
     * @returns {Promise<Object>} Datos del emprendimiento en formato JSON
     * @throws {Error} Si no se encuentra el emprendimiento
     */
    async fetchBusinessDataForUser(userId) {
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
            const error = new Error('No se encontró caracterización para este usuario');
            error.statusCode = 404;
            throw error;
        }

        // Convertir a JSON plano para enviar por Kafka
        return business.toJSON();
    }

    /**
     * Verifica si un usuario tiene un emprendimiento registrado
     * @param {number} userId - ID del usuario
     * @returns {Promise<boolean>} True si existe, false si no
     */
    async hasBusinessCharacterization(userId) {
        const count = await Business.count({
            where: { userId },
            include: [{ model: Rating }]
        });

        return count > 0;
    }
}

module.exports = new ReportRequestService();
