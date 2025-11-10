const authService = require('../services/authService');
const ApiResponse = require('../utils/ApiResponse');

class AuthController {
  /**
   * Login de usuario
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent') || 'unknown';

      const result = await authService.login(email, password, ipAddress, userAgent);

      return ApiResponse.success(res, result, 'Inicio de sesión exitoso');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Registro de usuario
   */
  async register(req, res, next) {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent') || 'unknown';

      const result = await authService.register(req.body, ipAddress, userAgent);

      return ApiResponse.created(res, result, 'Registro exitoso');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refrescar tokens
   */
  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent') || 'unknown';

      const result = await authService.refreshTokens(refreshToken, ipAddress, userAgent);

      return ApiResponse.success(res, result, 'Tokens actualizados exitosamente');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout
   */
  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      await authService.logout(refreshToken);

      return ApiResponse.success(res, null, 'Sesión cerrada exitosamente');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout de todas las sesiones
   */
  async logoutAll(req, res, next) {
    try {
      const userId = req.user.id; // Del middleware de autenticación
      await authService.logoutAll(userId);

      return ApiResponse.success(res, null, 'Todas las sesiones han sido cerradas');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verifica el access token y devuelve información del usuario
   */
  async verifyToken(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return ApiResponse.error(res, 'Token no proporcionado', 401);
      }

      const token = authHeader.substring(7);
      const user = await authService.verifyAccessToken(token);

      return ApiResponse.success(res, { user }, 'Token válido');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene información del usuario autenticado
   */
  async me(req, res, next) {
    try {
      // req.user viene del middleware de autenticación
      return ApiResponse.success(res, { user: req.user }, 'Usuario autenticado');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
