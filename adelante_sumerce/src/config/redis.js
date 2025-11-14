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

redisClient.on('ready', () => {
    console.log('✅ Redis: Conectado y listo');
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
