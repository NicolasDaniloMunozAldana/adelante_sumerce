const client = require('prom-client');

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ 
  register,
  prefix: 'auth_service_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
});

// ==================== HTTP Metrics ====================

const httpRequestsTotal = new client.Counter({
  name: 'auth_service_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestDuration = new client.Histogram({
  name: 'auth_service_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

const activeConnections = new client.Gauge({
  name: 'auth_service_active_connections',
  help: 'Number of active HTTP connections'
});

// ==================== Authentication Metrics ====================

const authAttempts = new client.Counter({
  name: 'auth_service_auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['method', 'status']
});

const authDuration = new client.Histogram({
  name: 'auth_service_auth_duration_seconds',
  help: 'Duration of authentication operations',
  labelNames: ['method'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2]
});

const activeTokens = new client.Gauge({
  name: 'auth_service_active_tokens',
  help: 'Number of active JWT tokens (refresh tokens in DB)'
});

const tokenOperations = new client.Counter({
  name: 'auth_service_token_operations_total',
  help: 'Total number of token operations',
  labelNames: ['operation', 'status']
});

const failedLogins = new client.Counter({
  name: 'auth_service_failed_logins_total',
  help: 'Total number of failed login attempts',
  labelNames: ['reason']
});

// ==================== Database Metrics ====================

const dbQueriesTotal = new client.Counter({
  name: 'auth_service_db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table', 'status']
});

const dbQueryDuration = new client.Histogram({
  name: 'auth_service_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
});

const dbAvailable = new client.Gauge({
  name: 'auth_service_db_available',
  help: 'Database availability (1 = available, 0 = unavailable)'
});

const dbConnectionErrors = new client.Counter({
  name: 'auth_service_db_connection_errors_total',
  help: 'Total number of database connection errors'
});

// ==================== Redis Metrics ====================

const redisOperationsTotal = new client.Counter({
  name: 'auth_service_redis_operations_total',
  help: 'Total number of Redis operations',
  labelNames: ['operation', 'status']
});

const redisOperationDuration = new client.Histogram({
  name: 'auth_service_redis_operation_duration_seconds',
  help: 'Duration of Redis operations in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
});

const redisAvailable = new client.Gauge({
  name: 'auth_service_redis_available',
  help: 'Redis availability (1 = available, 0 = unavailable)'
});

const redisCacheHitRate = new client.Gauge({
  name: 'auth_service_redis_cache_hit_rate',
  help: 'Redis cache hit rate (percentage)'
});

// ==================== Rate Limiting Metrics ====================

const rateLimitHits = new client.Counter({
  name: 'auth_service_rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['endpoint']
});

// ==================== System Metrics ====================

const systemUptime = new client.Gauge({
  name: 'auth_service_uptime_seconds',
  help: 'Service uptime in seconds'
});

const applicationErrors = new client.Counter({
  name: 'auth_service_errors_total',
  help: 'Total number of application errors',
  labelNames: ['type', 'severity']
});

// ==================== Register all metrics ====================

register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDuration);
register.registerMetric(activeConnections);
register.registerMetric(authAttempts);
register.registerMetric(authDuration);
register.registerMetric(activeTokens);
register.registerMetric(tokenOperations);
register.registerMetric(failedLogins);
register.registerMetric(dbQueriesTotal);
register.registerMetric(dbQueryDuration);
register.registerMetric(dbAvailable);
register.registerMetric(dbConnectionErrors);
register.registerMetric(redisOperationsTotal);
register.registerMetric(redisOperationDuration);
register.registerMetric(redisAvailable);
register.registerMetric(redisCacheHitRate);
register.registerMetric(rateLimitHits);
register.registerMetric(systemUptime);
register.registerMetric(applicationErrors);

// Update uptime
const startTime = Date.now();
setInterval(() => {
  systemUptime.set((Date.now() - startTime) / 1000);
}, 1000);

module.exports = {
  register,
  metrics: {
    httpRequestsTotal,
    httpRequestDuration,
    activeConnections,
    authAttempts,
    authDuration,
    activeTokens,
    tokenOperations,
    failedLogins,
    dbQueriesTotal,
    dbQueryDuration,
    dbAvailable,
    dbConnectionErrors,
    redisOperationsTotal,
    redisOperationDuration,
    redisAvailable,
    redisCacheHitRate,
    rateLimitHits,
    systemUptime,
    applicationErrors
  }
};
