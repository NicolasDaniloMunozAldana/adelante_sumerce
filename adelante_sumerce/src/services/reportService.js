const puppeteer = require('puppeteer');
const { Business, BusinessModel, Finance, WorkTeam, Rating } = require('../models');

class ReportService {
    /**
     * Genera un reporte PDF completo del emprendimiento
     */
    async generateBusinessReport(userId) {
        //Ahora acas solo va a enviar los datos como JSON
        try {
            // Obtener toda la información del emprendimiento
            const business = await Business.findOne({
                where: { userId },
                include: [
                    { model: BusinessModel },
                    { model: Finance },
                    { model: WorkTeam },
                    { model: Rating }
                ],
                order: [['id', 'DESC']]
            });

            if (!business) {
                throw new Error('No se encontró caracterización para este usuario');
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
            console.error('Error generando reporte:', error);
            throw error;
        }
    }
}

module.exports = new ReportService();
