const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Business = require('./Business');

class SocialEnvironmentalImpact extends Model {}

SocialEnvironmentalImpact.init({
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
  jobsGenerated: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'empleos_generados'
  },
  hasEnvironmentalContribution: {
    type: DataTypes.BOOLEAN,
    field: 'contribucion_ambiental'
  },
  environmentalStrategies: {
    type: DataTypes.TEXT,
    field: 'estrategias_ambientales'
  },
  hasSocialInnovation: {
    type: DataTypes.BOOLEAN,
    field: 'innovacion_social'
  },
  innovationImplementation: {
    type: DataTypes.TEXT,
    field: 'implementacion_innovacion'
  },
  registrationDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'fecha_registro'
  }
}, {
  sequelize,
  modelName: 'SocialEnvironmentalImpact',
  tableName: 'impacto_social_ambiental',
  timestamps: false
});

SocialEnvironmentalImpact.belongsTo(Business, { foreignKey: 'emprendimiento_id' });

module.exports = SocialEnvironmentalImpact;
