const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Business = require('./Business');

class WorkTeam extends Model {}

WorkTeam.init({
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
  businessTrainingLevel: {
    type: DataTypes.ENUM('sin_formacion', 'tecnica_profesional', 'administracion_emprendimiento'),
    field: 'nivel_formacion_empresarial'
  },
  hasTrainedStaff: {
    type: DataTypes.BOOLEAN,
    field: 'personal_capacitado'
  },
  hasDefinedRoles: {
    type: DataTypes.BOOLEAN,
    field: 'roles_definidos'
  },
  employeeCount: {
    type: DataTypes.INTEGER,
    field: 'cantidad_empleados'
  },
  registrationDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'fecha_registro'
  }
}, {
  sequelize,
  modelName: 'WorkTeam',
  tableName: 'equipo_trabajo',
  timestamps: false
});

WorkTeam.belongsTo(Business, { foreignKey: 'emprendimiento_id' });

module.exports = WorkTeam;
