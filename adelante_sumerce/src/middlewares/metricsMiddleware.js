const { metrics } = require('../monitoring/metrics');

/**
 * Middleware para capturar métricas de todas las peticiones HTTP
 */
const metricsMiddleware = (req, res, next) => {
  // Incrementar conexiones activas
  metrics.activeConnections.inc();

  // Registrar tiempo de inicio
  const start = Date.now();

  // Capturar cuando la respuesta termina
  res.on('finish', () => {
    // Decrementar conexiones activas
    metrics.activeConnections.dec();

    // Calcular duración
    const duration = (Date.now() - start) / 1000;

    // Normalizar la ruta (quitar IDs dinámicos)
    const route = normalizeRoute(req.route?.path || req.path);

    // Registrar métricas
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

    // Registrar errores 5xx
    if (res.statusCode >= 500) {
      metrics.applicationErrors.inc({
        type: 'http_5xx',
        severity: 'error'
      });
    }

    // Registrar errores 4xx como warnings
    if (res.statusCode >= 400 && res.statusCode < 500) {
      metrics.applicationErrors.inc({
        type: 'http_4xx',
        severity: 'warning'
      });
    }
  });

  next();
};

/**
 * Normaliza rutas para evitar cardinalidad alta en las métricas
 * Ejemplo: /user/123 -> /user/:id
 */
function normalizeRoute(path) {
  if (!path) return 'unknown';

  return path
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[a-f0-9]{24}/g, '/:id') // MongoDB ObjectId
    .replace(/\/[a-f0-9-]{36}/g, '/:uuid'); // UUID
}

module.exports = metricsMiddleware;
