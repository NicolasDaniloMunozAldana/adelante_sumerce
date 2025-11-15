const sequelize = require('./database');
const logger = require('./logger');

class DatabaseHealthMonitor {
    constructor() {
        this.isHealthy = false;
        this.lastHealthCheck = null;
        this.healthCheckInterval = null;
        this.reconnectInterval = null;
        this.healthCheckIntervalMs = parseInt(process.env.DB_HEALTH_CHECK_INTERVAL) || 10000;
        this.reconnectIntervalMs = parseInt(process.env.DB_RECONNECT_INTERVAL) || 5000;
        this.listeners = [];
    }

    /**
     * Start monitoring database health
     */
    start() {
        logger.info('Starting database health monitor...');
        
        // Initial health check
        this.checkHealth();

        // Periodic health checks
        this.healthCheckInterval = setInterval(() => {
            this.checkHealth();
        }, this.healthCheckIntervalMs);
    }

    /**
     * Stop monitoring
     */
    stop() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
        }
        logger.info('Database health monitor stopped');
    }

    /**
     * Check database health
     */
    async checkHealth() {
        try {
            await sequelize.authenticate();
            
            const wasUnhealthy = !this.isHealthy;
            this.isHealthy = true;
            this.lastHealthCheck = new Date();

            if (wasUnhealthy) {
                logger.info('✅ Database is now HEALTHY - Connection restored');
                this.stopReconnectAttempts();
                this.notifyListeners('healthy');
            }

            return true;
        } catch (error) {
            const wasHealthy = this.isHealthy;
            this.isHealthy = false;
            this.lastHealthCheck = new Date();

            if (wasHealthy) {
                logger.error('❌ Database is now UNHEALTHY - Connection lost');
                this.notifyListeners('unhealthy');
                this.startReconnectAttempts();
            }

            return false;
        }
    }

    /**
     * Start attempting to reconnect
     */
    startReconnectAttempts() {
        if (this.reconnectInterval) {
            return; // Already attempting to reconnect
        }

        logger.info('Starting database reconnection attempts...');
        this.reconnectInterval = setInterval(async () => {
            logger.info('Attempting to reconnect to database...');
            await this.attemptReconnect();
        }, this.reconnectIntervalMs);
    }

    /**
     * Stop reconnection attempts
     */
    stopReconnectAttempts() {
        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
            logger.info('Stopped database reconnection attempts');
        }
    }

    /**
     * Attempt to reconnect to database
     */
    async attemptReconnect() {
        try {
            await sequelize.close();
            await sequelize.authenticate();
            
            this.isHealthy = true;
            this.lastHealthCheck = new Date();
            logger.info('✅ Database reconnection successful');
            this.stopReconnectAttempts();
            this.notifyListeners('healthy');
            
            return true;
        } catch (error) {
            logger.warn('Database reconnection failed, will retry...');
            return false;
        }
    }

    /**
     * Register listener for health status changes
     */
    onHealthChange(callback) {
        this.listeners.push(callback);
    }

    /**
     * Notify all listeners of health status change
     */
    notifyListeners(status) {
        this.listeners.forEach(callback => {
            try {
                callback(status, this.isHealthy);
            } catch (error) {
                logger.error('Error in health change listener:', error);
            }
        });
    }

    /**
     * Get current health status
     */
    getStatus() {
        return {
            isHealthy: this.isHealthy,
            lastHealthCheck: this.lastHealthCheck,
            uptime: process.uptime()
        };
    }
}

module.exports = new DatabaseHealthMonitor();
