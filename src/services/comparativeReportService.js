const puppeteer = require('puppeteer');
const ExcelJS = require('exceljs');
const { Business, BusinessModel, Finance, WorkTeam, Rating, User } = require('../models');

class ComparativeReportService {
    /**
     * Genera un reporte comparativo de todos los emprendimientos en PDF
     */
    async generateComparativePDF(filters = {}) {
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
            executablePath: '/usr/bin/chromium',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process'
            ]
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

    /**
     * Obtener emprendimientos con filtros
     */
    async fetchBusinesses(filters = {}) {
        const whereClause = {};

        if (filters.classification) {
            // Se aplicará en el filtro de Rating
        }

        if (filters.sector) {
            whereClause.economicSector = filters.sector;
        }

        const businesses = await Business.findAll({
            where: whereClause,
            include: [
                { model: User },
                { model: BusinessModel },
                { model: Finance },
                { model: WorkTeam },
                { model: Rating }
            ],
            order: [['id', 'ASC']]
        });

        // Filtrar por clasificación si se especificó
        if (filters.classification) {
            return businesses.filter(b => b.Rating?.globalClassification === filters.classification);
        }

        return businesses;
    }

    /**
     * Genera el HTML del reporte comparativo
     */
    generateComparativeHTML(businesses) {
        const fecha = new Date().toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Calcular estadísticas generales
        const stats = this.calculateStatistics(businesses);

        return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte Comparativo de Emprendimientos</title>
    <style>
        :root {
            --primary: #0033ff; /* azul del sistema, consistente con reportService */
            --text: #1a2332;
            --muted: #6b7280;
            --border: #e5e7eb;
            --bg: #ffffff;
            --soft: #f8fafc;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', Arial, sans-serif;
            color: var(--text);
            line-height: 1.6;
            background: var(--bg);
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        .page { page-break-after: always; }
        .page:last-child { page-break-after: avoid; }

        /* Portada centrada */
        .cover-page {
            position: relative;
            height: 100vh; /* asegura centrado vertical en PDF */
            background: var(--bg);
            padding: 0 24px;
        }
        .cover-inner {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            text-align: center;
            padding: 40px 0;
        }
        .brand { font-size: 14px; color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 10px; }
        .cover-title { font-size: 32px; font-weight: 700; color: var(--text); letter-spacing: -0.5px; margin-bottom: 10px; }
        .cover-subtitle { font-size: 18px; font-weight: 500; color: var(--primary); }
        .divider { width: 140px; height: 2px; background: var(--primary); opacity: 0.15; margin: 24px auto; border-radius: 2px; }
        .cover-meta { margin-top: 12px; font-size: 13px; color: var(--muted); }
        .cover-stats { 
            margin-top: 30px; 
            display: flex; 
            gap: 40px; 
            justify-content: center; 
        }

        .cover-stat { 
            text-align: center; 
            width: 190px; 
        }

        .cover-stat-value { 
            font-size: 36px; 
            font-weight: 700; 
            color: var(--primary); 
        }

        .cover-stat-label { 
            font-size: 12px; 
            color: var(--muted); 
            text-transform: uppercase; 
            margin-top: 6px; 
            white-space: nowrap;
        }

        /* Encabezado de página */
        .page-wrap { padding: 16px 8px 0; }
        .page-header { border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-bottom: 18px; }
        .page-header h1 { font-size: 20px; font-weight: 700; letter-spacing: -0.2px; color: var(--text); text-align: center; }
        .page-header .subtitle { font-size: 12px; color: var(--muted); margin-top: 4px; text-align: center; }

        /* Secciones */
        .section { margin: 14px 0 18px; }
        .section h2 { font-size: 14px; color: var(--text); font-weight: 600; margin-bottom: 10px; text-align: center; }
        
        /* Grid de métricas */
        .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
        .metric-card { background: #fff; border: 1px solid var(--border); border-radius: 10px; padding: 12px; text-align: center; }
        .metric-label { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
        .metric-value { font-size: 24px; font-weight: 700; color: var(--text); }
        .metric-sub { font-size: 11px; color: var(--muted); margin-top: 2px; }

        /* Tabla */
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .table { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; background: #fff; }
        .table thead th { 
            background: #f9fafb; 
            font-size: 10px; 
            color: var(--muted); 
            text-transform: uppercase; 
            letter-spacing: 0.06em; 
            text-align: center; /* encabezados centrados */
            padding: 10px 8px; 
            font-weight: 700;
            border-bottom: 2px solid var(--border);
        }
        .table tbody td { 
            padding: 10px 8px; 
            border-top: 1px solid var(--border); 
            font-size: 11px; 
            color: var(--text); 
            text-align: center; /* datos centrados */
            vertical-align: middle;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }

        /* Badges */
        .badge { 
            display: inline-block; 
            padding: 4px 10px; 
            border-radius: 999px; 
            font-size: 10px; 
            font-weight: 600;
            white-space: nowrap;
        }
        .badge-idea { background: #f3f4f6; color: #374151; }
        .badge-desarrollo { background: #fff7ed; color: #9a3412; }
        .badge-consolidado { background: #ecfdf5; color: #065f46; }

        /* Progreso mini */
        .mini-progress { 
            width: 100%; 
            height: 6px; 
            background: #f1f5f9; 
            border-radius: 3px; 
            overflow: hidden;
            display: inline-block;
            vertical-align: middle;
        }
        .mini-progress-fill { 
            height: 100%; 
            background: linear-gradient(90deg, var(--primary), #3b82f6); 
            border-radius: 3px;
        }

        /* Pie de página */
        .page-footer { 
            margin-top: 16px; 
            padding-top: 12px; 
            border-top: 1px solid var(--border); 
            text-align: center; 
            color: var(--muted); 
            font-size: 10px; 
        }

        /* Gráficos de distribución */
        .chart-container { margin: 15px 0; }
        .chart-bar { 
            display: flex; 
            align-items: center; 
            margin-bottom: 8px;
            gap: 10px;
        }
        .chart-label { 
            min-width: 140px; 
            font-size: 11px; 
            font-weight: 600; 
            color: var(--text);
            text-align: right; /* etiquetas alineadas a la derecha */
        }
        .chart-track { 
            flex: 1; 
            height: 20px; 
            background: #f1f5f9; 
            border-radius: 10px; 
            overflow: hidden;
            position: relative;
        }
        .chart-fill { 
            height: 100%; 
            background: linear-gradient(90deg, var(--primary), #3b82f6); 
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding-right: 8px;
        }
        .chart-value { 
            font-size: 10px; 
            font-weight: 700; 
            color: white;
            text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
    </style>
</head>
<body>
    <!-- Portada -->
    <div class="page cover-page">
      <div class="cover-inner">
        <div class="brand">Salga Adelante Sumercé</div>
        <div class="cover-title">Reporte Comparativo de Emprendimientos</div>
        <div class="cover-subtitle">Análisis General del Sistema</div>
        <div class="divider"></div>
        
        <div class="cover-stats">
            <div class="cover-stat">
                <div class="cover-stat-value">${businesses.length}</div>
                <div class="cover-stat-label">Emprendimientos</div>
            </div>
            <div class="cover-stat">
                <div class="cover-stat-value">${stats.avgScore.toFixed(1)}</div>
                <div class="cover-stat-label">Puntaje Promedio</div>
            </div>
            <div class="cover-stat">
                <div class="cover-stat-value">${stats.avgPercentage.toFixed(1)}%</div>
                <div class="cover-stat-label">Consolidación Promedio</div>
            </div>
        </div>
        
        <div class="cover-meta">Generado el ${fecha}</div>
      </div>
    </div>

    <!-- Resumen Ejecutivo -->
    <div class="page">
      <div class="page-wrap">
        <div class="page-header">
            <h1>Resumen Ejecutivo</h1>
            <div class="subtitle">Visión general del portafolio de emprendimientos</div>
        </div>

        <div class="section">
            <div class="grid-4">
                <div class="metric-card">
                    <div class="metric-label">Total</div>
                    <div class="metric-value">${businesses.length}</div>
                    <div class="metric-sub">Emprendimientos</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Idea Inicial</div>
                    <div class="metric-value">${stats.byClassification.idea_inicial || 0}</div>
                    <div class="metric-sub">${this.calcPercentage(stats.byClassification.idea_inicial, businesses.length)}%</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">En Desarrollo</div>
                    <div class="metric-value">${stats.byClassification.en_desarrollo || 0}</div>
                    <div class="metric-sub">${this.calcPercentage(stats.byClassification.en_desarrollo, businesses.length)}%</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Consolidado</div>
                    <div class="metric-value">${stats.byClassification.consolidado || 0}</div>
                    <div class="metric-sub">${this.calcPercentage(stats.byClassification.consolidado, businesses.length)}%</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Distribución por Clasificación</h2>
            <div class="chart-container">
                ${this.generateChart('Idea Inicial', stats.byClassification.idea_inicial || 0, businesses.length)}
                ${this.generateChart('En Desarrollo', stats.byClassification.en_desarrollo || 0, businesses.length)}
                ${this.generateChart('Consolidado', stats.byClassification.consolidado || 0, businesses.length)}
            </div>
        </div>

        <div class="section">
            <h2>Distribución por Sector Económico</h2>
            <div class="chart-container">
                ${Object.entries(stats.bySector).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([sector, count]) => 
                    this.generateChart(this.getSectorLabel(sector), count, businesses.length)
                ).join('')}
            </div>
        </div>

        <div class="page-footer">
            <p><strong>Salga Adelante Sumercé</strong> · Sistema de Caracterización</p>
            <p>Reporte generado el ${fecha}</p>
        </div>
      </div>
    </div>

    <!-- Tabla Comparativa Detallada -->
    <div class="page">
      <div class="page-wrap">
        <div class="page-header">
            <h1>Comparativo Detallado de Emprendimientos</h1>
            <div class="subtitle">Análisis individual y métricas clave</div>
        </div>

        <div class="section">
            <div class="table">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Emprendimiento</th>
                            <th>Emprendedor</th>
                            <th>Sector</th>
                            <th>Clasificación</th>
                            <th>Puntaje</th>
                            <th>%</th>
                            <th>Datos</th>
                            <th>Finanzas</th>
                            <th>Equipo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${businesses.map(business => this.generateBusinessRow(business)).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="page-footer">
            <p><strong>Salga Adelante Sumercé</strong> · Sistema de Caracterización · Página 2</p>
        </div>
      </div>
    </div>

    <!-- Análisis de Métricas -->
    <div class="page">
      <div class="page-wrap">
        <div class="page-header">
            <h1>Análisis de Métricas Clave</h1>
            <div class="subtitle">Promedios y distribución por dimensiones</div>
        </div>

        <div class="section">
            <h2>Promedios por Dimensión</h2>
            <div class="grid-4">
                <div class="metric-card">
                    <div class="metric-label">Datos Generales</div>
                    <div class="metric-value">${stats.avgDimensions.generalData.toFixed(1)}</div>
                    <div class="metric-sub">de 3 puntos</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Finanzas</div>
                    <div class="metric-value">${stats.avgDimensions.finance.toFixed(1)}</div>
                    <div class="metric-sub">de 6 puntos</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Equipo</div>
                    <div class="metric-value">${stats.avgDimensions.workTeam.toFixed(1)}</div>
                    <div class="metric-sub">de 4 puntos</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Total</div>
                    <div class="metric-value">${stats.avgScore.toFixed(1)}</div>
                    <div class="metric-sub">de 13 puntos</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Top 10 Emprendimientos por Puntaje</h2>
            <div class="table">
                <table>
                    <thead>
                        <tr>
                            <th>Posición</th>
                            <th>Emprendimiento</th>
                            <th>Emprendedor</th>
                            <th>Clasificación</th>
                            <th>Puntaje Total</th>
                            <th>Porcentaje</th>
                            <th>Progreso</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.generateTopBusinesses(businesses)}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="page-footer">
            <p><strong>Salga Adelante Sumercé</strong> · Sistema de Caracterización · Página 3</p>
        </div>
      </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * Generar fila de negocio en tabla comparativa
     */
    generateBusinessRow(business) {
        const rating = business.Rating || {};
        const user = business.User || {};
        
        const classification = rating.globalClassification || 'N/A';
        const classificationLabel = this.getClassificationLabel(classification);
        const badgeClass = this.getClassificationBadgeClass(classification);
        
        const totalScore = parseInt(rating.totalScore) || 0;
        const percentage = parseFloat(rating.totalPercentage) || 0;
        
        const generalScore = parseInt(rating.generalDataScore) || 0;
        const financeScore = parseInt(rating.financeScore) || 0;
        const workTeamScore = parseInt(rating.workTeamScore) || 0;

        const userName = user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : 'N/A';

        return `
            <tr>
                <td class="text-center">#${business.id}</td>
                <td><strong>${business.name || 'N/A'}</strong></td>
                <td>${userName}</td>
                <td>${this.getSectorLabel(business.economicSector)}</td>
                <td class="text-center">
                    <span class="badge ${badgeClass}">${classificationLabel}</span>
                </td>
                <td class="text-center"><strong>${totalScore}/13</strong></td>
                <td class="text-center">${percentage.toFixed(1)}%</td>
                <td class="text-center">${generalScore}/3</td>
                <td class="text-center">${financeScore}/6</td>
                <td class="text-center">${workTeamScore}/4</td>
            </tr>
        `;
    }

    /**
     * Generar top 10 emprendimientos
     */
    generateTopBusinesses(businesses) {
        const sorted = [...businesses]
            .filter(b => b.Rating)
            .sort((a, b) => {
                const scoreA = parseFloat(a.Rating.totalPercentage) || 0;
                const scoreB = parseFloat(b.Rating.totalPercentage) || 0;
                return scoreB - scoreA;
            })
            .slice(0, 10);

        return sorted.map((business, index) => {
            const rating = business.Rating;
            const user = business.User || {};
            const percentage = parseFloat(rating.totalPercentage) || 0;
            const totalScore = parseInt(rating.totalScore) || 0;
            
            const userName = user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : 'N/A';

            const classification = rating.globalClassification || 'N/A';
            const classificationLabel = this.getClassificationLabel(classification);
            const badgeClass = this.getClassificationBadgeClass(classification);

            return `
                <tr>
                    <td class="text-center"><strong>${index + 1}</strong></td>
                    <td><strong>${business.name}</strong></td>
                    <td>${userName}</td>
                    <td class="text-center">
                        <span class="badge ${badgeClass}">${classificationLabel}</span>
                    </td>
                    <td class="text-center"><strong>${totalScore}/13</strong></td>
                    <td class="text-center"><strong>${percentage.toFixed(1)}%</strong></td>
                    <td>
                        <div class="mini-progress">
                            <div class="mini-progress-fill" style="width: ${Math.max(0, Math.min(100, percentage))}%"></div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Generar barra de gráfico
     */
    generateChart(label, value, total) {
        const percentage = this.calcPercentage(value, total);
        return `
            <div class="chart-bar">
                <div class="chart-label">${label}</div>
                <div class="chart-track">
                    <div class="chart-fill" style="width: ${percentage}%">
                        <span class="chart-value">${value}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Calcular estadísticas generales
     */
    calculateStatistics(businesses) {
        const stats = {
            total: businesses.length,
            byClassification: {},
            bySector: {},
            avgScore: 0,
            avgPercentage: 0,
            avgDimensions: {
                generalData: 0,
                finance: 0,
                workTeam: 0
            }
        };

        let totalScore = 0;
        let totalPercentage = 0;
        let totalGeneralData = 0;
        let totalFinance = 0;
        let totalWorkTeam = 0;

        businesses.forEach(business => {
            // Por clasificación
            const classification = business.Rating?.globalClassification || 'sin_clasificar';
            stats.byClassification[classification] = (stats.byClassification[classification] || 0) + 1;

            // Por sector
            const sector = business.economicSector || 'otro';
            stats.bySector[sector] = (stats.bySector[sector] || 0) + 1;

            // Puntajes
            if (business.Rating) {
                totalScore += parseInt(business.Rating.totalScore) || 0;
                totalPercentage += parseFloat(business.Rating.totalPercentage) || 0;
                totalGeneralData += parseInt(business.Rating.generalDataScore) || 0;
                totalFinance += parseInt(business.Rating.financeScore) || 0;
                totalWorkTeam += parseInt(business.Rating.workTeamScore) || 0;
            }
        });

        if (businesses.length > 0) {
            stats.avgScore = totalScore / businesses.length;
            stats.avgPercentage = totalPercentage / businesses.length;
            stats.avgDimensions.generalData = totalGeneralData / businesses.length;
            stats.avgDimensions.finance = totalFinance / businesses.length;
            stats.avgDimensions.workTeam = totalWorkTeam / businesses.length;
        }

        return stats;
    }

    /**
     * Crear hoja de resumen en Excel
     */
    createSummarySheet(workbook, businesses) {
        const sheet = workbook.addWorksheet('Resumen General');
        
        const stats = this.calculateStatistics(businesses);

        // Título
        sheet.mergeCells('A1:F1');
        const titleCell = sheet.getCell('A1');
        titleCell.value = 'REPORTE COMPARATIVO DE EMPRENDIMIENTOS';
        titleCell.font = { size: 18, bold: true, color: { argb: 'FF667eea' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.getRow(1).height = 30;

        // Fecha
        sheet.mergeCells('A2:F2');
        const dateCell = sheet.getCell('A2');
        dateCell.value = `Generado el ${new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}`;
        dateCell.font = { size: 11, color: { argb: 'FF6b7280' } };
        dateCell.alignment = { horizontal: 'center' };
        sheet.getRow(2).height = 20;

        // Espacio
        sheet.getRow(3).height = 15;

        // Métricas principales
        sheet.mergeCells('A4:F4');
        const metricsTitle = sheet.getCell('A4');
        metricsTitle.value = 'Métricas Principales';
        metricsTitle.font = { size: 14, bold: true };
        metricsTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
        sheet.getRow(4).height = 25;

        const metrics = [
            ['Total de Emprendimientos', businesses.length],
            ['Puntaje Promedio', `${stats.avgScore.toFixed(2)} / 13`],
            ['Porcentaje de Consolidación Promedio', `${stats.avgPercentage.toFixed(2)}%`],
            ['', ''],
            ['Idea Inicial', stats.byClassification.idea_inicial || 0],
            ['En Desarrollo', stats.byClassification.en_desarrollo || 0],
            ['Consolidado', stats.byClassification.consolidado || 0]
        ];

        let row = 5;
        metrics.forEach(([label, value]) => {
            sheet.getCell(`A${row}`).value = label;
            sheet.getCell(`B${row}`).value = value;
            sheet.getCell(`A${row}`).font = { bold: true };
            sheet.getCell(`B${row}`).font = { size: 12 };
            row++;
        });

        // Distribución por sector
        row += 2;
        sheet.mergeCells(`A${row}:F${row}`);
        const sectorTitle = sheet.getCell(`A${row}`);
        sectorTitle.value = 'Distribución por Sector Económico';
        sectorTitle.font = { size: 14, bold: true };
        sectorTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
        row++;

        Object.entries(stats.bySector).sort((a, b) => b[1] - a[1]).forEach(([sector, count]) => {
            sheet.getCell(`A${row}`).value = this.getSectorLabel(sector);
            sheet.getCell(`B${row}`).value = count;
            sheet.getCell(`C${row}`).value = `${this.calcPercentage(count, businesses.length)}%`;
            row++;
        });

        // Ajustar anchos de columna
        sheet.getColumn('A').width = 35;
        sheet.getColumn('B').width = 15;
        sheet.getColumn('C').width = 15;

        // Agregar bordes y alineación
        for (let i = 1; i <= row - 1; i++) {
            for (let j = 1; j <= 6; j++) {
                const cell = sheet.getCell(i, j);
                if (!cell.border) {
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
                    };
                }
            }
        }
    }

    /**
     * Crear hoja de detalle en Excel
     */
    createDetailSheet(workbook, businesses) {
        const sheet = workbook.addWorksheet('Detalle de Emprendimientos');

        // Encabezados
        const headers = ['ID', 'Emprendimiento', 'Emprendedor', 'Email', 'Sector', 'Clasificación', 'Puntaje Total', 'Porcentaje', 'Datos Generales', 'Finanzas', 'Equipo'];
        
        sheet.getRow(1).values = headers;
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF667eea' } };
        sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.getRow(1).height = 25;

        // Datos
        let row = 2;
        businesses.forEach(business => {
            const rating = business.Rating || {};
            const user = business.User || {};

            const percentage = parseFloat(rating.totalPercentage) || 0;

            sheet.getCell(`A${row}`).value = business.id;
            sheet.getCell(`B${row}`).value = business.name || 'N/A';
            sheet.getCell(`C${row}`).value = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'N/A';
            sheet.getCell(`D${row}`).value = user.email || 'N/A';
            sheet.getCell(`E${row}`).value = this.getSectorLabel(business.economicSector);
            sheet.getCell(`F${row}`).value = this.getClassificationLabel(rating.globalClassification);
            sheet.getCell(`G${row}`).value = parseInt(rating.totalScore) || 0;
            sheet.getCell(`H${row}`).value = percentage / 100;
            sheet.getCell(`I${row}`).value = parseInt(rating.generalDataScore) || 0;
            sheet.getCell(`J${row}`).value = parseInt(rating.financeScore) || 0;
            sheet.getCell(`K${row}`).value = parseInt(rating.workTeamScore) || 0;

            // Formato condicional para porcentaje
            const percentageCell = sheet.getCell(`H${row}`);
            percentageCell.numFmt = '0.00%';
            
            if (percentage >= 80) {
                percentageCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
            } else if (percentage >= 60) {
                percentageCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
            } else if (percentage >= 40) {
                percentageCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } };
            } else {
                percentageCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
            }

            row++;
        });

        // Ajustar columnas
        sheet.columns.forEach(column => {
            column.width = 18;
        });
        sheet.getColumn(2).width = 30; // Nombre emprendimiento
        sheet.getColumn(3).width = 25; // Emprendedor
        sheet.getColumn(4).width = 30; // Email

        // Bordes
        const lastRow = row - 1;
        for (let i = 1; i <= lastRow; i++) {
            for (let j = 1; j <= 11; j++) {
                const cell = sheet.getCell(i, j);
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                    left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                    bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                    right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
                };
            }
        }
    }

    /**
     * Crear hoja de métricas en Excel
     */
    createMetricsSheet(workbook, businesses) {
        const sheet = workbook.addWorksheet('Análisis de Métricas');

        const stats = this.calculateStatistics(businesses);

        // Título
        sheet.mergeCells('A1:D1');
        const titleCell = sheet.getCell('A1');
        titleCell.value = 'ANÁLISIS DE MÉTRICAS';
        titleCell.font = { size: 16, bold: true, color: { argb: 'FF667eea' } };
        titleCell.alignment = { horizontal: 'center' };
        sheet.getRow(1).height = 30;

        // Promedios por dimensión
        sheet.getCell('A3').value = 'Dimensión';
        sheet.getCell('B3').value = 'Promedio';
        sheet.getCell('C3').value = 'Máximo';
        sheet.getCell('D3').value = 'Porcentaje';
        
        sheet.getRow(3).font = { bold: true };
        sheet.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };

        const dimensions = [
            ['Datos Generales', stats.avgDimensions.generalData, 3],
            ['Finanzas', stats.avgDimensions.finance, 6],
            ['Equipo de Trabajo', stats.avgDimensions.workTeam, 4],
            ['Total', stats.avgScore, 13]
        ];

        let row = 4;
        dimensions.forEach(([name, avg, max]) => {
            sheet.getCell(`A${row}`).value = name;
            sheet.getCell(`B${row}`).value = parseFloat(avg.toFixed(2));
            sheet.getCell(`C${row}`).value = max;
            sheet.getCell(`D${row}`).value = avg / max;
            sheet.getCell(`D${row}`).numFmt = '0.00%';
            row++;
        });

        // Top 10
        row += 2;
        sheet.mergeCells(`A${row}:D${row}`);
        const topTitle = sheet.getCell(`A${row}`);
        topTitle.value = 'Top 10 Emprendimientos';
        topTitle.font = { size: 14, bold: true };
        topTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
        row++;

        sheet.getCell(`A${row}`).value = 'Posición';
        sheet.getCell(`B${row}`).value = 'Emprendimiento';
        sheet.getCell(`C${row}`).value = 'Puntaje';
        sheet.getCell(`D${row}`).value = 'Porcentaje';
        sheet.getRow(row).font = { bold: true };
        row++;

        const sorted = [...businesses]
            .filter(b => b.Rating)
            .sort((a, b) => {
                const scoreA = parseFloat(a.Rating.totalPercentage) || 0;
                const scoreB = parseFloat(b.Rating.totalPercentage) || 0;
                return scoreB - scoreA;
            })
            .slice(0, 10);

        sorted.forEach((business, index) => {
            sheet.getCell(`A${row}`).value = index + 1;
            sheet.getCell(`B${row}`).value = business.name;
            sheet.getCell(`C${row}`).value = parseInt(business.Rating.totalScore) || 0;
            sheet.getCell(`D${row}`).value = (parseFloat(business.Rating.totalPercentage) || 0) / 100;
            sheet.getCell(`D${row}`).numFmt = '0.00%';
            row++;
        });

        // Ajustar columnas
        sheet.getColumn('A').width = 20;
        sheet.getColumn('B').width = 35;
        sheet.getColumn('C').width = 15;
        sheet.getColumn('D').width = 15;

        // Agregar bordes
        for (let i = 1; i <= row - 1; i++) {
            for (let j = 1; j <= 4; j++) {
                const cell = sheet.getCell(i, j);
                if (!cell.border) {
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
                    };
                }
            }
        }
    }

    /**
     * Crear hoja de análisis por sector
     */
    createSectorAnalysisSheet(workbook, businesses) {
        const sheet = workbook.addWorksheet('Análisis por Sector');

        // Título
        sheet.mergeCells('A1:E1');
        const titleCell = sheet.getCell('A1');
        titleCell.value = 'ANÁLISIS POR SECTOR ECONÓMICO';
        titleCell.font = { size: 16, bold: true, color: { argb: 'FF667eea' } };
        titleCell.alignment = { horizontal: 'center' };
        sheet.getRow(1).height = 30;

        // Encabezados
        sheet.getRow(3).values = ['Sector', 'Cantidad', 'Porcentaje', 'Puntaje Promedio', 'Consolidación Promedio'];
        sheet.getRow(3).font = { bold: true };
        sheet.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };

        // Agrupar por sector
        const bySector = {};
        businesses.forEach(business => {
            const sector = business.economicSector || 'otro';
            if (!bySector[sector]) {
                bySector[sector] = [];
            }
            bySector[sector].push(business);
        });

        let row = 4;
        Object.entries(bySector).sort((a, b) => b[1].length - a[1].length).forEach(([sector, items]) => {
            const avgScore = items.reduce((sum, b) => sum + (parseInt(b.Rating?.totalScore) || 0), 0) / items.length;
            const avgPercentage = items.reduce((sum, b) => sum + (parseFloat(b.Rating?.totalPercentage) || 0), 0) / items.length;

            sheet.getCell(`A${row}`).value = this.getSectorLabel(sector);
            sheet.getCell(`B${row}`).value = items.length;
            sheet.getCell(`C${row}`).value = this.calcPercentage(items.length, businesses.length) / 100;
            sheet.getCell(`C${row}`).numFmt = '0.00%';
            sheet.getCell(`D${row}`).value = parseFloat(avgScore.toFixed(2));
            sheet.getCell(`E${row}`).value = avgPercentage / 100;
            sheet.getCell(`E${row}`).numFmt = '0.00%';
            row++;
        });

        // Ajustar columnas
        sheet.getColumn('A').width = 30;
        sheet.getColumn('B').width = 15;
        sheet.getColumn('C').width = 15;
        sheet.getColumn('D').width = 20;
        sheet.getColumn('E').width = 25;

        // Agregar bordes
        for (let i = 1; i <= row - 1; i++) {
            for (let j = 1; j <= 5; j++) {
                const cell = sheet.getCell(i, j);
                if (!cell.border) {
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
                    };
                }
            }
        }
    }

    /**
     * Helpers
     */
    calcPercentage(value, total) {
        if (total === 0) return 0;
        return parseFloat(((value / total) * 100).toFixed(1));
    }

    getClassificationLabel(classification) {
        const labels = {
            'idea_inicial': 'Idea Inicial',
            'en_desarrollo': 'En Desarrollo',
            'consolidado': 'Consolidado'
        };
        return labels[classification] || 'N/A';
    }

    getClassificationBadgeClass(classification) {
        const classes = {
            'idea_inicial': 'badge-idea',
            'en_desarrollo': 'badge-desarrollo',
            'consolidado': 'badge-consolidado'
        };
        return classes[classification] || '';
    }

    getSectorLabel(sector) {
        const sectors = {
            'agricultura': 'Agricultura',
            'manufactura': 'Manufactura',
            'comercio': 'Comercio',
            'servicios': 'Servicios',
            'tecnologia': 'Tecnología',
            'turismo': 'Turismo',
            'construccion': 'Construcción',
            'otro': 'Otro'
        };
        return sectors[sector] || sector || 'N/A';
    }
}

module.exports = new ComparativeReportService();
