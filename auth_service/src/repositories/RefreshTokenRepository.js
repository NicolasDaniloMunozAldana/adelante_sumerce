const { RefreshToken } = require('../models');
const { Op } = require('sequelize');

class RefreshTokenRepository {
  /**
   * Crea un nuevo refresh token
   */
  async create(tokenData) {
    try {
      return await RefreshToken.create(tokenData);
    } catch (error) {
      console.error('Error creating refresh token:', error);
      throw error;
    }
  }

  /**
   * Encuentra un refresh token por el token
   */
  async findByToken(token) {
    try {
      return await RefreshToken.findOne({
        where: { 
          token,
          revokedAt: null,
          expiresAt: { [Op.gt]: new Date() }
        }
      });
    } catch (error) {
      console.error('Error finding refresh token:', error);
      throw error;
    }
  }

  /**
   * Revoca un refresh token
   */
  async revoke(token, replacedByToken = null) {
    try {
      const refreshToken = await RefreshToken.findOne({ where: { token } });
      if (!refreshToken) {
        return null;
      }

      return await refreshToken.update({
        revokedAt: new Date(),
        replacedByToken
      });
    } catch (error) {
      console.error('Error revoking refresh token:', error);
      throw error;
    }
  }

  /**
   * Revoca todos los tokens de un usuario
   */
  async revokeAllUserTokens(userId) {
    try {
      return await RefreshToken.update(
        { revokedAt: new Date() },
        { 
          where: { 
            userId,
            revokedAt: null
          }
        }
      );
    } catch (error) {
      console.error('Error revoking all user tokens:', error);
      throw error;
    }
  }

  /**
   * Elimina tokens expirados
   */
  async deleteExpiredTokens() {
    try {
      return await RefreshToken.destroy({
        where: {
          expiresAt: { [Op.lt]: new Date() }
        }
      });
    } catch (error) {
      console.error('Error deleting expired tokens:', error);
      throw error;
    }
  }

  /**
   * Obtiene todos los tokens activos de un usuario
   */
  async findActiveByUserId(userId) {
    try {
      return await RefreshToken.findAll({
        where: {
          userId,
          revokedAt: null,
          expiresAt: { [Op.gt]: new Date() }
        },
        order: [['createdAt', 'DESC']]
      });
    } catch (error) {
      console.error('Error finding active tokens by user:', error);
      throw error;
    }
  }
}

module.exports = new RefreshTokenRepository();
