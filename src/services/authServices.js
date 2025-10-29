const bcrypt = require('bcryptjs');
const User = require('../models/User');

class AuthService {
  /**
   * Authenticate user
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<User|null>}
   */
  async authenticate(email, password) {
    try {
      const user = await User.findOne({ where: { email } });
      
      if (!user) {
        return null;
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return null;
      }

      return user;
    } catch (error) {
      console.error('Error in authentication:', error);
      throw error;
    }
  }

  /**
   * Register a new user
   * @param {Object} userData 
   * @returns {Promise<User>}
   */
  async register(userData) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ where: { email: userData.email } });
      if (existingUser) {
        throw new Error('El correo electrónico ya está registrado');
      }

      // Validate password
      if (userData.password.length < 8) {
        throw new Error('La contraseña debe tener al menos 8 caracteres');
      }

      if (userData.password !== userData.confirmPassword) {
        throw new Error('Las contraseñas no coinciden');
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await User.create({
        email: userData.email,
        passwordHash: hashedPassword,
        phoneContact: userData.celular,
        firstName: userData.nombres,
        lastName: userData.apellidos
      });

      return user;
    } catch (error) {
      if (error.name === 'SequelizeValidationError') {
        throw new Error(error.errors[0].message);
      }
      throw error;
    }
  }
}

module.exports = new AuthService();
