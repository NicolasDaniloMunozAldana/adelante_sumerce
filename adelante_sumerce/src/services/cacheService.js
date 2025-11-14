const { redisClient, isRedisAvailable } = require('../config/redis');

class CacheService {
    constructor() {
        // TTL por defecto: 1 hora (3600 segundos)
        this.DEFAULT_TTL = 3600;
        
        // TTL para datos críticos (datos calientes): 24 horas
        this.CRITICAL_DATA_TTL = 86400;
    }

    /**
     * Genera una clave de caché basada en un prefijo y parámetros
     * @param {string} prefix - Prefijo de la clave
     * @param {Object} params - Parámetros para construir la clave
     * @returns {string} Clave de caché
     */
    generateCacheKey(prefix, params = {}) {
        const paramString = Object.entries(params)
            .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
            .map(([key, value]) => `${key}:${value}`)
            .join(':');
        
        return paramString ? `${prefix}:${paramString}` : prefix;
    }

    /**
     * Obtiene un valor desde Redis
     * @param {string} key - Clave del dato
     * @returns {Promise<any|null>} Dato parseado o null
     */
    async get(key) {
        try {
            if (!isRedisAvailable()) {
                console.warn('⚠️  Redis no disponible para GET:', key);
                return null;
            }

            const data = await redisClient.get(key);
            
            if (!data) {
                console.log(`🔍 Cache MISS: ${key}`);
                return null;
            }

            console.log(`✅ Cache HIT: ${key}`);
            return JSON.parse(data);
        } catch (error) {
            console.error(`❌ Error al obtener desde caché [${key}]:`, error.message);
            return null;
        }
    }

    /**
     * Guarda un valor en Redis
     * @param {string} key - Clave del dato
     * @param {any} value - Valor a guardar
     * @param {number} ttl - Tiempo de vida en segundos (opcional)
     * @returns {Promise<boolean>} true si se guardó correctamente
     */
    async set(key, value, ttl = null) {
        try {
            if (!isRedisAvailable()) {
                console.warn('⚠️  Redis no disponible para SET:', key);
                return false;
            }

            const serializedValue = JSON.stringify(value);
            const expirationTime = ttl || this.DEFAULT_TTL;

            await redisClient.setEx(key, expirationTime, serializedValue);
            
            console.log(`💾 Cache SET: ${key} (TTL: ${expirationTime}s)`);
            return true;
        } catch (error) {
            console.error(`❌ Error al guardar en caché [${key}]:`, error.message);
            return false;
        }
    }

    /**
     * Elimina una clave de Redis
     * @param {string} key - Clave a eliminar
     * @returns {Promise<boolean>} true si se eliminó correctamente
     */
    async delete(key) {
        try {
            if (!isRedisAvailable()) {
                console.warn('⚠️  Redis no disponible para DELETE:', key);
                return false;
            }

            await redisClient.del(key);
            console.log(`🗑️  Cache DELETE: ${key}`);
            return true;
        } catch (error) {
            console.error(`❌ Error al eliminar de caché [${key}]:`, error.message);
            return false;
        }
    }

    /**
     * Elimina múltiples claves que coincidan con un patrón
     * @param {string} pattern - Patrón de búsqueda (ejemplo: "user:*")
     * @returns {Promise<number>} Número de claves eliminadas
     */
    async deletePattern(pattern) {
        try {
            if (!isRedisAvailable()) {
                console.warn('⚠️  Redis no disponible para DELETE PATTERN:', pattern);
                return 0;
            }

            const keys = await redisClient.keys(pattern);
            
            if (keys.length === 0) {
                console.log(`🔍 No se encontraron claves con el patrón: ${pattern}`);
                return 0;
            }

            await redisClient.del(keys);
            console.log(`🗑️  Cache DELETE PATTERN: ${pattern} (${keys.length} claves)`);
            return keys.length;
        } catch (error) {
            console.error(`❌ Error al eliminar patrón de caché [${pattern}]:`, error.message);
            return 0;
        }
    }

    /**
     * Verifica si existe una clave en Redis
     * @param {string} key - Clave a verificar
     * @returns {Promise<boolean>} true si existe
     */
    async exists(key) {
        try {
            if (!isRedisAvailable()) {
                return false;
            }

            const exists = await redisClient.exists(key);
            return exists === 1;
        } catch (error) {
            console.error(`❌ Error al verificar existencia en caché [${key}]:`, error.message);
            return false;
        }
    }

    /**
     * Obtiene el TTL restante de una clave
     * @param {string} key - Clave a consultar
     * @returns {Promise<number>} Segundos restantes o -1 si no existe
     */
    async getTTL(key) {
        try {
            if (!isRedisAvailable()) {
                return -1;
            }

            return await redisClient.ttl(key);
        } catch (error) {
            console.error(`❌ Error al obtener TTL de caché [${key}]:`, error.message);
            return -1;
        }
    }

