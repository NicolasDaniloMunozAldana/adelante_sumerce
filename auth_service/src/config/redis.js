const Redis = require('ioredis');
const config = require('./index');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  /**
   * Inicializa la conexión a Redis
   */
  async connect() {
    try {
      this.client = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true
      });

      // Eventos de conexión
      this.client.on('connect', () => {
        console.log('🔄 Conectando a Redis...');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        console.log('✅ Redis conectado y listo');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        console.error('❌ Error de Redis:', err.message);
      });

      this.client.on('close', () => {
        this.isConnected = false;
        console.log('⚠️  Conexión a Redis cerrada');
      });

      this.client.on('reconnecting', () => {
        console.log('🔄 Reconectando a Redis...');
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      console.error('❌ Error al conectar a Redis:', error.message);
      this.isConnected = false;
      // No lanzar error, permitir que la app funcione sin Redis
      return null;
    }
  }

  /**
   * Obtiene el cliente de Redis
   */
  getClient() {
    return this.client;
  }

  /**
   * Verifica si Redis está conectado
   */
  isReady() {
    return this.isConnected && this.client && this.client.status === 'ready';
  }

  /**
   * Cierra la conexión
   */
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
}

// Singleton
const redisClient = new RedisClient();

module.exports = redisClient;
