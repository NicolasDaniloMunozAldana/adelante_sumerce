const { Kafka } = require('kafkajs');
const config = require('../config');
const logger = require('../utils/logger');

class KafkaConsumer {
    constructor() {
        this.kafka = new Kafka({
            clientId: config.kafka.clientId,
            brokers: config.kafka.brokers
        });

        this.consumer = this.kafka.consumer({
            groupId: config.kafka.groupId,
            sessionTimeout: 30000,
            heartbeatInterval: 3000,
            // CRÍTICO: Configuración de resiliencia
            retry: {
                initialRetryTime: 100,
                retries: 8
            }
        });

        this.isConnected = false;
        this.messageHandlers = new Map();
    }

    async connect() {
        try {
            await this.consumer.connect();
            this.isConnected = true;
            logger.info('Kafka Consumer conectado exitosamente');
        } catch (error) {
            logger.error('Error al conectar Kafka Consumer:', error);
            throw error;
        }
    }

    async disconnect() {
        try {
            await this.consumer.disconnect();
            this.isConnected = false;
            logger.info('Kafka Consumer desconectado');
        } catch (error) {
            logger.error('Error al desconectar Kafka Consumer:', error);
        }
    }

    /**
     * Registra un handler para un tipo de evento específico
     */
    registerHandler(eventType, handler) {
        this.messageHandlers.set(eventType, handler);
        logger.info(`Handler registrado para evento tipo: ${eventType}`);
    }

    /**
     * Suscribe a los topics y comienza a consumir mensajes
     */
    async subscribe(topics) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }

            // Suscribirse a todos los topics
            for (const topic of topics) {
                await this.consumer.subscribe({ 
                    topic, 
                    fromBeginning: true  // Procesa mensajes pendientes desde el inicio
                });
                logger.info(`Suscrito al topic: ${topic}`);
            }

            // Configurar el procesamiento de mensajes
            await this.consumer.run({
                // CRÍTICO: Auto commit deshabilitado para control manual
                autoCommit: false,
                eachMessage: async ({ topic, partition, message }) => {
                    await this.handleMessage(topic, partition, message);
                }
            });

            logger.info('Consumer iniciado y escuchando eventos...');
        } catch (error) {
            logger.error('Error al suscribirse a topics:', error);
            throw error;
        }
    }

    /**
     * Maneja cada mensaje recibido
     */
    async handleMessage(topic, partition, message) {
        const startTime = Date.now();
        let event;

        try {
            // Parse del mensaje
            event = JSON.parse(message.value.toString());
            const eventType = event.type;

            logger.info(`📨 Mensaje recibido`, {
                topic,
                partition,
                offset: message.offset,
                eventType,
                timestamp: event.timestamp
            });

            // Buscar el handler correspondiente
            const handler = this.messageHandlers.get(eventType);

            if (!handler) {
                logger.warn(`No hay handler registrado para el evento tipo: ${eventType}`);
                // Commitear el offset aunque no se procese (mensaje inválido)
                await this.commitOffset(topic, partition, message.offset);
                return;
            }

            // Ejecutar el handler
            await handler(event);

            // CRÍTICO: Solo hacer commit si el procesamiento fue exitoso
            await this.commitOffset(topic, partition, message.offset);

            const duration = Date.now() - startTime;
            logger.info(`✅ Mensaje procesado exitosamente en ${duration}ms`, {
                eventType,
                offset: message.offset
            });

        } catch (error) {
            logger.error(`❌ Error procesando mensaje:`, {
                topic,
                partition,
                offset: message.offset,
                error: error.message,
                stack: error.stack,
                event: event?.type
            });

            // Estrategia de reintentos: aquí puedes implementar lógica de DLQ
            await this.handleProcessingError(topic, partition, message, error);
        }
    }

    /**
     * Commit manual del offset
     */
    async commitOffset(topic, partition, offset) {
        try {
            await this.consumer.commitOffsets([
                {
                    topic,
                    partition,
                    offset: (parseInt(offset) + 1).toString()
                }
            ]);
            logger.debug(`Offset commiteado: ${offset}`);
        } catch (error) {
            logger.error('Error al commitear offset:', error);
            throw error;
        }
    }

    /**
     * Manejo de errores en el procesamiento
     * Aquí podrías implementar lógica de DLQ (Dead Letter Queue)
     */
    async handleProcessingError(topic, partition, message, error) {
        // Por ahora, no hacemos commit del offset para que se reintente
        // En producción, deberías implementar:
        // 1. Contador de reintentos
        // 2. Envío a DLQ después de X reintentos
        // 3. Alertas/notificaciones

        logger.warn(`Mensaje NO commiteado, será reintentado en el próximo poll`);
    }

    /**
     * Manejo graceful shutdown
     */
    async shutdown() {
        logger.info('Iniciando graceful shutdown del consumer...');
        await this.disconnect();
    }
}

module.exports = new KafkaConsumer();
