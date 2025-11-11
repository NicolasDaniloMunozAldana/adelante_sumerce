const kafkaConsumer = require('../kafka/kafkaConsumer');
const kafkaProducer = require('../kafka/kafkaProducer');
const config = require('../config');
const logger = require('../utils/logger');

// Servicios de generación de reportes
const reportService = require('../services/reportService');
const adminReportService = require('../services/adminReportService');
const comparativeReportService = require('../services/comparativeReportService');

// Servicio de correo
const emailService = require('../email/emailService');

class ReportConsumer {
    constructor() {
        this.topics = [
            config.kafka.topics.generateAdminReport,
            config.kafka.topics.generateComparativeReport,
            config.kafka.topics.generateUserReport
        ];
    }

    /**
     * Inicializa el consumer y registra los handlers
     */
    async start() {
        try {
            logger.info('🚀 Iniciando Report Consumer...');

            // Registrar handlers para cada tipo de evento
            kafkaConsumer.registerHandler('GENERATE_USER_REPORT', this.handleGenerateUserReport.bind(this));
            kafkaConsumer.registerHandler('GENERATE_ADMIN_REPORT', this.handleGenerateAdminReport.bind(this));
            kafkaConsumer.registerHandler('GENERATE_COMPARATIVE_PDF', this.handleGenerateComparativePDF.bind(this));
            kafkaConsumer.registerHandler('GENERATE_COMPARATIVE_EXCEL', this.handleGenerateComparativeExcel.bind(this));

            // Suscribirse a los topics
            await kafkaConsumer.subscribe(this.topics);

            logger.info('✅ Report Consumer iniciado exitosamente');
        } catch (error) {
            logger.error('❌ Error al iniciar Report Consumer:', error);
            throw error;
        }
    }

    /**
     * Handler: Generar reporte de emprendimiento para usuario
     */
    async handleGenerateUserReport(event) {
        logger.info('📝 Procesando solicitud de reporte de usuario', { userId: event.userId });

        try {
            const { userId, email, businessData } = event.data;

            if (!businessData) {
                throw new Error('No se recibieron datos del emprendimiento');
            }

            // Generar PDF
            logger.info('Generando PDF del reporte...');
            const pdf = await reportService.generateBusinessReport(businessData);

            // Enviar por correo
            logger.info(`Enviando reporte por correo a: ${email}`);
            await emailService.sendReportEmail(
                email,
                `Reporte de Caracterización - ${businessData.name}`,
                pdf,
                `reporte-${businessData.name}-${Date.now()}.pdf`
            );

            // Enviar evento de confirmación
            await kafkaProducer.sendReportGeneratedEvent({
                userId,
                email,
                reportType: 'USER_REPORT',
                businessName: businessData.name,
                success: true
            });

            logger.info('✅ Reporte de usuario generado y enviado exitosamente');

        } catch (error) {
            logger.error('Error al generar reporte de usuario:', error);

            // Enviar evento de error
            await kafkaProducer.sendReportFailedEvent({
                userId: event.data?.userId,
                email: event.data?.email,
                reportType: 'USER_REPORT',
                error: error.message
            });

            // Enviar email de notificación de error
            if (event.data?.email) {
                await emailService.sendErrorNotification(
                    event.data.email,
                    'Reporte de Emprendimiento',
                    error.message
                );
            }

            throw error;
        }
    }

    /**
     * Handler: Generar reporte individual de emprendimiento para administrador
     */
    async handleGenerateAdminReport(event) {
        logger.info('📊 Procesando solicitud de reporte administrativo', { businessId: event.data.businessId });

        try {
            const { businessId, adminEmail, businessData } = event.data;

            if (!businessData) {
                throw new Error('No se recibieron datos del emprendimiento');
            }

            // Generar PDF
            logger.info('Generando PDF del reporte administrativo...');
            const pdf = await adminReportService.generateBusinessReport(businessData);

            // Enviar por correo
            logger.info(`Enviando reporte administrativo a: ${adminEmail}`);
            await emailService.sendReportEmail(
                adminEmail,
                `Evaluación de Emprendimiento - ${businessData.name}`,
                pdf,
                `eval-${businessData.name}-${Date.now()}.pdf`
            );

            // Enviar evento de confirmación
            await kafkaProducer.sendReportGeneratedEvent({
                businessId,
                adminEmail,
                reportType: 'ADMIN_REPORT',
                businessName: businessData.name,
                success: true
            });

            logger.info('✅ Reporte administrativo generado y enviado exitosamente');

        } catch (error) {
            logger.error('Error al generar reporte administrativo:', error);

            await kafkaProducer.sendReportFailedEvent({
                businessId: event.data?.businessId,
                adminEmail: event.data?.adminEmail,
                reportType: 'ADMIN_REPORT',
                error: error.message
            });

            if (event.data?.adminEmail) {
                await emailService.sendErrorNotification(
                    event.data.adminEmail,
                    'Reporte Administrativo',
                    error.message
                );
            }

            throw error;
        }
    }

