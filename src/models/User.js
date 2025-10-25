const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class User extends Model {}

User.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'nombre',
    validate: {
      notEmpty: {
        msg: 'El nombre es requerido'
      }
    }
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'apellido',
    validate: {
      notEmpty: {
        msg: 'El apellido es requerido'
      }
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: {
        msg: 'El correo electrónico no es válido'
      }
    }
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'password_hash'
  },
  phoneContact: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'contacto_celular',
    validate: {
      is: {
        args: /^3[0-9]{9}$/,
        msg: 'El número de celular debe comenzar con 3 y tener 10 dígitos'
      }
    }
  },
  registrationDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'fecha_registro'
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'usuarios',
  timestamps: false
});

module.exports = User;
