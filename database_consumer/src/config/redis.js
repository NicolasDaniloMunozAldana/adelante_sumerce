require('dotenv').config();
const { createClient } = require('redis');
const logger = require('./logger');

class RedisManager {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            if (this.isConnected && this.client) {
                return this.client;
            }

            this.client = createClient({
                socket: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT) || 6379
                },
                database: parseInt(process.env.REDIS_DB) || 0
            });

            // Event handlers
            this.client.on('error', (err) => {
                logger.error('Redis Client Error:', err);
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                logger.info('Redis: Connecting...');
            });

            this.client.on('ready', () => {
                logger.info('✅ Redis: Connected and ready');
                this.isConnected = true;
            });

            this.client.on('end', () => {
                logger.warn('⚠️  Redis: Connection closed');
                this.isConnected = false;
            });

            this.client.on('reconnecting', () => {
                logger.info('🔄 Redis: Reconnecting...');
            });

            await this.client.connect();
            return this.client;
        } catch (error) {
            logger.error('❌ Error connecting to Redis:', error);
            this.isConnected = false;
            throw error;
        }
    }

    async disconnect() {
        try {
            if (this.client && this.isConnected) {
                await this.client.quit();
                this.isConnected = false;
                logger.info('Redis: Disconnected');
            }
        } catch (error) {
            logger.error('Error disconnecting from Redis:', error);
        }
    }

    isAvailable() {
        return this.isConnected && this.client && this.client.isReady;
    }

    getClient() {
        if (!this.isAvailable()) {
            throw new Error('Redis client is not available');
        }
        return this.client;
    }

    /**
     * Update cache after successful database write
     */
    async updateCache(key, value, expirationSeconds = 3600) {
        try {
            if (!this.isAvailable()) {
                logger.warn('Redis not available, skipping cache update');
                return false;
            }

            await this.client.setEx(key, expirationSeconds, JSON.stringify(value));
            logger.debug(`Cache updated: ${key}`);
            return true;
        } catch (error) {
            logger.error(`Error updating cache for key ${key}:`, error);
            return false;
        }
    }

    /**
     * Invalidate cache entry
     */
    async invalidateCache(key) {
        try {
            if (!this.isAvailable()) {
                logger.warn('Redis not available, skipping cache invalidation');
                return false;
            }

            await this.client.del(key);
            logger.debug(`Cache invalidated: ${key}`);
            return true;
        } catch (error) {
            logger.error(`Error invalidating cache for key ${key}:`, error);
            return false;
        }
    }

    /**
     * Invalidate cache entries matching pattern
     */
    async invalidateCachePattern(pattern) {
        try {
            if (!this.isAvailable()) {
                logger.warn('Redis not available, skipping cache invalidation');
                return false;
            }

            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(keys);
                logger.debug(`Cache invalidated: ${keys.length} keys matching ${pattern}`);
            }
            return true;
        } catch (error) {
            logger.error(`Error invalidating cache pattern ${pattern}:`, error);
            return false;
        }
    }
}

module.exports = new RedisManager();
