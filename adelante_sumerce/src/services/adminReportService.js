const puppeteer = require('puppeteer');
const { Business, BusinessModel, Finance, WorkTeam, Rating, User } = require('../models');

class AdminReportService {
    /**
     * Genera un reporte PDF completo del emprendimiento para el administrador
     */
    async generateBusinessReport(businessId) {
        try {
            //Ahora aca solo va a enviar los datos como json
            // Obtener toda la información del emprendimiento
            const business = await Business.findOne({
                where: { id: businessId },
                include: [
                    { model: User, attributes: ['id', 'email', 'firstName', 'lastName', 'phoneContact'] },
                    { model: BusinessModel },
                    { model: Finance },
                    { model: WorkTeam },
                    { model: Rating }
                ]
            });

            if (!business) {
                throw new Error('No se encontró el emprendimiento especificado');
            }

            // Generar HTML del reporte
            const html = this.generateReportHTML(business);

            // Generar PDF
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });

            const pdf = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20mm',
                    right: '15mm',
                    bottom: '20mm',
                    left: '15mm'
                }
            });

            await browser.close();

            return pdf;

        } catch (error) {
            console.error('Error generando reporte para administrador:', error);
            throw error;
        }
    }

}

module.exports = new AdminReportService();
