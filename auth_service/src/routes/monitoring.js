const express = require('express');
const { register } = require('../monitoring/metrics');
const { sequelize } = require('../config/database');
const redisClient = require('../config/redis');

const router = express.Router();

/**
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {}
  };

  // Check database
  try {
    await sequelize.authenticate();
    health.services.database = { status: 'up' };
  } catch (error) {
    health.status = 'degraded';
    health.services.database = { 
      status: 'down', 
      error: error.message 
    };
  }

  // Check Redis
  try {
    if (redisClient.isReady()) {
      const client = redisClient.getClient();
      if (client) {
        await client.ping();
        health.services.redis = { status: 'up' };
      } else {
        health.services.redis = { status: 'down', error: 'Client not available' };
      }
    } else {
      health.services.redis = { status: 'down', error: 'Not ready' };
      health.status = 'degraded';
    }
  } catch (error) {
    health.status = 'degraded';
    health.services.redis = { 
      status: 'down', 
      error: error.message 
    };
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * Readiness check endpoint
 */
router.get('/ready', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ 
      status: 'not ready', 
      error: error.message 
    });
  }
});

/**
 * Liveness check endpoint
 */
router.get('/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

/**
 * Prometheus metrics endpoint
 */
router.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
