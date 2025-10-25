const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Business = require('./Business');

class BusinessModel extends Model {}

BusinessModel.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  businessId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'emprendimiento_id',
    references: {
      model: 'emprendimientos',
      key: 'id'
    }
  },
  valueProposition: {
    type: DataTypes.TEXT,
    field: 'propuesta_valor'
  },
  customerSegment: {
    type: DataTypes.TEXT,
    field: 'segmento_clientes'
  },
  salesChannels: {
    type: DataTypes.TEXT,
    field: 'canales_venta'
  },
  incomeSources: {
    type: DataTypes.TEXT,
    field: 'fuentes_ingreso'
  },
  registrationDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'fecha_registro'
  }
}, {
  sequelize,
  modelName: 'BusinessModel',
  tableName: 'modelo_negocio',
  timestamps: false
});

BusinessModel.belongsTo(Business, { foreignKey: 'emprendimiento_id' });

module.exports = BusinessModel;
