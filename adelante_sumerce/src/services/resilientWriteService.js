const kafkaProducer = require('../kafka/kafkaProducer');
const { redisClient, isRedisAvailable } = require('../config/redis');
const sequelize = require('../config/database');
const logger = require('../utils/logger');

/**
 * Resilient Write Service
 * Handles database writes with fault tolerance
 * Routes to Kafka when database is unavailable
 */
class ResilientWriteService {
    constructor() {
        this.dbHealthy = true;
        this.lastHealthCheck = null;
        this.healthCheckInterval = null;
        this.TOPIC_DB_OPERATIONS = process.env.TOPIC_DB_OPERATIONS || 'db-operations-buffer';
    }

    /**
     * Initialize the service and start health monitoring
     */
    async initialize() {
        await this.checkDatabaseHealth();
        this.startHealthMonitoring();
    }

    /**
     * Start periodic database health checks
     */
    startHealthMonitoring() {
        // Check database health every 10 seconds
        this.healthCheckInterval = setInterval(async () => {
            await this.checkDatabaseHealth();
        }, 10000);
    }

    /**
     * Stop health monitoring
     */
    stopHealthMonitoring() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
    }

    /**
     * Check if database is healthy
     */
    async checkDatabaseHealth() {
        try {
            await sequelize.authenticate();
            const wasUnhealthy = !this.dbHealthy;
            this.dbHealthy = true;
            this.lastHealthCheck = new Date();

            if (wasUnhealthy) {
                console.log('✅ Database connection restored');
            }

            return true;
        } catch (error) {
            const wasHealthy = this.dbHealthy;
            this.dbHealthy = false;
            this.lastHealthCheck = new Date();

            if (wasHealthy) {
                console.error('❌ Database connection lost - switching to resilient mode');
            }

            return false;
        }
    }

    /**
     * Execute a write operation with fault tolerance
     * @param {string} entity - Entity name (e.g., 'Business', 'User')
     * @param {string} operationType - Type of operation ('CREATE', 'UPDATE', 'DELETE')
     * @param {Object} data - Data for the operation
     * @param {Object} metadata - Additional metadata (userId, operationId, etc.)
     * @returns {Object} Result with success status and data
     */
    async executeWrite(entity, operationType, data, metadata = {}) {
        const operation = {
            type: operationType,
            entity,
            data,
            metadata: {
                ...metadata,
                operationId: this.generateOperationId(),
                timestamp: Date.now(),
                source: 'adelante-sumerce'
            }
        };

        // Try database first if healthy
        if (this.dbHealthy) {
            try {
                const result = await this.writeToDatabase(entity, operationType, data);
                
                // Update cache on successful write
                await this.updateCache(entity, operationType, data, result);

                return {
                    success: true,
                    mode: 'direct',
                    data: result
                };
            } catch (error) {
                console.error('Database write failed, falling back to Kafka:', error);
                this.dbHealthy = false;
                // Fall through to Kafka
            }
        }

        // Database is down - use Kafka + Redis
        return await this.writeToKafkaAndCache(operation);
    }

    /**
     * Write directly to database
     */
    async writeToDatabase(entity, operationType, data) {
        const models = require('../models');
        const Model = models[entity];

        if (!Model) {
            throw new Error(`Model not found for entity: ${entity}`);
        }

        switch (operationType) {
            case 'CREATE':
                return await Model.create(data);
            
            case 'UPDATE':
                const { id, ...updateData } = data;
                await Model.update(updateData, { where: { id } });
                return await Model.findByPk(id);
            
            case 'DELETE':
                const { id: deleteId } = data;
                await Model.destroy({ where: { id: deleteId } });
                return { deleted: true, id: deleteId };
            
            case 'BULK_CREATE':
                return await Model.bulkCreate(data.records);
            
            default:
                throw new Error(`Unknown operation type: ${operationType}`);
        }
    }

    /**
     * Write to Kafka and update cache
     */
    async writeToKafkaAndCache(operation) {
        try {
            // 1. Send to Kafka for eventual consistency
            await kafkaProducer.sendEvent(this.TOPIC_DB_OPERATIONS, operation);

            // 2. Update Redis cache immediately for read consistency
            await this.updateCacheFromOperation(operation);

            console.log(`📨 Operation queued in Kafka (resilient mode): ${operation.type} ${operation.entity}`);

            return {
                success: true,
                mode: 'resilient',
                queued: true,
                operationId: operation.metadata.operationId,
                message: 'Operation queued for processing when database is available'
            };
        } catch (error) {
            console.error('Failed to queue operation:', error);
            throw new Error('Unable to process write operation - both database and Kafka unavailable');
        }
    }

    /**
     * Update cache after successful database write
     */
    async updateCache(entity, operationType, data, result) {
        if (!isRedisAvailable()) {
            return;
        }

        try {
            const cacheKey = this.generateCacheKey(entity, data, result);

            switch (operationType) {
                case 'CREATE':
                case 'UPDATE':
                    // Store the result in cache
                    await redisClient.setEx(cacheKey, 3600, JSON.stringify(result));
                    
                    // Invalidate list caches
                    await this.invalidateListCaches(entity);
                    break;

                case 'DELETE':
                    // Remove from cache
                    await redisClient.del(cacheKey);
                    
                    // Invalidate list caches
                    await this.invalidateListCaches(entity);
                    break;
            }
        } catch (error) {
            console.error('Cache update failed:', error);
            // Don't throw - cache failure shouldn't fail the operation
        }
    }

    /**
     * Update cache from operation (when database is down)
     */
    async updateCacheFromOperation(operation) {
        if (!isRedisAvailable()) {
            return;
        }

        try {
            const { entity, type, data } = operation;
            const cacheKey = this.generateCacheKey(entity, data, data);

            switch (type) {
                case 'CREATE':
                case 'UPDATE':
                    // Store optimistic data in cache
                    await redisClient.setEx(cacheKey, 3600, JSON.stringify(data));
                    
                    // Mark as pending in cache
                    await redisClient.setEx(
                        `${cacheKey}:pending`,
                        3600,
                        JSON.stringify({ operationId: operation.metadata.operationId })
                    );
                    break;

                case 'DELETE':
                    // Mark as deleted in cache
                    await redisClient.del(cacheKey);
                    break;
            }

            // Invalidate list caches
            await this.invalidateListCaches(entity);
        } catch (error) {
            console.error('Cache update from operation failed:', error);
        }
    }

    /**
     * Invalidate list caches for an entity
     */
    async invalidateListCaches(entity) {
        if (!isRedisAvailable()) {
            return;
        }

        try {
            const patterns = [
                `${entity}:list:*`,
                `${entity}:user:*`,
                `${entity}:all`
            ];

            for (const pattern of patterns) {
                const keys = await redisClient.keys(pattern);
                if (keys.length > 0) {
                    await redisClient.del(keys);
                }
            }
        } catch (error) {
            console.error('Failed to invalidate list caches:', error);
        }
    }

    /**
     * Generate cache key
     */
    generateCacheKey(entity, data, result) {
        const id = result?.id || data?.id;
        return `${entity}:${id}`;
    }

    /**
     * Generate unique operation ID
     */
    generateOperationId() {
        return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get service status
     */
    getStatus() {
        return {
            databaseHealthy: this.dbHealthy,
            lastHealthCheck: this.lastHealthCheck,
            redisAvailable: isRedisAvailable()
        };
    }
}

module.exports = new ResilientWriteService();
