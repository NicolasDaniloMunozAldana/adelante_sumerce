require('dotenv').config();
const express = require('express');
const logger = require('./utils/logger');
const config = require('./config');
const emailService = require('./email/emailService');
const reportConsumer = require('./consumers/reportConsumer');
const kafkaProducer = require('./kafka/kafkaProducer');
const monitoringRoutes = require('./routes/monitoring');
const { metrics } = require('./monitoring/metrics');

/**
 * Microservicio de Generación de Reportes
 * 
 * Este servicio es un consumer de Kafka que:
 * 1. Escucha eventos de generación de reportes
 * 2. Genera PDFs/Excel usando Puppeteer y ExcelJS
 * 3. Envía los reportes por correo electrónico
 * 4. Publica eventos de confirmación/error
 * 
 * Características de resiliencia:
 * - Auto-commit deshabilitado: los offsets se commitean solo tras éxito
 * - Si el servicio se cae, al reiniciar procesará mensajes pendientes
 * - Los mensajes no se pierden (persistidos en Kafka)
 */

class ReportServiceApp {
    constructor() {
        this.isShuttingDown = false;
        this.httpServer = null;
    }

    async start() {
        try {
            logger.info('='.repeat(60));
            logger.info(`🚀 Iniciando ${config.service.name}...`);
            logger.info('='.repeat(60));

            // Verificar configuración
            this.validateConfiguration();

            // Iniciar servidor HTTP para métricas
            await this.startHttpServer();

            // Verificar conexión de email
            await this.verifyEmailConnection();

            // Conectar producer (para eventos de respuesta)
            await kafkaProducer.connect();

            // Iniciar consumer
            await reportConsumer.start();

            // Configurar graceful shutdown
            this.setupGracefulShutdown();

            logger.info('='.repeat(60));
            logger.info('✅ Microservicio iniciado exitosamente');
            logger.info('📨 Escuchando eventos de Kafka...');
            logger.info('='.repeat(60));

        } catch (error) {
            logger.error('❌ Error fatal al iniciar el microservicio:', error);
            process.exit(1);
        }
    }

    /**
     * Inicia el servidor HTTP para exponer métricas
     */
    async startHttpServer() {
        const app = express();
        const port = process.env.METRICS_PORT || 3002;

        // Rutas de monitoreo
        app.use('/', monitoringRoutes);

        return new Promise((resolve, reject) => {
            this.httpServer = app.listen(port, '0.0.0.0', (err) => {
                if (err) {
                    logger.error('❌ Error al iniciar servidor HTTP:', err);
                    reject(err);
                } else {
                    logger.info(`✅ Servidor HTTP iniciado en puerto ${port}`);
                    logger.info(`   Métricas: http://localhost:${port}/metrics`);
                    logger.info(`   Health: http://localhost:${port}/health`);
                    
                    // Marcar el servicio como disponible
                    metrics.kafkaAvailable.set(0); // Inicialmente Kafka puede no estar conectado
                    
                    resolve();
                }
            });

            this.httpServer.on('error', (err) => {
                logger.error('❌ Error en servidor HTTP:', err);
                reject(err);
            });
        });
    }

    /**
     * Valida que la configuración esté completa
     */
    validateConfiguration() {
        logger.info('🔍 Validando configuración...');

        const required = [
            { name: 'KAFKA_BROKERS', value: config.kafka.brokers },
            { name: 'SMTP_HOST', value: config.email.host },
            { name: 'SMTP_USER', value: config.email.auth.user },
            { name: 'SMTP_PASSWORD', value: config.email.auth.pass }
        ];

        const missing = required.filter(item => !item.value);

        if (missing.length > 0) {
            logger.error('❌ Configuración incompleta. Faltan las siguientes variables:');
            missing.forEach(item => logger.error(`   - ${item.name}`));
            throw new Error('Configuración incompleta');
        }

        logger.info('✅ Configuración válida');
    }

    /**
     * Verifica la conexión con el servidor SMTP
     */
    async verifyEmailConnection() {
        logger.info('📧 Verificando conexión con servidor SMTP...');

        try {
            const isConnected = await emailService.verifyConnection();

            if (!isConnected) {
                logger.warn('⚠️  No se pudo verificar la conexión SMTP, pero el servicio continuará');
            } else {
                logger.info('✅ Conexión SMTP verificada correctamente');
            }
        } catch (error) {
            logger.warn('⚠️  Error al verificar conexión SMTP:', error.message);
            logger.warn('⚠️  El servicio continuará, pero puede haber problemas al enviar emails');
        }
    }

    /**
     * Configura el graceful shutdown
     */
    setupGracefulShutdown() {
        const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

        signals.forEach(signal => {
            process.on(signal, async () => {
                if (this.isShuttingDown) {
                    logger.warn('⚠️  Shutdown ya en progreso...');
                    return;
                }

                this.isShuttingDown = true;

                logger.info('');
                logger.info('='.repeat(60));
                logger.info(`🛑 Señal ${signal} recibida. Iniciando graceful shutdown...`);
                logger.info('='.repeat(60));

                try {
                    // Detener consumer (permite que termine de procesar mensajes actuales)
                    logger.info('1. Deteniendo consumer de Kafka...');
                    await reportConsumer.stop();

                    // Desconectar producer
                    logger.info('2. Desconectando producer de Kafka...');
                    await kafkaProducer.disconnect();

                    // Cerrar servidor HTTP
                    if (this.httpServer) {
                        logger.info('3. Cerrando servidor HTTP...');
                        await new Promise((resolve) => this.httpServer.close(resolve));
                    }

                    logger.info('='.repeat(60));
                    logger.info('✅ Microservicio detenido exitosamente');
                    logger.info('='.repeat(60));

                    process.exit(0);
                } catch (error) {
                    logger.error('❌ Error durante graceful shutdown:', error);
                    process.exit(1);
                }
            });
        });

        // Manejar errores no capturados
        process.on('uncaughtException', (error) => {
            logger.error('❌ Uncaught Exception:', error);
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
            process.exit(1);
        });
    }
}

// Iniciar el microservicio
const app = new ReportServiceApp();
app.start();

module.exports = app;
