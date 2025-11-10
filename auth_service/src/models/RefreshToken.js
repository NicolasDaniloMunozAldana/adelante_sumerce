const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RefreshToken = sequelize.define('RefreshToken', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'usuario_id',
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  token: {
    type: DataTypes.STRING(500),
    allowNull: false,
    unique: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expira_en'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'creado_en'
  },
  revokedAt: {
    type: DataTypes.DATE,
    field: 'revocado_en'
  },
  replacedByToken: {
    type: DataTypes.STRING(500),
    field: 'reemplazado_por_token'
  },
  ipAddress: {
    type: DataTypes.STRING(50),
    field: 'ip_address'
  },
  userAgent: {
    type: DataTypes.STRING(500),
    field: 'user_agent'
  }
}, {
  tableName: 'refresh_tokens',
  timestamps: false
});

module.exports = RefreshToken;
