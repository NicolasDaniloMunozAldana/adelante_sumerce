const { User } = require('../models');
const cacheService = require('../services/cacheService');

class UserRepository {
  /**
   * Encuentra un usuario por email
   * Primero intenta desde caché, si falla intenta desde BD
   */
  async findByEmail(email) {
    // 1. Buscar siempre en la BD
    let user;
    try {
      user = await User.findOne({ where: { email } });
    } catch (err) {
      console.error("❌ Error consultando la base de datos en findByEmail:", err);
      throw new Error("DATABASE_UNAVAILABLE");
    }

    // 2. Si no existe, devolver null
    if (!user) return null;

    // 3. Cachear al usuario PERO SIN passwordHash
    await cacheService.setUser(user);

    // 4. Devolver el usuario completo (incluye passwordHash solo desde BD)
    return user;
  }

  /**
   * Encuentra un usuario por ID
   * Primero intenta desde caché, si falla intenta desde BD
   */
  async findById(id) {
    try {
      // Intentar obtener desde caché
      const cachedUser = await cacheService.getUserById(id);
      if (cachedUser) {
        console.log('📦 Usuario obtenido desde caché');
        return cachedUser;
      }

      // Si no está en caché, buscar en BD
      let user;
      try {
        user = await User.findByPk(id);
      } catch (err) {
        console.error("❌ Error consultando la base de datos en findById:", err);
        throw new Error("DATABASE_UNAVAILABLE");
      }
      
      // Si se encuentra, guardar en caché
      if (user) {
        await cacheService.setUser(user);
      }
      
      return user;
    } catch (error) {
      console.error('Error finding user by id:', error);
      
      // Si la BD falla, intentar desde caché como fallback
      console.log('⚠️  Base de datos no disponible, intentando caché...');
      const cachedUser = await cacheService.getUserById(id);
      
      if (cachedUser) {
        console.log('✅ Usuario recuperado desde caché (BD caída)');
        return cachedUser;
      }
      
      throw error;
    }
  }

  /**
   * Crea un nuevo usuario
   */
  async create(userData) {
    try {
      const user = await User.create(userData);
      
      // Guardar en caché
      await cacheService.setUser(user);
      
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Actualiza un usuario
   */
  async update(id, userData) {
    try {
      const user = await User.findByPk(id);
      if (!user) {
        return null;
      }
      
      const updatedUser = await user.update(userData);
      
      // Invalidar y actualizar caché
      await cacheService.invalidateUser(id, user.email);
      await cacheService.setUser(updatedUser);
      
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Verifica si un email ya existe
   */
  async emailExists(email) {
    try {
      const user = await User.findOne({ where: { email } });
      return !!user;
    } catch (error) {
      console.error('Error checking email existence:', error);
      throw error;
    }
  }
}

module.exports = new UserRepository();
