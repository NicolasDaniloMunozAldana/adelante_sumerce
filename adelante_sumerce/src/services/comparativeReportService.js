const puppeteer = require('puppeteer');
const ExcelJS = require('exceljs');
const { Business, BusinessModel, Finance, WorkTeam, Rating, User } = require('../models');

class ComparativeReportService {
    /**
     * Genera un reporte comparativo de todos los emprendimientos en PDF
     */
    async generateComparativePDF(filters = {}) {
        //Ahora aca solo va a enviar los datos como JSON
        try {
            // Obtener todos los emprendimientos con sus relaciones
            const businesses = await this.fetchBusinesses(filters);

            if (businesses.length === 0) {
                throw new Error('No se encontraron emprendimientos para generar el reporte');
            }

            // Generar HTML del reporte
            const html = this.generateComparativeHTML(businesses);

            // Generar PDF
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });

            const pdf = await page.pdf({
                format: 'A4',
                landscape: true,
                printBackground: true,
                margin: {
                    top: '15mm',
                    right: '15mm',
                    bottom: '15mm',
                    left: '15mm'
                }
            });

            await browser.close();

            return pdf;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Genera un reporte comparativo en Excel
     */
    async generateComparativeExcel(filters = {}) {
        //Ahora aca solo va a envair los datos como JSON
        try {
            const businesses = await this.fetchBusinesses(filters);


            if (businesses.length === 0) {
                throw new Error('No se encontraron emprendimientos para generar el reporte');
            }

            const workbook = new ExcelJS.Workbook();
            
            // Configuración del workbook
            workbook.creator = 'Salga Adelante Sumercé';
            workbook.created = new Date();
            workbook.modified = new Date();


            // Hoja 1: Resumen General
            this.createSummarySheet(workbook, businesses);

            // Hoja 2: Detalle por Emprendimiento
            this.createDetailSheet(workbook, businesses);

            // Hoja 3: Comparativo de Métricas
            this.createMetricsSheet(workbook, businesses);

            // Hoja 4: Análisis por Sector
            this.createSectorAnalysisSheet(workbook, businesses);

            // Generar buffer
            const buffer = await workbook.xlsx.writeBuffer();

            return buffer;

        } catch (error) {
            throw error;
        }
    }

}

module.exports = new ComparativeReportService();
