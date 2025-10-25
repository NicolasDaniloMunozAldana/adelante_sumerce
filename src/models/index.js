const User = require('./User');
const Business = require('./Business');
const BusinessModel = require('./BusinessModel');
const Finance = require('./Finance');
const WorkTeam = require('./WorkTeam');
const SocialEnvironmentalImpact = require('./SocialEnvironmentalImpact');
const Rating = require('./Rating');

// Define relationships
User.hasMany(Business, { foreignKey: 'usuario_id' });
Business.belongsTo(User, { foreignKey: 'usuario_id' });

Business.hasOne(BusinessModel, { foreignKey: 'emprendimiento_id' });
Business.hasOne(Finance, { foreignKey: 'emprendimiento_id' });
Business.hasOne(WorkTeam, { foreignKey: 'emprendimiento_id' });
Business.hasOne(SocialEnvironmentalImpact, { foreignKey: 'emprendimiento_id' });
Business.hasOne(Rating, { foreignKey: 'emprendimiento_id' });

module.exports = {
  User,
  Business,
  BusinessModel,
  Finance,
  WorkTeam,
  SocialEnvironmentalImpact,
  Rating
};
