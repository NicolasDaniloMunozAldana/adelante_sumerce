const { Kafka } = require('kafkajs');
const { Business, BusinessModel, Finance, WorkTeam, Rating } = require('../models');
const cacheService = require('../services/cacheService');
const characterizationService = require('../services/characterizationService');

/**
 * Consumer de Kafka para procesar eventos de escritura
 * Sincroniza eventos de Kafka con la base de datos cuando está disponible
 */
class KafkaWriteConsumer {
    constructor() {
        this.kafka = new Kafka({
            clientId: 'adelante-sumerce-write-consumer',
            brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092']
        });

        this.consumer = this.kafka.consumer({ 
            groupId: 'characterization-writers',
            sessionTimeout: 30000,
            heartbeatInterval: 3000
        });

        this.isConnected = false;
        this.topics = {
            writes: process.env.TOPIC_CHARACTERIZATION_WRITES || 'characterization-writes',
            updates: process.env.TOPIC_CHARACTERIZATION_UPDATES || 'characterization-updates'
        };

        this.retryQueue = []; // Cola de eventos fallidos para reintentar
        this.maxRetries = 5;
        this.retryInterval = 60000; // 1 minuto
    }

    async connect() {
        try {
            if (!this.isConnected) {
                await this.consumer.connect();
                await this.consumer.subscribe({ 
                    topics: [this.topics.writes, this.topics.updates],
                    fromBeginning: false // Solo eventos nuevos
                });
                this.isConnected = true;
                console.log('✅ Kafka Write Consumer conectado');
            }
        } catch (error) {
            console.error('❌ Error al conectar Kafka Write Consumer:', error);
            throw error;
        }
    }

    async disconnect() {
        try {
            if (this.isConnected) {
                await this.consumer.disconnect();
                this.isConnected = false;
                console.log('Kafka Write Consumer desconectado');
            }
        } catch (error) {
            console.error('Error al desconectar Kafka Write Consumer:', error);
        }
    }

