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
  // 🔄 CAMBIO: ahora se usa ENUM para los rangos de ventas
  monthlyNetSales: {
    type: DataTypes.ENUM('menos_1_smmlv', '1_3_smmlv', '3_6_smmlv', 'mas_6_smmlv'),
    field: 'ventas_netas_mes',
    allowNull: true
  },
  // 🔄 CAMBIO: ENUM para los rangos de rentabilidad
  monthlyProfitability: {
    type: DataTypes.ENUM('baja_menos_1_smmlv', 'medio_1_smmlv', 'alta_mas_3_smmlv'),
    field: 'rentabilidad_mensual',
    allowNull: true
  },
  financingSources: {
    type: DataTypes.ENUM('propios', 'credito_bancario', 'inversion_externa', 'otro'),
    field: 'fuentes_financiamiento',
    allowNull: true
  },
  monthlyFixedCosts: {
    type: DataTypes.ENUM('bajo_menos_1_smmlv', 'medio_1_smmlv', 'alto_mas_3_smmlv'),
    field: 'costos_fijos_mensuales',
    allowNull: true
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

// Asociación con emprendimiento
Finance.belongsTo(Business, { foreignKey: 'emprendimiento_id' });

module.exports = Finance;
