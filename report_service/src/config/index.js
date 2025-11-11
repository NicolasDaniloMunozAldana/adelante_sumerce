require('dotenv').config();

module.exports = {
    kafka: {
        brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
        clientId: process.env.KAFKA_CLIENT_ID || 'report-service',
        groupId: process.env.KAFKA_GROUP_ID || 'report-service-group',
        topics: {
            generateAdminReport: process.env.TOPIC_GENERATE_ADMIN_REPORT || 'generate-admin-report',
            generateComparativeReport: process.env.TOPIC_GENERATE_COMPARATIVE_REPORT || 'generate-comparative-report',
            generateUserReport: process.env.TOPIC_GENERATE_USER_REPORT || 'generate-user-report',
            reportGenerated: process.env.TOPIC_REPORT_GENERATED || 'report-generated',
            reportFailed: process.env.TOPIC_REPORT_FAILED || 'report-failed'
        }
    },
    email: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    },
    service: {
        name: process.env.SERVICE_NAME || 'report-service',
        logLevel: process.env.LOG_LEVEL || 'info'
    }
};
