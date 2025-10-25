const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

class Business extends Model {}

Business.init({
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
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'nombre_emprendimiento',
    validate: {
      notEmpty: {
        msg: 'El nombre del emprendimiento es requerido'
      }
    }
  },
  creationYear: {
    type: DataTypes.INTEGER,
    field: 'año_creacion'
  },
  economicSector: {
    type: DataTypes.STRING(100),
    field: 'sector_economico'
  },
  managerName: {
    type: DataTypes.STRING(200),
    field: 'nombre_encargado'
  },
  managerContact: {
    type: DataTypes.STRING(20),
    field: 'contacto_encargado'
  },
  managerEmail: {
    type: DataTypes.STRING(255),
    field: 'email_encargado',
    validate: {
      isEmail: {
        msg: 'El correo electrónico del encargado no es válido'
      }
    }
  },
  operationMonths: {
    type: DataTypes.INTEGER,
    field: 'tiempo_operacion_meses'
  },
  registrationDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'fecha_registro'
  }
}, {
  sequelize,
  modelName: 'Business',
  tableName: 'emprendimientos',
  timestamps: false
});

Business.belongsTo(User, { foreignKey: 'usuario_id' });

module.exports = Business;