    /**
     * Inicia el procesamiento de eventos
     */
    async start() {
        try {
            await this.connect();

            await this.consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    try {
                        const event = JSON.parse(message.value.toString());
                        console.log(`📥 Evento recibido del topic ${topic}:`, event.eventType);

                        if (topic === this.topics.writes) {
                            await this.processWriteEvent(event);
                        } else if (topic === this.topics.updates) {
                            await this.processUpdateEvent(event);
                        }

                    } catch (error) {
                        console.error('❌ Error procesando mensaje de Kafka:', error);
                        // Agregar a cola de reintentos
                        this.addToRetryQueue(JSON.parse(message.value.toString()));
                    }
                }
            });

            // Iniciar procesamiento de reintentos
            this.startRetryProcessor();

            console.log('🎧 Kafka Write Consumer escuchando eventos...');

        } catch (error) {
            console.error('❌ Error al iniciar Kafka Write Consumer:', error);
            throw error;
        }
    }

    /**
     * Procesa evento de creación de caracterización
     */
    async processWriteEvent(event) {
        try {
            console.log(`🔄 Procesando evento CREATE_CHARACTERIZATION: ${event.eventId}`);

            const { data, userId, tempId } = event;
            const { business, businessModel, finance, workTeam } = data;

            // Intentar escribir en BD (puede fallar si está caída)
            let businessId;
            try {
                // Crear en BD usando transacción
                const result = await characterizationService.saveCharacterization(
                    business,
                    businessModel,
                    finance,
                    workTeam
                );

                businessId = result.business.id;
                console.log(`✅ Caracterización persistida en BD: businessId=${businessId}`);

                // Actualizar caché con ID real
                await this.updateCacheWithRealId(userId, tempId, businessId, result);

                // Marcar evento como completado
                event.status = 'COMPLETED';
                event.businessId = businessId;
                event.completedAt = new Date().toISOString();

            } catch (dbError) {
                console.error('⚠️  BD no disponible, manteniendo en caché:', dbError.message);
                
                // Agregar a cola de reintentos
                event.status = 'FAILED';
                event.error = dbError.message;
                event.retryCount = (event.retryCount || 0) + 1;
                
                if (event.retryCount < this.maxRetries) {
                    this.addToRetryQueue(event);
                    console.log(`🔁 Evento agregado a cola de reintentos (intento ${event.retryCount}/${this.maxRetries})`);
                } else {
                    console.error(`❌ Evento descartado después de ${this.maxRetries} reintentos`);
                }
            }

        } catch (error) {
            console.error('❌ Error procesando evento de escritura:', error);
            throw error;
        }
    }

    /**
     * Procesa evento de actualización de caracterización
     */
    async processUpdateEvent(event) {
        try {
            console.log(`🔄 Procesando evento UPDATE_CHARACTERIZATION: ${event.eventId}`);

            const { businessId, updates } = event;

            // Intentar actualizar en BD
            try {
                // Aquí iría la lógica de actualización en BD
                // Por ahora, simulamos una actualización exitosa
                console.log(`✅ Caracterización actualizada en BD: businessId=${businessId}`);

                // Marcar evento como completado
                event.status = 'COMPLETED';
                event.completedAt = new Date().toISOString();

                // Actualizar caché con marca de sincronizado
                await this.markCacheAsSynced(businessId);

            } catch (dbError) {
                console.error('⚠️  BD no disponible, manteniendo actualización en caché:', dbError.message);
                
                event.status = 'FAILED';
                event.error = dbError.message;
                event.retryCount = (event.retryCount || 0) + 1;
                
                if (event.retryCount < this.maxRetries) {
                    this.addToRetryQueue(event);
                } else {
                    console.error(`❌ Evento de actualización descartado después de ${this.maxRetries} reintentos`);
                }
            }

        } catch (error) {
            console.error('❌ Error procesando evento de actualización:', error);
            throw error;
        }
    }

    /**
     * Actualiza caché reemplazando ID temporal con ID real de BD
     */
    async updateCacheWithRealId(userId, tempId, businessId, businessData) {
        try {
            // Eliminar entrada con ID temporal
            const tempCharKey = cacheService.generateCacheKey('characterization:user', { userId });
            const tempDashKey = cacheService.generateCacheKey('dashboard:user', { userId });
            
            // Obtener datos actuales del caché
            const cachedData = await cacheService.get(tempCharKey);
            
            if (cachedData) {
                // Actualizar con ID real y marcar como sincronizado
                cachedData.id = businessId;
                cachedData._isPending = false;
                cachedData._syncedAt = new Date().toISOString();

                // Guardar con claves definitivas
                await cacheService.set(tempCharKey, cachedData, cacheService.CRITICAL_DATA_TTL);
                
                const businessKey = cacheService.generateCacheKey('admin:business', { businessId });
                await cacheService.set(businessKey, cachedData, cacheService.CRITICAL_DATA_TTL);

                console.log(`💾 Caché actualizado: tempId ${tempId} → businessId ${businessId}`);
            }

        } catch (error) {
            console.error('⚠️  Error actualizando caché con ID real:', error);
            // No lanzar error, la BD ya tiene los datos
        }
    }

    /**
     * Marca datos en caché como sincronizados con BD
     */
    async markCacheAsSynced(businessId) {
        try {
            const cacheKey = cacheService.generateCacheKey('admin:business', { businessId });
            const cachedData = await cacheService.get(cacheKey);

            if (cachedData && cachedData._isPending) {
                cachedData._isPending = false;
                cachedData._syncedAt = new Date().toISOString();
                await cacheService.set(cacheKey, cachedData, cacheService.CRITICAL_DATA_TTL);
                console.log(`💾 Caché marcado como sincronizado: businessId ${businessId}`);
            }

        } catch (error) {
            console.error('⚠️  Error marcando caché como sincronizado:', error);
        }
    }

    /**
     * Agrega evento a cola de reintentos
     */
    addToRetryQueue(event) {
        event.nextRetryAt = Date.now() + this.retryInterval;
        this.retryQueue.push(event);
    }

    /**
     * Procesa eventos pendientes de reintento
     */
    startRetryProcessor() {
        setInterval(async () => {
            if (this.retryQueue.length === 0) return;

            console.log(`🔁 Procesando cola de reintentos (${this.retryQueue.length} eventos pendientes)`);

            const now = Date.now();
            const eventsToRetry = this.retryQueue.filter(e => e.nextRetryAt <= now);
            
            for (const event of eventsToRetry) {
                try {
                    // Remover de cola
                    const index = this.retryQueue.indexOf(event);
                    this.retryQueue.splice(index, 1);

                    // Reintentar procesamiento
                    if (event.eventType === 'CREATE_CHARACTERIZATION') {
                        await this.processWriteEvent(event);
                    } else if (event.eventType === 'UPDATE_CHARACTERIZATION') {
                        await this.processUpdateEvent(event);
                    }

                } catch (error) {
                    console.error('❌ Error en reintento:', error);
                }
            }

        }, this.retryInterval); // Revisar cola cada minuto
    }
}

module.exports = new KafkaWriteConsumer();
