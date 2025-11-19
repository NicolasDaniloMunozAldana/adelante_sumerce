const client = require('prom-client');

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ 
  register,
  prefix: 'report_service_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
});

// ==================== Kafka Consumer Metrics ====================

const kafkaMessagesConsumed = new client.Counter({
  name: 'report_service_kafka_messages_consumed_total',
  help: 'Total number of Kafka messages consumed',
  labelNames: ['topic', 'status']
});

const kafkaMessageProcessingDuration = new client.Histogram({
  name: 'report_service_kafka_message_processing_duration_seconds',
  help: 'Duration of Kafka message processing in seconds',
  labelNames: ['topic', 'report_type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120]
});

const kafkaConsumerLag = new client.Gauge({
  name: 'report_service_kafka_consumer_lag',
  help: 'Kafka consumer lag (messages behind)',
  labelNames: ['topic', 'partition']
});

const kafkaAvailable = new client.Gauge({
  name: 'report_service_kafka_available',
  help: 'Kafka availability (1 = available, 0 = unavailable)'
});

// ==================== Report Generation Metrics ====================

const reportGenerationTotal = new client.Counter({
  name: 'report_service_report_generation_total',
  help: 'Total number of report generation attempts',
  labelNames: ['type', 'status']
});

const reportGenerationDuration = new client.Histogram({
  name: 'report_service_report_generation_duration_seconds',
  help: 'Duration of report generation in seconds',
  labelNames: ['type'],
  buckets: [0.5, 1, 2, 5, 10, 30, 60, 120]
});

const activeReportGenerations = new client.Gauge({
  name: 'report_service_active_report_generations',
  help: 'Number of reports currently being generated'
});

const reportQueueSize = new client.Gauge({
  name: 'report_service_report_queue_size',
  help: 'Number of reports pending generation',
  labelNames: ['type']
});

// ==================== Email Metrics ====================

const emailsSent = new client.Counter({
  name: 'report_service_emails_sent_total',
  help: 'Total number of emails sent',
  labelNames: ['status']
});

const emailSendDuration = new client.Histogram({
  name: 'report_service_email_send_duration_seconds',
  help: 'Duration of email sending operations',
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
});

const emailErrors = new client.Counter({
  name: 'report_service_email_errors_total',
  help: 'Total number of email sending errors',
  labelNames: ['error_type']
});

// ==================== PDF Generation Metrics ====================

const pdfGenerationTotal = new client.Counter({
  name: 'report_service_pdf_generation_total',
  help: 'Total number of PDF generation attempts',
  labelNames: ['status']
});

const pdfGenerationDuration = new client.Histogram({
  name: 'report_service_pdf_generation_duration_seconds',
  help: 'Duration of PDF generation in seconds',
  buckets: [0.5, 1, 2, 5, 10, 30, 60]
});

// ==================== Excel Generation Metrics ====================

const excelGenerationTotal = new client.Counter({
  name: 'report_service_excel_generation_total',
  help: 'Total number of Excel generation attempts',
  labelNames: ['status']
});

const excelGenerationDuration = new client.Histogram({
  name: 'report_service_excel_generation_duration_seconds',
  help: 'Duration of Excel generation in seconds',
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
});

// ==================== System Metrics ====================

const systemUptime = new client.Gauge({
  name: 'report_service_uptime_seconds',
  help: 'Service uptime in seconds'
});

const applicationErrors = new client.Counter({
  name: 'report_service_errors_total',
  help: 'Total number of application errors',
  labelNames: ['type', 'severity']
});

const serviceHealth = new client.Gauge({
  name: 'report_service_health',
  help: 'Service health status (1 = healthy, 0 = unhealthy)'
});

// ==================== Register all metrics ====================

register.registerMetric(kafkaMessagesConsumed);
register.registerMetric(kafkaMessageProcessingDuration);
register.registerMetric(kafkaConsumerLag);
register.registerMetric(kafkaAvailable);
register.registerMetric(reportGenerationTotal);
register.registerMetric(reportGenerationDuration);
register.registerMetric(activeReportGenerations);
register.registerMetric(reportQueueSize);
register.registerMetric(emailsSent);
register.registerMetric(emailSendDuration);
register.registerMetric(emailErrors);
register.registerMetric(pdfGenerationTotal);
register.registerMetric(pdfGenerationDuration);
register.registerMetric(excelGenerationTotal);
register.registerMetric(excelGenerationDuration);
register.registerMetric(systemUptime);
register.registerMetric(applicationErrors);
register.registerMetric(serviceHealth);

// Update uptime
const startTime = Date.now();
setInterval(() => {
  systemUptime.set((Date.now() - startTime) / 1000);
}, 1000);

// Initialize health as healthy
serviceHealth.set(1);

module.exports = {
  register,
  metrics: {
    kafkaMessagesConsumed,
    kafkaMessageProcessingDuration,
    kafkaConsumerLag,
    kafkaAvailable,
    reportGenerationTotal,
    reportGenerationDuration,
    activeReportGenerations,
    reportQueueSize,
    emailsSent,
    emailSendDuration,
    emailErrors,
    pdfGenerationTotal,
    pdfGenerationDuration,
    excelGenerationTotal,
    excelGenerationDuration,
    systemUptime,
    applicationErrors,
    serviceHealth
  }
};