    /**
     * Handler: Generar reporte comparativo en PDF
     */
    async handleGenerateComparativePDF(event) {
        logger.info('📊 Procesando solicitud de reporte comparativo PDF');

        try {
            const { adminEmail, filters, businessesData } = event.data;

            if (!businessesData || businessesData.length === 0) {
                throw new Error('No se recibieron datos de emprendimientos');
            }

            // Generar PDF
            logger.info(`Generando PDF comparativo de ${businessesData.length} emprendimientos...`);
            const pdf = await comparativeReportService.generateComparativePDF(businessesData, filters);

            // Enviar por correo
            logger.info(`Enviando reporte comparativo PDF a: ${adminEmail}`);
            await emailService.sendReportEmail(
                adminEmail,
                'Reporte Comparativo de Emprendimientos',
                pdf,
                `comparativo-${Date.now()}.pdf`
            );

            // Enviar evento de confirmación
            await kafkaProducer.sendReportGeneratedEvent({
                adminEmail,
                reportType: 'COMPARATIVE_PDF',
                businessCount: businessesData.length,
                success: true
            });

            logger.info('✅ Reporte comparativo PDF generado y enviado exitosamente');

        } catch (error) {
            logger.error('Error al generar reporte comparativo PDF:', error);

            await kafkaProducer.sendReportFailedEvent({
                adminEmail: event.data?.adminEmail,
                reportType: 'COMPARATIVE_PDF',
                error: error.message
            });

            if (event.data?.adminEmail) {
                await emailService.sendErrorNotification(
                    event.data.adminEmail,
                    'Reporte Comparativo PDF',
                    error.message
                );
            }

            throw error;
        }
    }

    /**
     * Handler: Generar reporte comparativo en Excel
     */
    async handleGenerateComparativeExcel(event) {
        logger.info('📊 Procesando solicitud de reporte comparativo Excel');

        try {
            const { adminEmail, filters, businessesData } = event.data;

            if (!businessesData || businessesData.length === 0) {
                throw new Error('No se recibieron datos de emprendimientos');
            }

            // Generar Excel
            logger.info(`Generando Excel comparativo de ${businessesData.length} emprendimientos...`);
            const excel = await comparativeReportService.generateComparativeExcel(businessesData, filters);

            // Enviar por correo
            logger.info(`Enviando reporte comparativo Excel a: ${adminEmail}`);
            await emailService.sendExcelReportEmail(
                adminEmail,
                'Reporte Comparativo de Emprendimientos',
                excel,
                `comparativo-${Date.now()}.xlsx`
            );

            // Enviar evento de confirmación
            await kafkaProducer.sendReportGeneratedEvent({
                adminEmail,
                reportType: 'COMPARATIVE_EXCEL',
                businessCount: businessesData.length,
                success: true
            });

            logger.info('✅ Reporte comparativo Excel generado y enviado exitosamente');

        } catch (error) {
            logger.error('Error al generar reporte comparativo Excel:', error);

            await kafkaProducer.sendReportFailedEvent({
                adminEmail: event.data?.adminEmail,
                reportType: 'COMPARATIVE_EXCEL',
                error: error.message
            });

            if (event.data?.adminEmail) {
                await emailService.sendErrorNotification(
                    event.data.adminEmail,
                    'Reporte Comparativo Excel',
                    error.message
                );
            }

            throw error;
        }
    }

    /**
     * Detener el consumer de forma ordenada
     */
    async stop() {
        logger.info('Deteniendo Report Consumer...');
        await kafkaConsumer.shutdown();
        logger.info('Report Consumer detenido');
    }
}

module.exports = new ReportConsumer();
