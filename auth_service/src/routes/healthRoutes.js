const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const redisClient = require('../config/redis');

/**
 * @route GET /api/health
 * @desc Health check endpoint with Redis and DB status
 * @access Public
 */
router.get('/health', async (req, res) => {
  const health = {
    success: true,
    message: 'Auth service is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: 'unknown',
      redis: 'unknown'
    }
  };

  // Check database
  try {
    await sequelize.authenticate();
    health.services.database = 'connected';
  } catch (error) {
    health.services.database = 'disconnected';
    health.success = false;
  }

  // Check Redis
  health.services.redis = redisClient.isReady() ? 'connected' : 'disconnected';

  const statusCode = health.success ? 200 : 503;
  res.status(statusCode).json(health);
});

module.exports = router;
