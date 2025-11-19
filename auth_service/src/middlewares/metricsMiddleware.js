const { metrics } = require('../monitoring/metrics');

/**
 * Middleware para capturar métricas de peticiones HTTP en Auth Service
 */
const metricsMiddleware = (req, res, next) => {
  metrics.activeConnections.inc();
  const start = Date.now();

  res.on('finish', () => {
    metrics.activeConnections.dec();
    const duration = (Date.now() - start) / 1000;
    const route = normalizeRoute(req.route?.path || req.path);

    metrics.httpRequestsTotal.inc({
      method: req.method,
      route: route,
      status_code: res.statusCode
    });

    metrics.httpRequestDuration.observe(
      {
        method: req.method,
        route: route,
        status_code: res.statusCode
      },
      duration
    );

    // Registrar errores
    if (res.statusCode >= 500) {
      metrics.applicationErrors.inc({
        type: 'http_5xx',
        severity: 'error'
      });
    }

    if (res.statusCode >= 400 && res.statusCode < 500) {
      metrics.applicationErrors.inc({
        type: 'http_4xx',
        severity: 'warning'
      });
    }
  });

  next();
};

function normalizeRoute(path) {
  if (!path) return 'unknown';
  return path
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[a-f0-9]{24}/g, '/:id')
    .replace(/\/[a-f0-9-]{36}/g, '/:uuid');
}

module.exports = metricsMiddleware;
