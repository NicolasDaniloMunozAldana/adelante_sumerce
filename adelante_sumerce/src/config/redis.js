require('dotenv').config();
const { createClient } = require('redis');

// Crear cliente Redis
const redisClient = createClient({
    socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
    },
    database: parseInt(process.env.REDIS_DB || '0')
});

// Manejo de eventos
redisClient.on('error', (err) => {
    console.error('❌ Redis Client Error:', err);
});

redisClient.on('connect', () => {
    console.log('🔄 Redis: Conectando...');
});

redisClient.on('ready', async () => {
    console.log('✅ Redis: Conectado y listo');
    
    // Iniciar precarga de datos críticos en segundo plano
    try {
        // Importar el servicio de precarga DESPUÉS de que Redis esté listo
        const dataPreloadService = require('../services/dataPreloadService');
        
        // Dar un pequeño delay para que los modelos se inicialicen
        setTimeout(async () => {
            try {
                await dataPreloadService.start();
            } catch (error) {
                console.error('❌ Error al iniciar servicio de precarga:', error.message);
                console.warn('⚠️  La aplicación continuará sin precarga automática');
            }
        }, 2000); // 2 segundos de delay
        
    } catch (error) {
        console.error('❌ Error al cargar servicio de precarga:', error.message);
    }
});

redisClient.on('end', () => {
    console.log('⚠️  Redis: Conexión cerrada');
});

// Conectar Redis
const connectRedis = async () => {
    try {
        if (!redisClient.isOpen) {
            await redisClient.connect();
        }
    } catch (error) {
        console.error('❌ Error al conectar Redis:', error);
        throw error;
    }
};

// Desconectar Redis
const disconnectRedis = async () => {
    try {
        // Detener el servicio de precarga antes de desconectar
        try {
            const dataPreloadService = require('../services/dataPreloadService');
            dataPreloadService.stop();
        } catch (error) {
            // Ignorar si el servicio no está disponible
        }
        
        if (redisClient.isOpen) {
            await redisClient.quit();
        }
    } catch (error) {
        console.error('❌ Error al desconectar Redis:', error);
    }
};

// Función para verificar si Redis está disponible
const isRedisAvailable = () => {
    return redisClient.isOpen && redisClient.isReady;
};

module.exports = {
    redisClient,
    connectRedis,
    disconnectRedis,
    isRedisAvailable
};
