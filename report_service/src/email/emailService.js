const sgMail = require('@sendgrid/mail');
const config = require('../config');
const logger = require('../utils/logger');

class EmailService {
    constructor() {
        this.initializeSendGrid();
    }

    initializeSendGrid() {
        try {
            if (!config.email.sendgridApiKey) {
                throw new Error('SendGrid API Key no está configurada');
            }
            sgMail.setApiKey(config.email.sendgridApiKey);
            logger.info('SendGrid API inicializada correctamente');
        } catch (error) {
            logger.error('Error al inicializar SendGrid:', error);
            throw error;
        }
    }

    /**
     * Verifica la configuración de SendGrid
     */
    async verifyConnection() {
        try {
            // SendGrid no requiere verificación previa, validamos que la API key esté configurada
            if (!config.email.sendgridApiKey) {
                logger.error('SendGrid API Key no configurada');
                return false;
            }
            logger.info('Configuración de SendGrid validada');
            return true;
        } catch (error) {
            logger.error('Error al verificar configuración de SendGrid:', error);
            return false;
        }
    }

    /**
     * Envía un reporte en PDF por correo
     */
    async sendReportEmail(to, subject, pdfBuffer, filename = 'reporte.pdf') {
        try {
            // Asegurar que el buffer esté en base64
            const base64Content = Buffer.isBuffer(pdfBuffer) 
                ? pdfBuffer.toString('base64') 
                : Buffer.from(pdfBuffer).toString('base64');

            const msg = {
                to,
                from: {
                    email: config.email.fromEmail,
                    name: 'Salga Adelante Sumercé'
                },
                replyTo: config.email.replyTo,
                subject,
                html: this.getReportEmailTemplate(subject),
                attachments: [
                    {
                        content: base64Content,
                        filename,
                        type: 'application/pdf',
                        disposition: 'attachment'
                    }
                ]
            };

            const response = await sgMail.send(msg);
            
            logger.info(`✉️  Email enviado exitosamente via SendGrid`, {
                to,
                subject,
                statusCode: response[0].statusCode
            });

            return {
                success: true,
                statusCode: response[0].statusCode
            };
        } catch (error) {
            logger.error(`Error al enviar email a ${to}:`, error.response?.body || error);
            throw error;
        }
    }

    /**
     * Envía un reporte en Excel por correo
     */
    async sendExcelReportEmail(to, subject, excelBuffer, filename = 'reporte.xlsx') {
        try {
            // Asegurar que el buffer esté en base64
            const base64Content = Buffer.isBuffer(excelBuffer) 
                ? excelBuffer.toString('base64') 
                : Buffer.from(excelBuffer).toString('base64');

            const msg = {
                to,
                from: {
                    email: config.email.fromEmail,
                    name: 'Salga Adelante Sumercé'
                },
                replyTo: config.email.replyTo,
                subject,
                html: this.getReportEmailTemplate(subject),
                attachments: [
                    {
                        content: base64Content,
                        filename,
                        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        disposition: 'attachment'
                    }
                ]
            };

            const response = await sgMail.send(msg);
            
            logger.info(`✉️  Email con Excel enviado exitosamente via SendGrid`, {
                to,
                subject,
                statusCode: response[0].statusCode
            });

            return {
                success: true,
                statusCode: response[0].statusCode
            };
        } catch (error) {
            logger.error(`Error al enviar email Excel a ${to}:`, error.response?.body || error);
            throw error;
        }
    }

    /**
     * Envía notificación de error en generación de reporte
     */
    async sendErrorNotification(to, reportType, errorMessage) {
        try {
            const msg = {
                to,
                from: {
                    email: config.email.fromEmail,
                    name: 'Salga Adelante Sumercé'
                },
                replyTo: config.email.replyTo,
                subject: `Error al generar reporte - ${reportType}`,
                html: this.getErrorEmailTemplate(reportType, errorMessage)
            };

            const response = await sgMail.send(msg);
            
            logger.info(`Email de error enviado a ${to} via SendGrid`);

            return {
                success: true,
                statusCode: response[0].statusCode
            };
        } catch (error) {
            logger.error(`Error al enviar email de notificación de error:`, error.response?.body || error);
            throw error;
        }
    }

    /**
     * Plantilla HTML para el email de reporte
     */
    getReportEmailTemplate(reportTitle) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 30px;
                        text-align: center;
                        border-radius: 10px 10px 0 0;
                    }
                    .content {
                        background: #f9f9f9;
                        padding: 30px;
                        border-radius: 0 0 10px 10px;
                    }
                    .button {
                        display: inline-block;
                        padding: 12px 30px;
                        background: #667eea;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin-top: 20px;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        color: #777;
                        font-size: 12px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Salga Adelante Sumercé</h1>
                </div>
                <div class="content">
                    <h2>¡Tu reporte está listo!</h2>
                    <p>Hola,</p>
                    <p>Tu reporte <strong>"${reportTitle}"</strong> ha sido generado exitosamente.</p>
                    <p>Encontrarás el archivo adjunto en este correo electrónico.</p>
                    <p><strong>Detalles del reporte:</strong></p>
                    <ul>
                        <li>Fecha de generación: ${new Date().toLocaleDateString('es-CO')}</li>
                        <li>Hora: ${new Date().toLocaleTimeString('es-CO')}</li>
                    </ul>
                    <p>Si tienes alguna pregunta o necesitas asistencia, no dudes en contactarnos.</p>
                </div>
                <div class="footer">
                    <p>Este es un correo automático, por favor no responder.</p>
                    <p>&copy; ${new Date().getFullYear()} Salga Adelante Sumercé. Todos los derechos reservados.</p>
                </div>
            </body>
            </html>
        `;
    }

    /**
     * Plantilla HTML para notificación de error
     */
    getErrorEmailTemplate(reportType, errorMessage) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .header {
                        background: #e74c3c;
                        color: white;
                        padding: 30px;
                        text-align: center;
                        border-radius: 10px 10px 0 0;
                    }
                    .content {
                        background: #f9f9f9;
                        padding: 30px;
                        border-radius: 0 0 10px 10px;
                    }
                    .error-box {
                        background: #fff3cd;
                        border-left: 4px solid #ffc107;
                        padding: 15px;
                        margin: 20px 0;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        color: #777;
                        font-size: 12px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Error en generación de reporte</h1>
                </div>
                <div class="content">
                    <h2>Hubo un problema al generar tu reporte</h2>
                    <p>Hola,</p>
                    <p>Lamentablemente, ocurrió un error al intentar generar el reporte: <strong>${reportType}</strong></p>
                    <div class="error-box">
                        <strong>Detalles del error:</strong><br>
                        ${errorMessage}
                    </div>
                    <p>Nuestro equipo técnico ha sido notificado y está trabajando para resolver el problema.</p>
                    <p>Por favor, intenta nuevamente en unos momentos.</p>
                </div>
                <div class="footer">
                    <p>Este es un correo automático, por favor no responder.</p>
                    <p>&copy; ${new Date().getFullYear()} Salga Adelante Sumercé. Todos los derechos reservados.</p>
                </div>
            </body>
            </html>
        `;
    }
}

module.exports = new EmailService();
