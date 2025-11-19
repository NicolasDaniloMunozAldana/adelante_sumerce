const client = require('prom-client');

// Create a Registry to register the metrics
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ 
  register,
  prefix: 'adelante_app_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
});

// ==================== HTTP Metrics ====================

// Counter for total HTTP requests
const httpRequestsTotal = new client.Counter({
  name: 'adelante_app_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// Histogram for HTTP request duration
const httpRequestDuration = new client.Histogram({
  name: 'adelante_app_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
});

// Gauge for active connections
const activeConnections = new client.Gauge({
  name: 'adelante_app_active_connections',
  help: 'Number of active HTTP connections'
});

// ==================== Database Metrics ====================

// Counter for database queries
const dbQueriesTotal = new client.Counter({
  name: 'adelante_app_db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table', 'status']
});

// Histogram for database query duration
const dbQueryDuration = new client.Histogram({
  name: 'adelante_app_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

// Gauge for active database connections
const dbActiveConnections = new client.Gauge({
  name: 'adelante_app_db_active_connections',
  help: 'Number of active database connections'
});

// Counter for database connection errors
const dbConnectionErrors = new client.Counter({
  name: 'adelante_app_db_connection_errors_total',
  help: 'Total number of database connection errors'
});

// Gauge for database availability
const dbAvailable = new client.Gauge({
  name: 'adelante_app_db_available',
  help: 'Database availability (1 = available, 0 = unavailable)'
});

// ==================== Redis Metrics ====================

// Counter for Redis operations
const redisOperationsTotal = new client.Counter({
  name: 'adelante_app_redis_operations_total',
  help: 'Total number of Redis operations',
  labelNames: ['operation', 'status']
});

// Histogram for Redis operation duration
const redisOperationDuration = new client.Histogram({
  name: 'adelante_app_redis_operation_duration_seconds',
  help: 'Duration of Redis operations in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
});

// Gauge for Redis cache hit rate
const redisCacheHitRate = new client.Gauge({
  name: 'adelante_app_redis_cache_hit_rate',
  help: 'Redis cache hit rate (percentage)'
});

// Gauge for Redis availability
const redisAvailable = new client.Gauge({
  name: 'adelante_app_redis_available',
  help: 'Redis availability (1 = available, 0 = unavailable)'
});

// ==================== Kafka Metrics ====================

// Counter for Kafka messages produced
const kafkaMessagesProduced = new client.Counter({
  name: 'adelante_app_kafka_messages_produced_total',
  help: 'Total number of Kafka messages produced',
  labelNames: ['topic', 'status']
});

// Counter for Kafka messages consumed
const kafkaMessagesConsumed = new client.Counter({
  name: 'adelante_app_kafka_messages_consumed_total',
  help: 'Total number of Kafka messages consumed',
  labelNames: ['topic', 'status']
});

// Histogram for Kafka message processing duration
const kafkaMessageProcessingDuration = new client.Histogram({
  name: 'adelante_app_kafka_message_processing_duration_seconds',
  help: 'Duration of Kafka message processing in seconds',
  labelNames: ['topic'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30]
});

// Gauge for Kafka queue size (pending messages)
const kafkaQueueSize = new client.Gauge({
  name: 'adelante_app_kafka_queue_size',
  help: 'Number of pending messages in Kafka queue',
  labelNames: ['topic']
});

// Gauge for Kafka availability
const kafkaAvailable = new client.Gauge({
  name: 'adelante_app_kafka_available',
  help: 'Kafka availability (1 = available, 0 = unavailable)'
});

// ==================== Inter-Service Latency Metrics ====================

// Histogram for latency between Main App and Auth Service
const authServiceLatency = new client.Histogram({
  name: 'adelante_app_auth_service_latency_seconds',
  help: 'Latency between Main App and Auth Service',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

// Histogram for latency between Main App and Report Service (via Kafka)
const reportServiceLatency = new client.Histogram({
  name: 'adelante_app_report_service_latency_seconds',
  help: 'Latency between Main App and Report Service via Kafka',
  labelNames: ['operation'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30]
});

// ==================== Business Metrics ====================

// Counter for user logins
const userLogins = new client.Counter({
  name: 'adelante_app_user_logins_total',
  help: 'Total number of user logins',
  labelNames: ['status']
});

// Counter for characterization operations
const characterizationOperations = new client.Counter({
  name: 'adelante_app_characterization_operations_total',
  help: 'Total number of characterization operations',
  labelNames: ['operation', 'status']
});

// Counter for report requests
const reportRequests = new client.Counter({
  name: 'adelante_app_report_requests_total',
  help: 'Total number of report requests',
  labelNames: ['type', 'status']
});

// Histogram for data recovery time after DB failure
const dataRecoveryTime = new client.Histogram({
  name: 'adelante_app_data_recovery_duration_seconds',
  help: 'Time to recover queued writes after database failure',
  buckets: [1, 5, 10, 30, 60, 120, 300, 600]
});

// Counter for queued writes during DB downtime
const queuedWritesDuringDowntime = new client.Counter({
  name: 'adelante_app_queued_writes_during_downtime_total',
  help: 'Total number of writes queued during database downtime'
});

// Gauge for system uptime
const systemUptime = new client.Gauge({
  name: 'adelante_app_uptime_seconds',
  help: 'Application uptime in seconds'
});

// ==================== Error Metrics ====================

// Counter for application errors
const applicationErrors = new client.Counter({
  name: 'adelante_app_errors_total',
  help: 'Total number of application errors',
  labelNames: ['type', 'severity']
});

// ==================== Register all metrics ====================

register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDuration);
register.registerMetric(activeConnections);
register.registerMetric(dbQueriesTotal);
register.registerMetric(dbQueryDuration);
register.registerMetric(dbActiveConnections);
register.registerMetric(dbConnectionErrors);
register.registerMetric(dbAvailable);
register.registerMetric(redisOperationsTotal);
register.registerMetric(redisOperationDuration);
register.registerMetric(redisCacheHitRate);
register.registerMetric(redisAvailable);
register.registerMetric(kafkaMessagesProduced);
register.registerMetric(kafkaMessagesConsumed);
register.registerMetric(kafkaMessageProcessingDuration);
register.registerMetric(kafkaQueueSize);
register.registerMetric(kafkaAvailable);
register.registerMetric(authServiceLatency);
register.registerMetric(reportServiceLatency);
register.registerMetric(userLogins);
register.registerMetric(characterizationOperations);
register.registerMetric(reportRequests);
register.registerMetric(dataRecoveryTime);
register.registerMetric(queuedWritesDuringDowntime);
register.registerMetric(systemUptime);
register.registerMetric(applicationErrors);

// Update uptime every second
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
    dbQueriesTotal,
    dbQueryDuration,
    dbActiveConnections,
    dbConnectionErrors,
    dbAvailable,
    redisOperationsTotal,
    redisOperationDuration,
    redisCacheHitRate,
    redisAvailable,
    kafkaMessagesProduced,
    kafkaMessagesConsumed,
    kafkaMessageProcessingDuration,
    kafkaQueueSize,
    kafkaAvailable,
    authServiceLatency,
    reportServiceLatency,
    userLogins,
    characterizationOperations,
    reportRequests,
    dataRecoveryTime,
    queuedWritesDuringDowntime,
    systemUptime,
    applicationErrors
  }
};
