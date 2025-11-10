const User = require('./User');
const RefreshToken = require('./RefreshToken');

// Definir relaciones
User.hasMany(RefreshToken, { 
  foreignKey: 'userId',
  as: 'refreshTokens',
  onDelete: 'CASCADE'
});

RefreshToken.belongsTo(User, { 
  foreignKey: 'userId',
  as: 'user'
});

module.exports = {
  User,
  RefreshToken
};
