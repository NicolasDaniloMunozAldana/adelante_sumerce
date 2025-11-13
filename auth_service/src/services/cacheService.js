const redisClient = require('../config/redis');

class CacheService {
  constructor() {
    this.defaultTTL = 3600; // 1 hora por defecto
    this.userTTL = 7200; // 2 horas para usuarios
  }

  /**
   * Genera una clave única para el caché de usuario
   */
  _getUserKey(identifier, type = 'id') {
    return `user:${type}:${identifier}`;
  }

  /**
   * Almacena un usuario en caché (incluyendo datos de autenticación)
   */
  async setUser(user, ttl = this.userTTL) {
    try {
      if (!redisClient.isReady()) {
        console.log('⚠️  Redis no disponible, omitiendo caché');
        return false;
      }

      const client = redisClient.getClient();
      const userData = typeof user.toJSON === 'function' ? user.toJSON() : user;
      
      // Guardar datos completos por ID (incluye passwordHash para validación cuando BD cae)
      await client.setex(
        this._getUserKey(userData.id, 'id'),
        ttl,
        JSON.stringify(userData)
      );

      // Guardar por email para búsquedas rápidas (incluye passwordHash)
      await client.setex(
        this._getUserKey(userData.email, 'email'),
        ttl,
        JSON.stringify(userData)
      );

      console.log(`✅ Usuario ${userData.id} almacenado en caché`);
      return true;
    } catch (error) {
      console.error('Error al guardar en caché:', error.message);
      return false;
    }
  }

  /**
   * Obtiene un usuario por ID desde caché
   */
  async getUserById(userId) {
    try {
      if (!redisClient.isReady()) {
        return null;
      }

      const client = redisClient.getClient();
      const cached = await client.get(this._getUserKey(userId, 'id'));
      
      if (cached) {
        console.log(`✅ Usuario ${userId} encontrado en caché`);
        return JSON.parse(cached);
      }

      return null;
    } catch (error) {
      console.error('Error al leer caché:', error.message);
      return null;
    }
  }

  /**
   * Obtiene un usuario por email desde caché
   */
  async getUserByEmail(email) {
    try {
      if (!redisClient.isReady()) {
        return null;
      }

      const client = redisClient.getClient();
      const cached = await client.get(this._getUserKey(email, 'email'));
      
      if (cached) {
        console.log(`✅ Usuario ${email} encontrado en caché`);
        return JSON.parse(cached);
      }

      return null;
    } catch (error) {
      console.error('Error al leer caché:', error.message);
      return null;
    }
  }

  /**
   * Invalida el caché de un usuario
   */
  async invalidateUser(userId, email = null) {
    try {
      if (!redisClient.isReady()) {
        return false;
      }

      const client = redisClient.getClient();
      const keys = [this._getUserKey(userId, 'id')];
      
      if (email) {
        keys.push(this._getUserKey(email, 'email'));
      }

      await client.del(...keys);
      console.log(`✅ Caché invalidado para usuario ${userId}`);
      return true;
    } catch (error) {
      console.error('Error al invalidar caché:', error.message);
      return false;
    }
  }

  /**
   * Guarda datos genéricos en caché
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      if (!redisClient.isReady()) {
        return false;
      }

      const client = redisClient.getClient();
      const data = typeof value === 'object' ? JSON.stringify(value) : value;
      await client.setex(key, ttl, data);
      return true;
    } catch (error) {
      console.error('Error al guardar en caché:', error.message);
      return false;
    }
  }

  /**
   * Obtiene datos genéricos desde caché
   */
  async get(key, parseJSON = true) {
    try {
      if (!redisClient.isReady()) {
        return null;
      }

      const client = redisClient.getClient();
      const data = await client.get(key);
      
      if (!data) return null;
      
      return parseJSON ? JSON.parse(data) : data;
    } catch (error) {
      console.error('Error al leer caché:', error.message);
      return null;
    }
  }

  /**
   * Elimina una clave del caché
   */
  async delete(key) {
    try {
      if (!redisClient.isReady()) {
        return false;
      }

      const client = redisClient.getClient();
      await client.del(key);
      return true;
    } catch (error) {
      console.error('Error al eliminar del caché:', error.message);
      return false;
    }
  }

  /**
   * Verifica si Redis está disponible
   */
  isAvailable() {
    return redisClient.isReady();
  }
}

module.exports = new CacheService();
