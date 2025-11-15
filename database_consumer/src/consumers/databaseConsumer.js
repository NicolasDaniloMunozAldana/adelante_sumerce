const { Kafka } = require('kafkajs');
const logger = require('../config/logger');
const operationProcessor = require('../services/operationProcessor');
const healthMonitor = require('../config/healthMonitor');

class DatabaseConsumer {
    constructor() {
        this.kafka = new Kafka({
            clientId: process.env.KAFKA_CLIENT_ID || 'database-consumer',
            brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092']
        });

        this.consumer = this.kafka.consumer({
            groupId: process.env.KAFKA_GROUP_ID || 'database-writer-group',
            sessionTimeout: parseInt(process.env.CONSUMER_SESSION_TIMEOUT) || 30000,
            heartbeatInterval: parseInt(process.env.CONSUMER_HEARTBEAT_INTERVAL) || 3000
        });

        this.isRunning = false;
        this.pendingOperations = [];
        this.processingPaused = false;
    }

    /**
     * Start the consumer
     */
    async start() {
        try {
            await this.consumer.connect();
            logger.info('✅ Kafka Consumer connected');

            const topic = process.env.TOPIC_DB_OPERATIONS || 'db-operations-buffer';
            await this.consumer.subscribe({
                topic,
                fromBeginning: false
            });

            logger.info(`📡 Subscribed to topic: ${topic}`);

            // Listen to database health changes
            healthMonitor.onHealthChange((status, isHealthy) => {
                if (status === 'healthy') {
                    logger.info('Database recovered, resuming operation processing');
                    this.processingPaused = false;
                    this.processPendingOperations();
                } else if (status === 'unhealthy') {
                    logger.warn('Database unhealthy, pausing operation processing');
                    this.processingPaused = true;
                }
            });

            await this.consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    await this.handleMessage(topic, partition, message);
                }
            });

            this.isRunning = true;
            logger.info('✅ Kafka Consumer is running');
        } catch (error) {
            logger.error('❌ Error starting Kafka Consumer:', error);
            throw error;
        }
    }

    /**
     * Stop the consumer
     */
    async stop() {
        try {
            this.isRunning = false;
            await this.consumer.disconnect();
            logger.info('Kafka Consumer disconnected');
        } catch (error) {
            logger.error('Error stopping Kafka Consumer:', error);
        }
    }

    /**
     * Handle incoming Kafka message
     */
    async handleMessage(topic, partition, message) {
        try {
            const operation = JSON.parse(message.value.toString());
            
            logger.info(`📩 Received operation from Kafka`, {
                topic,
                partition,
                offset: message.offset,
                type: operation.type,
                entity: operation.entity
            });

            // Check if database is healthy
            if (!healthMonitor.isHealthy || this.processingPaused) {
                logger.warn('Database unhealthy, queueing operation for later processing');
                this.pendingOperations.push(operation);
                return;
            }

            // Process operation immediately if database is healthy
            await this.processOperation(operation);

        } catch (error) {
            logger.error('❌ Error handling Kafka message:', error);
            
            // If it's a parsing error, log and skip
            if (error instanceof SyntaxError) {
                logger.error('Invalid JSON in message, skipping');
                return;
            }

            // For other errors, queue for retry
            try {
                const operation = JSON.parse(message.value.toString());
                this.pendingOperations.push(operation);
            } catch (parseError) {
                logger.error('Failed to parse message for retry queue');
            }
        }
    }

    /**
     * Process a single operation
     */
    async processOperation(operation) {
        try {
            const result = await operationProcessor.processWithRetry(operation);
            
            logger.info(`✅ Operation processed successfully`, {
                type: operation.type,
                entity: operation.entity,
                operationId: operation.metadata?.operationId
            });

            return result;
        } catch (error) {
            logger.error(`❌ Failed to process operation after retries`, {
                type: operation.type,
                entity: operation.entity,
                error: error.message
            });

            // Store in dead letter queue or log for manual intervention
            await this.handleFailedOperation(operation, error);
            throw error;
        }
    }

    /**
     * Process pending operations when database recovers
     */
    async processPendingOperations() {
        if (this.pendingOperations.length === 0) {
            logger.info('No pending operations to process');
            return;
        }

        logger.info(`🔄 Processing ${this.pendingOperations.length} pending operations...`);
        const operations = [...this.pendingOperations];
        this.pendingOperations = [];

        let successCount = 0;
        let failCount = 0;

        for (const operation of operations) {
            try {
                await this.processOperation(operation);
                successCount++;
            } catch (error) {
                failCount++;
                logger.error('Failed to process pending operation:', error);
                // Re-queue failed operation
                this.pendingOperations.push(operation);
            }
        }

        logger.info(`✅ Processed pending operations: ${successCount} succeeded, ${failCount} failed`);

        // If there are still pending operations and database is healthy, retry
        if (this.pendingOperations.length > 0 && healthMonitor.isHealthy) {
            logger.info('Retrying remaining pending operations in 5 seconds...');
            setTimeout(() => this.processPendingOperations(), 5000);
        }
    }

    /**
     * Handle operations that failed after all retries
     */
    async handleFailedOperation(operation, error) {
        const failedOp = {
            operation,
            error: error.message,
            timestamp: new Date().toISOString(),
            stack: error.stack
        };

        // Log to file or dead letter queue
        logger.error('DEAD LETTER QUEUE - Operation failed after all retries:', failedOp);

        // In production, you might want to:
        // 1. Send to a dead letter queue topic
        // 2. Store in a separate database table
        // 3. Send alert/notification
        // 4. Store in a file for manual processing
    }

    /**
     * Get consumer status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            processingPaused: this.processingPaused,
            pendingOperations: this.pendingOperations.length,
            databaseHealthy: healthMonitor.isHealthy
        };
    }
}

module.exports = new DatabaseConsumer();
