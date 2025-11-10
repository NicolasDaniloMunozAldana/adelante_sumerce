const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');

class JwtUtils {
  /**
   * Genera un access token JWT
   */
  generateAccessToken(payload) {
    return jwt.sign(
      payload,
      config.jwt.accessSecret,
      { 
        expiresIn: config.jwt.accessExpiration,
        issuer: 'auth_service',
        audience: 'adelante_sumerce'
      }
    );
  }

  /**
   * Genera un refresh token JWT
   */
  generateRefreshToken(payload) {
    return jwt.sign(
      payload,
      config.jwt.refreshSecret,
      { 
        expiresIn: config.jwt.refreshExpiration,
        issuer: 'auth_service',
        audience: 'adelante_sumerce'
      }
    );
  }

  /**
   * Verifica un access token
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, config.jwt.accessSecret, {
        issuer: 'auth_service',
        audience: 'adelante_sumerce'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('ACCESS_TOKEN_EXPIRED');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('INVALID_ACCESS_TOKEN');
      }
      throw error;
    }
  }

  /**
   * Verifica un refresh token
   */
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, config.jwt.refreshSecret, {
        issuer: 'auth_service',
        audience: 'adelante_sumerce'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('REFRESH_TOKEN_EXPIRED');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('INVALID_REFRESH_TOKEN');
      }
      throw error;
    }
  }

  /**
   * Decodifica un token sin verificar
   */
  decodeToken(token) {
    return jwt.decode(token);
  }

  /**
   * Calcula la fecha de expiración basada en la duración
   */
  calculateExpirationDate(duration) {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error('Invalid duration format');
    }

    const value = parseInt(match[1]);
    const unit = match[2];
    const now = new Date();

    switch (unit) {
      case 's':
        return new Date(now.getTime() + value * 1000);
      case 'm':
        return new Date(now.getTime() + value * 60 * 1000);
      case 'h':
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case 'd':
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      default:
        throw new Error('Invalid duration unit');
    }
  }

  /**
   * Genera un token aleatorio seguro
   */
  generateRandomToken() {
    return crypto.randomBytes(40).toString('hex');
  }
}

module.exports = new JwtUtils();
