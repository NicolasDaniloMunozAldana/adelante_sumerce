const logger = require('../config/logger');
const redisManager = require('../config/redis');
const models = require('../models');

class OperationProcessor {
    constructor() {
        this.maxRetries = parseInt(process.env.MAX_RETRY_ATTEMPTS) || 5;
        this.retryDelay = parseInt(process.env.RETRY_DELAY_MS) || 5000;
    }

    /**
     * Process a database operation
     */
    async process(operation) {
        const { type, entity, data, metadata } = operation;

        logger.info(`Processing ${type} operation for entity: ${entity}`, {
            operationId: metadata?.operationId,
            userId: metadata?.userId
        });

        try {
            let result;

            switch (type) {
                case 'CREATE':
                    result = await this.handleCreate(entity, data);
                    break;
                case 'UPDATE':
                    result = await this.handleUpdate(entity, data);
                    break;
                case 'DELETE':
                    result = await this.handleDelete(entity, data);
                    break;
                case 'BULK_CREATE':
                    result = await this.handleBulkCreate(entity, data);
                    break;
                case 'BULK_UPDATE':
                    result = await this.handleBulkUpdate(entity, data);
                    break;
                default:
                    throw new Error(`Unknown operation type: ${type}`);
            }

            // Sync with Redis after successful operation
            await this.syncCache(type, entity, data, result);

            logger.info(`✅ Successfully processed ${type} operation for ${entity}`, {
                operationId: metadata?.operationId
            });

            return {
                success: true,
                result,
                operation
            };
        } catch (error) {
            logger.error(`❌ Error processing ${type} operation for ${entity}:`, error);
            throw error;
        }
    }

    /**
     * Handle CREATE operation
     */
    async handleCreate(entity, data) {
        const Model = this.getModel(entity);
        const result = await Model.create(data);
        logger.debug(`Created ${entity} with ID: ${result.id}`);
        return result;
    }

    /**
     * Handle UPDATE operation
     */
    async handleUpdate(entity, data) {
        const Model = this.getModel(entity);
        const { id, ...updateData } = data;

        const [affectedRows] = await Model.update(updateData, {
            where: { id }
        });

        if (affectedRows === 0) {
            logger.warn(`No ${entity} found with ID: ${id} for update`);
        }

        // Fetch updated record
        const updated = await Model.findByPk(id);
        logger.debug(`Updated ${entity} with ID: ${id}`);
        return updated;
    }

    /**
     * Handle DELETE operation
     */
    async handleDelete(entity, data) {
        const Model = this.getModel(entity);
        const { id } = data;

        const deleted = await Model.destroy({
            where: { id }
        });

        if (deleted === 0) {
            logger.warn(`No ${entity} found with ID: ${id} for deletion`);
        }

        logger.debug(`Deleted ${entity} with ID: ${id}`);
        return { deleted, id };
    }

    /**
     * Handle BULK_CREATE operation
     */
    async handleBulkCreate(entity, data) {
        const Model = this.getModel(entity);
        const { records } = data;

        const results = await Model.bulkCreate(records);
        logger.debug(`Bulk created ${results.length} ${entity} records`);
        return results;
    }

    /**
     * Handle BULK_UPDATE operation
     */
    async handleBulkUpdate(entity, data) {
        const Model = this.getModel(entity);
        const { updates } = data;

        const results = [];
        for (const update of updates) {
            const { id, ...updateData } = update;
            await Model.update(updateData, { where: { id } });
            results.push(id);
        }

        logger.debug(`Bulk updated ${results.length} ${entity} records`);
        return results;
    }

    /**
     * Get Sequelize model by entity name
     */
    getModel(entity) {
        const Model = models[entity];
        if (!Model) {
            throw new Error(`Model not found for entity: ${entity}`);
        }
        return Model;
    }

    /**
     * Sync cache after successful database operation
     */
    async syncCache(operationType, entity, data, result) {
        try {
            if (!redisManager.isAvailable()) {
                logger.warn('Redis not available, skipping cache sync');
                return;
            }

            const cacheKey = this.generateCacheKey(entity, data, result);
            
            switch (operationType) {
                case 'CREATE':
                case 'UPDATE':
                    // Update cache with new/updated data
                    await redisManager.updateCache(cacheKey, result, 3600);
                    
                    // Invalidate list caches
                    await redisManager.invalidateCachePattern(`${entity}:list:*`);
                    await redisManager.invalidateCachePattern(`${entity}:user:*`);
                    break;

                case 'DELETE':
                    // Remove from cache
                    await redisManager.invalidateCache(cacheKey);
                    
                    // Invalidate list caches
                    await redisManager.invalidateCachePattern(`${entity}:list:*`);
                    await redisManager.invalidateCachePattern(`${entity}:user:*`);
                    break;

                case 'BULK_CREATE':
                case 'BULK_UPDATE':
                    // Invalidate all related caches
                    await redisManager.invalidateCachePattern(`${entity}:*`);
                    break;
            }

            logger.debug(`Cache synced for ${operationType} on ${entity}`);
        } catch (error) {
            logger.error('Error syncing cache:', error);
            // Don't throw - cache sync failure shouldn't fail the operation
        }
    }

    /**
     * Generate cache key for entity
     */
    generateCacheKey(entity, data, result) {
        const id = result?.id || data?.id;
        return `${entity}:${id}`;
    }

    /**
     * Process operation with retry logic
     */
    async processWithRetry(operation, attempt = 1) {
        try {
            return await this.process(operation);
        } catch (error) {
            if (attempt < this.maxRetries) {
                logger.warn(`Retry attempt ${attempt}/${this.maxRetries} for operation`, {
                    type: operation.type,
                    entity: operation.entity,
                    error: error.message
                });

                // Exponential backoff
                const delay = this.retryDelay * Math.pow(2, attempt - 1);
                await this.sleep(delay);

                return this.processWithRetry(operation, attempt + 1);
            } else {
                logger.error(`Max retries (${this.maxRetries}) reached for operation`, {
                    type: operation.type,
                    entity: operation.entity
                });
                throw error;
            }
        }
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new OperationProcessor();
