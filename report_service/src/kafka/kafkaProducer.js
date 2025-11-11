const { Kafka, Partitioners } = require('kafkajs');
const config = require('../config');
const logger = require('../utils/logger');

class KafkaProducer {
    constructor() {
        this.kafka = new Kafka({
            clientId: config.kafka.clientId,
            brokers: config.kafka.brokers
        });

        this.producer = this.kafka.producer({
            createPartitioner: Partitioners.LegacyPartitioner
        });

        this.isConnected = false;
    }

    async connect() {
        try {
            await this.producer.connect();
            this.isConnected = true;
            logger.info('Kafka Producer conectado exitosamente');
        } catch (error) {
            logger.error('Error al conectar Kafka Producer:', error);
            throw error;
        }
    }

    async disconnect() {
        try {
            await this.producer.disconnect();
            this.isConnected = false;
            logger.info('Kafka Producer desconectado');
        } catch (error) {
            logger.error('Error al desconectar Kafka Producer:', error);
        }
    }

    async sendEvent(topic, event) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }

            const message = {
                value: JSON.stringify(event),
                timestamp: Date.now().toString()
            };

            await this.producer.send({
                topic,
                messages: [message]
            });

            logger.info(`Evento enviado al topic ${topic}:`, { eventType: event.type });
            return true;
        } catch (error) {
            logger.error(`Error al enviar evento al topic ${topic}:`, error);
            throw error;
        }
    }

    async sendReportGeneratedEvent(reportData) {
        return this.sendEvent(config.kafka.topics.reportGenerated, {
            type: 'REPORT_GENERATED',
            timestamp: Date.now(),
            data: reportData
        });
    }

    async sendReportFailedEvent(errorData) {
        return this.sendEvent(config.kafka.topics.reportFailed, {
            type: 'REPORT_FAILED',
            timestamp: Date.now(),
            data: errorData
        });
    }
}

module.exports = new KafkaProducer();
