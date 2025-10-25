const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Business = require('./Business');

class Finance extends Model {}

Finance.init({
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
  monthlyNetSales: {
    type: DataTypes.DECIMAL(15, 2),
    field: 'ventas_netas_mes'
  },
  monthlyProfitability: {
    type: DataTypes.DECIMAL(15, 2),
    field: 'rentabilidad_mensual'
  },
  financingSources: {
    type: DataTypes.TEXT,
    field: 'fuentes_financiamiento'
  },
  monthlyFixedCosts: {
    type: DataTypes.DECIMAL(15, 2),
    field: 'costos_fijos_mensuales'
  },
  registrationDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'fecha_registro'
  }
}, {
  sequelize,
  modelName: 'Finance',
  tableName: 'finanzas',
  timestamps: false
});

Finance.belongsTo(Business, { foreignKey: 'emprendimiento_id' });

module.exports = Finance;
