const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Business = require('./Business');

class Rating extends Model {}

Rating.init({
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
  generalDataScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'puntaje_datos_generales'
  },
  businessModelScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'puntaje_modelo_negocio'
  },
  financeScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'puntaje_finanzas'
  },
  workTeamScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'puntaje_equipo_trabajo'
  },
  socialImpactScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'puntaje_impacto_social'
  },
  totalScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'puntaje_total'
  },
  totalPercentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    field: 'porcentaje_total'
  },
  globalClassification: {
    type: DataTypes.ENUM('idea_inicial', 'en_desarrollo', 'consolidado'),
    field: 'clasificacion_global'
  },
  calculationDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'fecha_calculo'
  }
}, {
  sequelize,
  modelName: 'Rating',
  tableName: 'calificaciones',
  timestamps: false
});

Rating.belongsTo(Business, { foreignKey: 'emprendimiento_id' });

module.exports = Rating;
