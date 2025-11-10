const axios = require('axios');

class AuthServiceClient {
  constructor() {
    this.baseURL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001/api/auth';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Login de usuario
   */
  async login(email, password, ipAddress, userAgent) {
    try {
      const response = await this.client.post('/login', {
        email,
        password
      }, {
        headers: {
          'X-Forwarded-For': ipAddress,
          'User-Agent': userAgent
        }
      });
      return response.data;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Registro de usuario
   */
  async register(userData, ipAddress, userAgent) {
    try {
      const response = await this.client.post('/register', userData, {
        headers: {
          'X-Forwarded-For': ipAddress,
          'User-Agent': userAgent
        }
      });
      return response.data;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Refrescar tokens
   */
  async refreshToken(refreshToken, ipAddress, userAgent) {
    try {
      const response = await this.client.post('/refresh', {
        refreshToken
      }, {
        headers: {
          'X-Forwarded-For': ipAddress,
          'User-Agent': userAgent
        }
      });
      return response.data;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Verificar access token
   */
  async verifyToken(accessToken) {
    try {
      const response = await this.client.get('/verify', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      return response.data;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Logout
   */
  async logout(refreshToken) {
    try {
      const response = await this.client.post('/logout', {
        refreshToken
      });
      return response.data;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Logout de todas las sesiones
   */
  async logoutAll(accessToken) {
    try {
      const response = await this.client.post('/logout-all', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      return response.data;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Obtener información del usuario autenticado
   */
  async getMe(accessToken) {
    try {
      const response = await this.client.get('/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      return response.data;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Maneja errores de las peticiones
   */
  _handleError(error) {
    if (error.response) {
      // El servidor respondió con un código de error
      const errorData = error.response.data;
      const customError = new Error(errorData.message || 'Error en el servicio de autenticación');
      customError.statusCode = error.response.status;
      customError.data = errorData;
      throw customError;
    } else if (error.request) {
      // La petición se hizo pero no hubo respuesta
      const customError = new Error('El servicio de autenticación no está disponible');
      customError.statusCode = 503;
      throw customError;
    } else {
      // Error al configurar la petición
      throw error;
    }
  }
}

module.exports = new AuthServiceClient();
