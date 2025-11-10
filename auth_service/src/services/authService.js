const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/UserRepository');
const refreshTokenRepository = require('../repositories/RefreshTokenRepository');
const jwtUtils = require('../utils/jwtUtils');
const config = require('../config');
const ApiError = require('../utils/ApiError');

class AuthService {
  /**
   * Autentica a un usuario y genera tokens
   */
  async login(email, password, ipAddress, userAgent) {
    try {
      // Buscar usuario por email
      const user = await userRepository.findByEmail(email);
      if (!user) {
        throw ApiError.unauthorized('Credenciales inválidas');
      }

      // Verificar contraseña
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        throw ApiError.unauthorized('Credenciales inválidas');
      }

      // Generar tokens
      const tokens = await this._generateAuthTokens(user, ipAddress, userAgent);

      return {
        user: this._sanitizeUser(user),
        ...tokens
      };
    } catch (error) {
      console.error('Error in login:', error);
      throw error;
    }
  }

  /**
   * Registra un nuevo usuario
   */
  async register(userData, ipAddress, userAgent) {
    try {
      // Validar que el email no exista
      const emailExists = await userRepository.emailExists(userData.email);
      if (emailExists) {
        throw ApiError.badRequest('El correo electrónico ya está registrado');
      }

      // Validar contraseña
      if (!userData.password || userData.password.length < 8) {
        throw ApiError.badRequest('La contraseña debe tener al menos 8 caracteres');
      }

      if (userData.password !== userData.confirmPassword) {
        throw ApiError.badRequest('Las contraseñas no coinciden');
      }

      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Crear usuario
      const user = await userRepository.create({
        email: userData.email,
        passwordHash: hashedPassword,
        phoneContact: userData.celular,
        firstName: userData.nombres,
        lastName: userData.apellidos,
        role: 'emprendedor' // Por defecto
      });

      // Generar tokens
      const tokens = await this._generateAuthTokens(user, ipAddress, userAgent);

      return {
        user: this._sanitizeUser(user),
        ...tokens
      };
    } catch (error) {
      console.error('Error in register:', error);
      throw error;
    }
  }

  /**
   * Refresca los tokens usando un refresh token
   */
  async refreshTokens(oldRefreshToken, ipAddress, userAgent) {
    try {
      // Verificar el refresh token
      const payload = jwtUtils.verifyRefreshToken(oldRefreshToken);

      // Buscar el refresh token en la base de datos
      const storedToken = await refreshTokenRepository.findByToken(oldRefreshToken);
      if (!storedToken) {
        throw ApiError.unauthorized('Refresh token inválido o expirado');
      }

      // Buscar el usuario
      const user = await userRepository.findById(storedToken.userId);
      if (!user) {
        throw ApiError.unauthorized('Usuario no encontrado');
      }

      // Generar nuevos tokens
      const tokens = await this._generateAuthTokens(user, ipAddress, userAgent);

      // Revocar el token antiguo (sliding session - rotación de tokens)
      await refreshTokenRepository.revoke(oldRefreshToken, tokens.refreshToken);

      return {
        user: this._sanitizeUser(user),
        ...tokens
      };
    } catch (error) {
      console.error('Error in refreshTokens:', error);
      throw error;
    }
  }

  /**
   * Cierra la sesión revocando el refresh token
   */
  async logout(refreshToken) {
    try {
      if (refreshToken) {
        await refreshTokenRepository.revoke(refreshToken);
      }
      return true;
    } catch (error) {
      console.error('Error in logout:', error);
      throw error;
    }
  }

  /**
   * Cierra todas las sesiones de un usuario
   */
  async logoutAll(userId) {
    try {
      await refreshTokenRepository.revokeAllUserTokens(userId);
      return true;
    } catch (error) {
      console.error('Error in logoutAll:', error);
      throw error;
    }
  }

  /**
   * Verifica un access token
   */
  async verifyAccessToken(accessToken) {
    try {
      const payload = jwtUtils.verifyAccessToken(accessToken);
      const user = await userRepository.findById(payload.userId);
      
      if (!user) {
        throw ApiError.unauthorized('Usuario no encontrado');
      }

      return this._sanitizeUser(user);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Genera access token y refresh token
   */
  async _generateAuthTokens(user, ipAddress, userAgent) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    // Generar access token
    const accessToken = jwtUtils.generateAccessToken(payload);

    // Generar refresh token
    const refreshToken = jwtUtils.generateRefreshToken(payload);

    // Guardar refresh token en la base de datos
    const expiresAt = jwtUtils.calculateExpirationDate(config.jwt.refreshExpiration);
    await refreshTokenRepository.create({
      userId: user.id,
      token: refreshToken,
      expiresAt,
      ipAddress,
      userAgent
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: config.jwt.accessExpiration
    };
  }

  /**
   * Sanitiza los datos del usuario (elimina información sensible)
   */
  _sanitizeUser(user) {
    const userData = user.toJSON ? user.toJSON() : user;
    const { passwordHash, ...sanitizedUser } = userData;
    return sanitizedUser;
  }
}

module.exports = new AuthService();
