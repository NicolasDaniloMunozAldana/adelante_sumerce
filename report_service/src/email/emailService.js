const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../utils/logger');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    initializeTransporter() {
        try {
            this.transporter = nodemailer.createTransport(config.email);
            logger.info('Transporter de email inicializado');
        } catch (error) {
            logger.error('Error al inicializar transporter de email:', error);
            throw error;
        }
    }

    /**
     * Verifica la conexión con el servidor SMTP
     */
    async verifyConnection() {
        try {
            await this.transporter.verify();
            logger.info('Conexión con servidor SMTP verificada');
            return true;
        } catch (error) {
            logger.error('Error al verificar conexión SMTP:', error);
            return false;
        }
    }

    /**
     * Envía un reporte en PDF por correo
     */
    async sendReportEmail(to, subject, pdfBuffer, filename = 'reporte.pdf') {
        try {
            const mailOptions = {
                from: `"Salga Adelante Sumercé" <${config.email.auth.user}>`,
                to,
                subject,
                html: this.getReportEmailTemplate(subject),
                attachments: [
                    {
                        filename,
                        content: pdfBuffer,
                        contentType: 'application/pdf'
                    }
                ]
            };

            const info = await this.transporter.sendMail(mailOptions);
            
            logger.info(`✉️  Email enviado exitosamente`, {
                to,
                subject,
                messageId: info.messageId
            });

            return {
                success: true,
                messageId: info.messageId
            };
        } catch (error) {
            logger.error(`Error al enviar email a ${to}:`, error);
            throw error;
        }
    }

    /**
     * Envía un reporte en Excel por correo
     */
    async sendExcelReportEmail(to, subject, excelBuffer, filename = 'reporte.xlsx') {
        try {
            const mailOptions = {
                from: `"Salga Adelante Sumercé" <${config.email.auth.user}>`,
                to,
                subject,
                html: this.getReportEmailTemplate(subject),
                attachments: [
                    {
                        filename,
                        content: excelBuffer,
                        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    }
                ]
            };

            const info = await this.transporter.sendMail(mailOptions);
            
            logger.info(`✉️  Email con Excel enviado exitosamente`, {
                to,
                subject,
                messageId: info.messageId
            });

            return {
                success: true,
                messageId: info.messageId
            };
        } catch (error) {
            logger.error(`Error al enviar email Excel a ${to}:`, error);
            throw error;
        }
    }

    /**
     * Envía notificación de error en generación de reporte
     */
    async sendErrorNotification(to, reportType, errorMessage) {
        try {
            const mailOptions = {
                from: `"Salga Adelante Sumercé" <${config.email.auth.user}>`,
                to,
                subject: `Error al generar reporte - ${reportType}`,
                html: this.getErrorEmailTemplate(reportType, errorMessage)
            };

            const info = await this.transporter.sendMail(mailOptions);
            
            logger.info(`Email de error enviado a ${to}`);

            return {
                success: true,
                messageId: info.messageId
            };
        } catch (error) {
            logger.error(`Error al enviar email de notificación de error:`, error);
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
