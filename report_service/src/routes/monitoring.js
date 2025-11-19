const express = require('express');
const { register, metrics } = require('../monitoring/metrics');

const router = express.Router();

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      kafka: metrics.kafkaAvailable ? 'up' : 'down'
    }
  };

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * Readiness check endpoint
 */
router.get('/ready', (req, res) => {
  res.status(200).json({ status: 'ready' });
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
    const metricsData = await register.metrics();
    res.end(metricsData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
