require('dotenv').config();
const logger = require('./src/config/logger');
const redisManager = require('./src/config/redis');
const healthMonitor = require('./src/config/healthMonitor');
const databaseConsumer = require('./src/consumers/databaseConsumer');
const sequelize = require('./src/config/database');

/**
 * Database Consumer Worker
 * Pure Node.js service for processing database operations from Kafka
 * Provides fault tolerance and automatic recovery
 */
class DatabaseConsumerWorker {
    constructor() {
        this.isShuttingDown = false;
    }

    async start() {
        try {
            logger.info('🚀 Starting Database Consumer Worker...');
            logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

            // 1. Connect to Redis
            logger.info('Connecting to Redis...');
            await redisManager.connect();

            // 2. Test database connection
            logger.info('Testing database connection...');
            try {
                await sequelize.authenticate();
                logger.info('✅ Database connection established');
            } catch (error) {
                logger.warn('⚠️  Database connection failed, will retry automatically');
            }

            // 3. Start database health monitoring
            logger.info('Starting database health monitor...');
            healthMonitor.start();

            // 4. Start Kafka consumer
            logger.info('Starting Kafka consumer...');
            await databaseConsumer.start();

            logger.info('✅ Database Consumer Worker is ready!');
            logger.info('Waiting for operations from Kafka...');

            // Log status periodically
            this.startStatusLogger();

        } catch (error) {
            logger.error('❌ Failed to start Database Consumer Worker:', error);
            await this.shutdown();
            process.exit(1);
        }
    }

    startStatusLogger() {
        setInterval(() => {
            const status = {
                consumer: databaseConsumer.getStatus(),
                database: healthMonitor.getStatus(),
                redis: redisManager.isAvailable()
            };

            logger.info('📊 Worker Status:', status);
        }, 60000); // Log every minute
    }

    async shutdown() {
        if (this.isShuttingDown) {
            return;
        }

        this.isShuttingDown = true;
        logger.info('🛑 Shutting down Database Consumer Worker...');

        try {
            // Stop health monitor
            healthMonitor.stop();

            // Stop Kafka consumer
            await databaseConsumer.stop();

            // Close database connection
            await sequelize.close();
            logger.info('Database connection closed');

            // Disconnect Redis
            await redisManager.disconnect();

            logger.info('✅ Database Consumer Worker shut down gracefully');
            process.exit(0);
        } catch (error) {
            logger.error('Error during shutdown:', error);
            process.exit(1);
        }
    }
}

// Create worker instance
const worker = new DatabaseConsumerWorker();

// Handle graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Received SIGINT signal');
    await worker.shutdown();
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM signal');
    await worker.shutdown();
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    worker.shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the worker
worker.start();
