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
            console.log(`📨 Evento de caché recibido: ${event.type}`, event.data);

            switch (event.type) {
                case 'NEW_BUSINESS':
                    // Nuevo emprendimiento creado - invalidar cachés administrativos
                    await this.invalidateAdminCaches();
                    console.log('🔄 Cachés administrativos invalidados por NEW_BUSINESS');
                    break;

                case 'BUSINESS_PERSISTED':
                    // Emprendimiento persistido en BD - refrescar cachés administrativos
                    await this.invalidateAdminCaches();
                    console.log('🔄 Cachés administrativos invalidados por BUSINESS_PERSISTED');
                    break;

                case 'BUSINESS_UPDATED':
                    // Emprendimiento actualizado
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
