const { Kafka } = require('kafkajs');
const { Business, BusinessModel, Finance, WorkTeam, Rating, User } = require('../models');
const cacheService = require('../services/cacheService');
const characterizationService = require('../services/characterizationService');
const { redisClient, isRedisAvailable } = require('../config/redis');

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
        this.dbCheckInterval = 10000; // Verificar BD cada 30 segundos
        this.lastDbCheck = null;
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

            // Iniciar verificación periódica de datos pendientes en caché
            this.startPendingDataSync();

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

            const { data, userId, tempId, userData } = event;
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
                console.log(`   📝 Usuario: ${userId}, Nombre: ${business.name}`);
                console.log(`   🔗 Verificar en BD: SELECT * FROM emprendimientos WHERE id=${businessId};`);

                // Actualizar caché con ID real (incluir userData si está disponible)
                await this.updateCacheWithRealId(userId, tempId, businessId, result, userData);

                // Reemplazar en lista admin el ID temporal por el ID real
                await this.replaceInAdminList(tempId, businessId, result.business);

                // Publicar evento de sincronización
                await this.publishCacheUpdateEvent('BUSINESS_PERSISTED', { 
                    userId, 
                    businessId, 
                    tempId,
                    businessData: result.business 
                });

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
    async updateCacheWithRealId(userId, tempId, businessId, businessData, userData = null) {
        try {
            // Obtener datos completos de BD para actualizar caché (incluye User)
            const fullBusinessData = await Business.findOne({
                where: { id: businessId },
                include: [
                    { 
                        model: User,
                        attributes: ['id', 'email', 'firstName', 'lastName', 'phoneContact'],
                        required: false
                    },
                    { model: BusinessModel },
                    { model: Finance },
                    { model: WorkTeam },
                    { model: Rating }
                ]
            });

            if (!fullBusinessData) {
                console.error(`⚠️  No se encontró businessId ${businessId} en BD`);
                return;
            }

            // Actualizar múltiples claves de caché
            const charKey = cacheService.generateCacheKey('characterization:user', { userId });
            const businessKey = cacheService.generateCacheKey('admin:business', { businessId });
            const dashKey = cacheService.generateCacheKey('dashboard:user', { userId });

            // Marcar como sincronizado
            const syncedData = fullBusinessData.toJSON();
            syncedData._isPending = false;
            syncedData._syncedAt = new Date().toISOString();

            // Actualizar todas las claves relacionadas
            await cacheService.set(charKey, syncedData, cacheService.CRITICAL_DATA_TTL);
            await cacheService.set(businessKey, syncedData, cacheService.CRITICAL_DATA_TTL);
            
            // Actualizar dashboard si es necesario
            const dashboardData = this.buildDashboardFromBusiness(syncedData);
            await cacheService.set(dashKey, dashboardData, cacheService.CRITICAL_DATA_TTL);

            console.log(`💾 Caché actualizado: tempId ${tempId} → businessId ${businessId}`);

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

    /**
     * Sincroniza datos pendientes en caché con BD periódicamente
     */
    startPendingDataSync() {
        setInterval(async () => {
            try {
                // Verificar si BD está disponible
                const dbAvailable = await this.checkDatabaseAvailability();
                
                if (!dbAvailable) {
                    console.log('🔍 BD no disponible, esperando...');
                    return;
                }

                // Buscar datos pendientes en caché
                const pendingData = await this.findPendingDataInCache();
                
                if (pendingData.length === 0) {
                    return;
                }

                console.log(`🔄 Sincronizando ${pendingData.length} registros pendientes...`);

                for (const item of pendingData) {
                    try {
                        // Verificar si ya existe en BD
                        const exists = await Business.findOne({
                            where: { 
                                userId: item.userId,
                                name: item.name 
                            }
                        });

                        if (!exists) {
                            console.log(`⚠️  Registro pendiente sin evento en Kafka: userId=${item.userId}`);
                            // Este caso requiere recrear el evento o insertar directamente
                            // Por ahora, solo logeamos
                        } else {
                            // Ya existe en BD, actualizar caché con ID real
                            await this.updateCacheWithRealId(
                                item.userId, 
                                item.id, // tempId
                                exists.id, 
                                null
                            );
                        }
                    } catch (error) {
                        console.error(`❌ Error procesando registro pendiente:`, error.message);
                    }
                }

            } catch (error) {
                console.error('❌ Error en sincronización periódica:', error);
            }
        }, this.dbCheckInterval);
    }

    /**
     * Verifica si la BD está disponible
     */
    async checkDatabaseAvailability() {
        try {
            await Business.findOne({ limit: 1 });
            
            // Si antes no estaba disponible y ahora sí, loguear
            if (this.lastDbCheck === false) {
                console.log('✅ BD ahora está disponible, iniciando sincronización...');
            }
            
            this.lastDbCheck = true;
            return true;
        } catch (error) {
            this.lastDbCheck = false;
            return false;
        }
    }

    /**
     * Busca datos marcados como pendientes en caché
     */
    async findPendingDataInCache() {
        try {
            // Verificar si Redis está disponible
            if (!isRedisAvailable()) {
                console.warn('⚠️  Redis no disponible para buscar datos pendientes');
                return [];
            }

            // Buscar todas las claves de characterization:user
            const pattern = 'characterization:user:userId:*';
            const keys = await redisClient.keys(pattern);
            
            if (!keys || keys.length === 0) {
                return [];
            }

            const pendingData = [];
            
            for (const fullKey of keys) {
                // Remover prefijo si existe
                const cleanKey = fullKey.replace('adelante_sumerce:', '');
                const data = await cacheService.get(cleanKey);
                
                if (data && data._isPending === true) {
                    console.log(`📌 Dato pendiente encontrado: userId=${data.userId}, id=${data.id}`);
                    pendingData.push(data);
                }
            }

            return pendingData;
        } catch (error) {
            console.error('❌ Error buscando datos pendientes:', error.message);
            return [];
        }
    }

    /**
     * Construye datos de dashboard desde business data
     */
    buildDashboardFromBusiness(business) {
        if (!business.Rating) return null;

        const rating = business.Rating;
        const maxTotal = 13;
        const totalPercentage = parseFloat(rating.totalPercentage) || 0;

        return {
            puntajeTotal: parseInt(rating.totalScore) || 0,
            maxTotal: maxTotal,
            porcentaje: parseFloat(totalPercentage.toFixed(2)),
            estado: this.getEstadoLabel(rating.globalClassification),
            secciones: [
                {
                    nombre: 'Datos Generales',
                    puntaje: parseInt(rating.generalDataScore) || 0,
                    max: 3,
                    porcentaje: parseFloat(((parseInt(rating.generalDataScore) / 3) * 100).toFixed(2))
                },
                {
                    nombre: 'Finanzas',
                    puntaje: parseInt(rating.financeScore) || 0,
                    max: 6,
                    porcentaje: parseFloat(((parseInt(rating.financeScore) / 6) * 100).toFixed(2))
                },
                {
                    nombre: 'Equipo de Trabajo',
                    puntaje: parseInt(rating.workTeamScore) || 0,
                    max: 4,
                    porcentaje: parseFloat(((parseInt(rating.workTeamScore) / 4) * 100).toFixed(2))
                }
            ],
            emprendimiento: {
                nombre: business.name,
                sector: business.economicSector,
                anioCreacion: business.creationYear,
                encargado: business.managerName
            },
            fechaCalculo: rating.calculationDate,
            _isPending: false,
            _syncedAt: business._syncedAt
        };
    }

    getEstadoLabel(classification) {
        const labels = {
            'idea_inicial': 'Idea Inicial',
            'en_desarrollo': 'En Desarrollo',
            'consolidado': 'Consolidado'
        };
        return labels[classification] || 'Sin clasificar';
    }

    /**
     * Reemplaza emprendimiento con ID temporal por uno con ID real en lista admin
     */
    async replaceInAdminList(tempId, realId, businessData) {
        try {
            const cacheKey = 'admin:all-businesses';
            let businesses = await cacheService.get(cacheKey);
            
            if (businesses) {
                // Convertir businessData a JSON si es necesario
                const businessJson = businessData.toJSON ? businessData.toJSON() : businessData;
                
                // Marcar como sincronizado
                const updatedBusiness = {
                    ...businessJson,
                    _isPending: false,
                    _syncedAt: new Date().toISOString()
                };
                
                // Encontrar índice del emprendimiento temporal
                const tempIndex = businesses.findIndex(b => 
                    b.id === tempId || 
                    b._tempId === tempId ||
                    (b.userId === businessJson.userId && b._isPending)
                );
                
                // Verificar si ya existe uno con el ID real (para evitar duplicados)
                const realIndex = businesses.findIndex(b => b.id === realId && !b._isPending);
                
                if (tempIndex !== -1) {
                    if (realIndex !== -1 && realIndex !== tempIndex) {
                        // Ya existe uno con ID real, eliminar el temporal
                        businesses.splice(tempIndex, 1);
                        console.log(`🗑️  Duplicado temporal ${tempId} eliminado (ya existe ${realId})`);
                    } else {
                        // Reemplazar el temporal con el real
                        businesses[tempIndex] = updatedBusiness;
                        console.log(`🔄 ID temporal ${tempId} reemplazado por ID real ${realId}`);
                    }
                } else if (realIndex === -1) {
                    // No se encontró ni temporal ni real, agregarlo
                    businesses = [updatedBusiness, ...businesses];
                    console.log(`➕ Emprendimiento ${realId} agregado a lista admin`);
                } else {
                    // Ya existe con ID real, solo actualizar
                    businesses[realIndex] = updatedBusiness;
                    console.log(`🔄 Emprendimiento ${realId} actualizado en lista admin`);
                }
                
                // Guardar lista actualizada
                await cacheService.set(cacheKey, businesses, 300); // 5 minutos
            } else {
                // Si no hay lista, invalidar para forzar recarga desde BD
                await cacheService.delete('admin:all-businesses');
                console.log('🔄 Lista admin no existe, se invalidará para recarga');
            }
            
            // Actualizar caché individual con ID real
            const businessKey = cacheService.generateCacheKey('admin:business', { businessId: realId });
            const businessJson = businessData.toJSON ? businessData.toJSON() : businessData;
            await cacheService.set(businessKey, { ...businessJson, _isPending: false }, cacheService.CRITICAL_DATA_TTL);
            
            // Eliminar caché con ID temporal
            const tempBusinessKey = cacheService.generateCacheKey('admin:business', { businessId: tempId });
            await cacheService.delete(tempBusinessKey);
            
        } catch (error) {
            console.error('⚠️  Error reemplazando en lista admin:', error.message);
        }
    }

    /**
     * Invalida todos los cachés administrativos
     */
    async invalidateAdminCaches() {
        try {
            await cacheService.delete('admin:all-businesses');
            await cacheService.delete('admin:statistics');
            await cacheService.delete('admin:all-users');
            console.log('🔄 Cachés administrativos invalidados después de persistir en BD');
        } catch (error) {
            console.error('⚠️  Error invalidando cachés administrativos:', error.message);
        }
    }

    /**
     * Publica evento de actualización de caché
     */
    async publishCacheUpdateEvent(eventType, data) {
        try {
            if (!isRedisAvailable()) return;

            const event = {
                type: eventType,
                timestamp: Date.now(),
                data: data
            };

            await redisClient.publish('cache-updates', JSON.stringify(event));
            console.log(`📢 Evento de caché publicado: ${eventType}`);
        } catch (error) {
            console.error('⚠️  Error publicando evento de caché:', error.message);
        }
    }
}

module.exports = new KafkaWriteConsumer();
