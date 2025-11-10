const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'password_hash'
  },
  phoneContact: {
    type: DataTypes.STRING(20),
    field: 'contacto_celular'
  },
  registrationDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'fecha_registro'
  },
  firstName: {
    type: DataTypes.STRING(100),
    field: 'nombre'
  },
  lastName: {
    type: DataTypes.STRING(100),
    field: 'apellido'
  },
  role: {
    type: DataTypes.ENUM('emprendedor', 'administrador'),
    defaultValue: 'emprendedor',
    field: 'rol'
  }
}, {
  tableName: 'usuarios',
  timestamps: false
});

module.exports = User;
