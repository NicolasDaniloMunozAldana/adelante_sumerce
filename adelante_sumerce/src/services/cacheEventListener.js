const { createClient } = require('redis');
const cacheService = require('./cacheService');

/**
 * Listener de eventos de actualización de caché vía Redis Pub/Sub
 * Permite sincronización en tiempo real entre múltiples instancias de la aplicación
 */
class CacheEventListener {
    constructor() {
        this.subscriber = null;
        this.isListening = false;
    }

    /**
     * Inicia el listener de eventos de caché
     */
    async start() {
        try {
            if (this.isListening) {
                console.log('⚠️  Listener de caché ya está activo');
                return;
            }

            // Crear cliente suscriptor separado (Redis requiere clientes dedicados para pub/sub)
            this.subscriber = createClient({
                socket: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: process.env.REDIS_PORT || 6379
                },
                database: parseInt(process.env.REDIS_DB || '0')
            });

            this.subscriber.on('error', (err) => {
                console.error('❌ Redis Subscriber Error:', err);
            });

            await this.subscriber.connect();
            
            // Suscribirse al canal de actualizaciones de caché
            await this.subscriber.subscribe('cache-updates', async (message) => {
                await this.handleCacheUpdateEvent(message);
            });

            this.isListening = true;
            console.log('🔔 Listener de eventos de caché iniciado (canal: cache-updates)');

        } catch (error) {
            console.error('❌ Error al iniciar listener de caché:', error);
            throw error;
        }
    }

    /**
     * Procesa eventos de actualización de caché
     */
    async handleCacheUpdateEvent(message) {
        try {
            const event = JSON.parse(message);
            console.log(`📨 Evento de caché recibido: ${event.type}`);

            switch (event.type) {
                case 'NEW_BUSINESS':
                    // Nuevo emprendimiento creado - agregar a lista admin
                    if (event.data.businessData) {
                        await this.addToAdminList(event.data.businessData);
                        console.log(`✅ Nuevo emprendimiento agregado a lista admin: ${event.data.tempId}`);
                    } else {
                        // Si no viene businessData, invalidar para forzar recarga
                        await this.invalidateAdminCaches();
                    }
                    break;

                case 'BUSINESS_PERSISTED':
                    // Emprendimiento persistido en BD - reemplazar ID temporal
                    if (event.data.businessData && event.data.tempId) {
                        await this.replaceInAdminList(event.data.tempId, event.data.businessId, event.data.businessData);
                        console.log(`🔄 ID temporal ${event.data.tempId} reemplazado por ${event.data.businessId}`);
                    } else {
                        // Si no viene data completa, invalidar
                        await this.invalidateAdminCaches();
                    }
                    break;

                case 'BUSINESS_UPDATED':
                    // Emprendimiento actualizado - invalidar y refrescar
                    await this.invalidateAdminCaches();
                    if (event.data.businessId) {
                        await cacheService.invalidateBusinessCache(event.data.businessId);
                    }
                    console.log('🔄 Cachés invalidados por BUSINESS_UPDATED');
                    break;

                case 'FORCE_REFRESH':
                    // Forzar recarga completa
                    await this.invalidateAllAdminCaches();
                    console.log('🔄 Recarga completa de cachés solicitada');
                    break;

                default:
                    console.log(`⚠️  Tipo de evento desconocido: ${event.type}`);
            }

        } catch (error) {
            console.error('❌ Error procesando evento de caché:', error);
        }
    }

    /**
     * Agrega un nuevo emprendimiento a la lista administrativa
     */
    async addToAdminList(newBusiness) {
        try {
            const cacheKey = 'admin:all-businesses';
            let businesses = await cacheService.get(cacheKey);
            
            if (!businesses) {
                businesses = [newBusiness];
            } else {
                // Verificar si ya existe por ID, userId+pending o _tempId
                const exists = businesses.some(b => {
                    if (b.id === newBusiness.id) return true;
                    if (b.userId === newBusiness.userId && b._isPending && newBusiness._isPending) return true;
                    if (b._tempId && b._tempId === newBusiness._tempId) return true;
                    return false;
                });
                
                if (!exists) {
                    businesses = [newBusiness, ...businesses];
                } else {
                    console.log(`⚠️  Emprendimiento ya existe, no se duplicará`);
                }
            }
            
            await cacheService.set(cacheKey, businesses, 300); // 5 minutos
            console.log(`✅ Lista admin actualizada (total: ${businesses.length})`);
        } catch (error) {
            console.error('⚠️  Error agregando a lista admin:', error.message);
        }
    }

    /**
     * Reemplaza emprendimiento temporal por uno persistido
     */
    async replaceInAdminList(tempId, realId, businessData) {
        try {
            const cacheKey = 'admin:all-businesses';
            let businesses = await cacheService.get(cacheKey);
            
            if (businesses) {
                // Verificar que businessData tiene User y Rating
                console.log(`   📦 Evento BUSINESS_PERSISTED recibido para ${realId}:`);
                console.log(`      - User: ${businessData.User ? '✅' : '❌'}`);
                console.log(`      - Rating: ${businessData.Rating ? '✅' : '❌'}`);
                
                // Marcar como sincronizado
                const updatedBusiness = { 
                    ...businessData, 
                    _isPending: false,
                    _syncedAt: new Date().toISOString()
                };
                
                // Buscar el temporal
                const tempIndex = businesses.findIndex(b => 
                    b.id === tempId || 
                    b._tempId === tempId ||
                    (b.userId === businessData.userId && b._isPending)
                );
                
                // Buscar si ya existe con ID real
                const realIndex = businesses.findIndex(b => b.id === realId && !b._isPending);
                
                if (tempIndex !== -1) {
                    if (realIndex !== -1 && realIndex !== tempIndex) {
                        // Duplicado: eliminar temporal
                        businesses.splice(tempIndex, 1);
                        console.log(`🗑️  Duplicado eliminado: ${tempId}`);
                    } else {
                        // Reemplazar temporal
                        businesses[tempIndex] = updatedBusiness;
                        console.log(`🔄 Emprendimiento ${tempId} → ${realId} actualizado en lista`);
                    }
                } else if (realIndex === -1) {
                    // Agregar si no existe
                    businesses = [updatedBusiness, ...businesses];
                    console.log(`➕ Emprendimiento ${realId} agregado a lista admin`);
                }
                
                await cacheService.set(cacheKey, businesses, 300);
            }
        } catch (error) {
            console.error('⚠️  Error reemplazando en lista admin:', error.message);
        }
    }

    /**
     * Invalida cachés administrativos comunes
     */
    async invalidateAdminCaches() {
        try {
            await cacheService.delete('admin:all-businesses');
            await cacheService.delete('admin:statistics');
            await cacheService.delete('admin:all-users');
        } catch (error) {
            console.error('⚠️  Error invalidando cachés administrativos:', error.message);
        }
    }

    /**
     * Invalida todos los cachés administrativos (incluyendo patrones)
     */
    async invalidateAllAdminCaches() {
        try {
            await cacheService.deletePattern('admin:*');
            console.log('🗑️  Todos los cachés administrativos invalidados');
        } catch (error) {
            console.error('⚠️  Error invalidando todos los cachés:', error.message);
        }
    }

    /**
     * Detiene el listener
     */
    async stop() {
        try {
            if (this.subscriber && this.isListening) {
                await this.subscriber.unsubscribe('cache-updates');
                await this.subscriber.quit();
                this.isListening = false;
                console.log('🔕 Listener de eventos de caché detenido');
            }
        } catch (error) {
            console.error('❌ Error al detener listener de caché:', error);
        }
    }

    /**
     * Verifica si el listener está activo
     */
    getStatus() {
        return {
            isListening: this.isListening,
            channel: 'cache-updates'
        };
    }
}

module.exports = new CacheEventListener();
