const { Kafka, Partitioners } = require('kafkajs');
const { metrics } = require('../monitoring/metrics');

class KafkaProducer {
    constructor() {
        this.kafka = new Kafka({
            clientId: 'adelante-sumerce',
            brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092']
        });

        this.producer = this.kafka.producer({
            createPartitioner: Partitioners.LegacyPartitioner
        });

        this.isConnected = false;
        this.topics = {
            generateUserReport: process.env.TOPIC_GENERATE_USER_REPORT || 'generate-user-report',
            generateAdminReport: process.env.TOPIC_GENERATE_ADMIN_REPORT || 'generate-admin-report',
            generateComparativeReport: process.env.TOPIC_GENERATE_COMPARATIVE_REPORT || 'generate-comparative-report',
            // Nuevos topics para escrituras resilientes
            characterizationWrites: process.env.TOPIC_CHARACTERIZATION_WRITES || 'characterization-writes',
            characterizationUpdates: process.env.TOPIC_CHARACTERIZATION_UPDATES || 'characterization-updates'
        };
    }

    async connect() {
        try {
            if (!this.isConnected) {
                await this.producer.connect();
                this.isConnected = true;
                console.log('✅ Kafka Producer conectado');
            }
        } catch (error) {
            console.error('❌ Error al conectar Kafka Producer:', error);
            throw error;
        }
    }

    async disconnect() {
        try {
            if (this.isConnected) {
                await this.producer.disconnect();
                this.isConnected = false;
                console.log('Kafka Producer desconectado');
            }
        } catch (error) {
            console.error('Error al desconectar Kafka Producer:', error);
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

            console.log(`📨 Evento enviado al topic ${topic}:`, event.type);
            return true;
        } catch (error) {
            console.error(`❌ Error al enviar evento al topic ${topic}:`, error);
            throw error;
        }
    }

    /**
     * Envía solicitud de generación de reporte de usuario
     */
    async sendGenerateUserReportEvent(userId, email, businessData) {
        const end = metrics.reportServiceLatency.startTimer({ operation: 'generate_user_report' });
        try {
            const result = await this.sendEvent(this.topics.generateUserReport, {
                type: 'GENERATE_USER_REPORT',
                timestamp: Date.now(),
                data: {
                    userId,
                    email,
                    businessData
                }
            });
            end();
            return result;
        } catch (error) {
            end();
            throw error;
        }
    }

    /**
     * Envía solicitud de generación de reporte administrativo
     */
    async sendGenerateAdminReportEvent(businessId, adminEmail, businessData) {
        const end = metrics.reportServiceLatency.startTimer({ operation: 'generate_admin_report' });
        try {
            const result = await this.sendEvent(this.topics.generateAdminReport, {
                type: 'GENERATE_ADMIN_REPORT',
                timestamp: Date.now(),
                data: {
                    businessId,
                    adminEmail,
                    businessData
                }
            });
            end();
            return result;
        } catch (error) {
            end();
            throw error;
        }
    }

    /**
     * Envía solicitud de generación de reporte comparativo PDF
     */
    async sendGenerateComparativePDFEvent(adminEmail, businessesData, filters = {}) {
        const end = metrics.reportServiceLatency.startTimer({ operation: 'generate_comparative_pdf' });
        try {
            const result = await this.sendEvent(this.topics.generateComparativeReport, {
                type: 'GENERATE_COMPARATIVE_PDF',
                timestamp: Date.now(),
                data: {
                    adminEmail,
                    filters,
                    businessesData
                }
            });
            end();
            return result;
        } catch (error) {
            end();
            throw error;
        }
    }

    /**
     * Envía solicitud de generación de reporte comparativo Excel
     */
    async sendGenerateComparativeExcelEvent(adminEmail, businessesData, filters = {}) {
        const end = metrics.reportServiceLatency.startTimer({ operation: 'generate_comparative_excel' });
        try {
            const result = await this.sendEvent(this.topics.generateComparativeReport, {
                type: 'GENERATE_COMPARATIVE_EXCEL',
                timestamp: Date.now(),
                data: {
                    adminEmail,
                    filters,
                    businessesData
                }
            });
            end();
            return result;
        } catch (error) {
            end();
            throw error;
        }
    }

    /**
     * Envía evento de escritura de caracterización (resiliente)
     */
    async sendCharacterizationWriteEvent(writeEvent) {
        return this.sendEvent(this.topics.characterizationWrites, writeEvent);
    }

    /**
     * Envía evento de actualización de caracterización (resiliente)
     */
    async sendCharacterizationUpdateEvent(updateEvent) {
        return this.sendEvent(this.topics.characterizationUpdates, updateEvent);
    }
}

module.exports = new KafkaProducer();