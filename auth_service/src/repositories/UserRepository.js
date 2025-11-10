const { User } = require('../models');

class UserRepository {
  /**
   * Encuentra un usuario por email
   */
  async findByEmail(email) {
    try {
      return await User.findOne({ where: { email } });
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Encuentra un usuario por ID
   */
  async findById(id) {
    try {
      return await User.findByPk(id);
    } catch (error) {
      console.error('Error finding user by id:', error);
      throw error;
    }
  }

  /**
   * Crea un nuevo usuario
   */
  async create(userData) {
    try {
      return await User.create(userData);
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
      return await user.update(userData);
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