    /**
     * Wrapper para ejecutar consultas con caché automático
     * @param {string} cacheKey - Clave de caché
     * @param {Function} dbQuery - Función que ejecuta la consulta a la BD
     * @param {number} ttl - Tiempo de vida en segundos (opcional)
     * @returns {Promise<any>} Datos desde caché o BD
     */
    async getOrFetch(cacheKey, dbQuery, ttl = null) {
        try {
            // Intentar obtener desde caché
            const cachedData = await this.get(cacheKey);
            
            if (cachedData !== null) {
                return cachedData;
            }

            // Si no hay datos en caché, consultar la BD
            console.log(`🔄 Consultando BD para: ${cacheKey}`);
            const freshData = await dbQuery();

            // Guardar en caché solo si hay datos
            if (freshData !== null && freshData !== undefined) {
                await this.set(cacheKey, freshData, ttl);
            }

            return freshData;
        } catch (error) {
            console.error(`❌ Error en getOrFetch [${cacheKey}]:`, error.message);
            
            // Si la BD falla, intentar retornar datos antiguos de caché
            const staleData = await this.get(cacheKey);
            if (staleData !== null) {
                console.warn(`⚠️  Retornando datos antiguos de caché debido a error en BD`);
                return staleData;
            }
            
            throw error;
        }
    }

    /**
     * Wrapper especial para datos críticos que sobreviven a fallos de BD
     * Usa un TTL más largo y siempre mantiene una copia en caché
     * @param {string} cacheKey - Clave de caché
     * @param {Function} dbQuery - Función que ejecuta la consulta a la BD
     * @returns {Promise<any>} Datos desde caché o BD
     */
    async getCriticalData(cacheKey, dbQuery) {
        try {
            // Intentar obtener desde caché
            const cachedData = await this.get(cacheKey);
            
            if (cachedData !== null) {
                // Si hay datos en caché, retornarlos inmediatamente
                // pero intentar actualizar en segundo plano
                this.refreshCacheInBackground(cacheKey, dbQuery);
                return cachedData;
            }

            // Si no hay datos en caché, consultar la BD
            console.log(`🔄 Consultando BD para datos críticos: ${cacheKey}`);
            const freshData = await dbQuery();

            // Guardar en caché con TTL extendido
            if (freshData !== null && freshData !== undefined) {
                await this.set(cacheKey, freshData, this.CRITICAL_DATA_TTL);
            }

            return freshData;
        } catch (error) {
            console.error(`❌ Error en getCriticalData [${cacheKey}]:`, error.message);
            
            // FALLBACK CRÍTICO: Intentar retornar datos antiguos de caché
            const staleData = await this.get(cacheKey);
            if (staleData !== null) {
                console.warn(`⚠️  BD CAÍDA - Sirviendo datos antiguos de caché: ${cacheKey}`);
                // Extender el TTL de los datos antiguos
                await this.set(cacheKey, staleData, this.CRITICAL_DATA_TTL);
                return staleData;
            }
            
            // Si no hay ni siquiera datos antiguos, lanzar el error
            throw error;
        }
    }

    /**
     * Refresca la caché en segundo plano sin bloquear la respuesta
     * @param {string} cacheKey - Clave de caché
     * @param {Function} dbQuery - Función que ejecuta la consulta a la BD
     */
    async refreshCacheInBackground(cacheKey, dbQuery) {
        // Ejecutar sin await para no bloquear
        setImmediate(async () => {
            try {
                const freshData = await dbQuery();
                if (freshData !== null && freshData !== undefined) {
                    await this.set(cacheKey, freshData, this.CRITICAL_DATA_TTL);
                    console.log(`🔄 Cache refrescado en segundo plano: ${cacheKey}`);
                }
            } catch (error) {
                console.error(`⚠️  Error al refrescar cache en segundo plano [${cacheKey}]:`, error.message);
                // No lanzar error, ya que es una operación en segundo plano
            }
        });
    }

    /**
     * Invalida el caché relacionado con un usuario específico
     * @param {number} userId - ID del usuario
     * @returns {Promise<number>} Número de claves eliminadas
     */
    async invalidateUserCache(userId) {
        const pattern = `*:userId:${userId}*`;
        return await this.deletePattern(pattern);
    }

    /**
     * Invalida el caché relacionado con un emprendimiento específico
     * @param {number} businessId - ID del emprendimiento
     * @returns {Promise<number>} Número de claves eliminadas
     */
    async invalidateBusinessCache(businessId) {
        const pattern = `*:businessId:${businessId}*`;
        return await this.deletePattern(pattern);
    }

    /**
     * Limpia toda la base de datos de Redis (usar con precaución)
     * @returns {Promise<boolean>} true si se limpió correctamente
     */
    async flushAll() {
        try {
            if (!isRedisAvailable()) {
                console.warn('⚠️  Redis no disponible para FLUSH ALL');
                return false;
            }

            await redisClient.flushDb();
            console.log('🗑️  Cache completamente limpiado (FLUSH ALL)');
            return true;
        } catch (error) {
            console.error('❌ Error al limpiar caché:', error.message);
            return false;
        }
    }
}

module.exports = new CacheService();
