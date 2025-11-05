const puppeteer = require('puppeteer');
const { Business, BusinessModel, Finance, WorkTeam, Rating } = require('../models');

class ReportService {
    /**
     * Genera un reporte PDF completo del emprendimiento
     */
    async generateBusinessReport(userId) {
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
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
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

    /**
     * Genera el HTML completo del reporte
     */
    generateReportHTML(business) {
        const rating = business.Rating;
        const businessModel = business.BusinessModel;
        const finance = business.Finance;
        const workTeam = business.WorkTeam;

        // Calcular métricas
        const totalScore = parseInt(rating.totalScore) || 0;
        const totalPercentage = parseFloat(rating.totalPercentage) || 0;
        const maxTotal = 13;

        // Preparar datos de secciones
        const sections = [
            {
                nombre: 'Datos Generales',
                puntaje: parseInt(rating.generalDataScore) || 0,
                max: 3,
                porcentaje: ((parseInt(rating.generalDataScore) || 0) / 3) * 100
            },
            {
                nombre: 'Finanzas',
                puntaje: parseInt(rating.financeScore) || 0,
                max: 6,
                porcentaje: ((parseInt(rating.financeScore) || 0) / 6) * 100
            },
            {
                nombre: 'Equipo de Trabajo',
                puntaje: parseInt(rating.workTeamScore) || 0,
                max: 4,
                porcentaje: ((parseInt(rating.workTeamScore) || 0) / 4) * 100
            }
        ];

        const estado = this.getEstadoLabel(rating.globalClassification);
        const estadoClass = this.getEstadoClass(rating.globalClassification);

        // Formatear fecha
        const fecha = new Date().toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte de Caracterización - ${business.name}</title>
    <style>
        :root {
            --primary: #0033ff; /* azul del sistema */
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

        /* Portada minimalista */
        .cover-page {
            min-height: 100vh;
            display: flex; flex-direction: column; justify-content: center; align-items: center;
            text-align: center; padding: 40px 24px; background: var(--bg);
        }
        .brand { font-size: 14px; color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px; }
        .cover-title { font-size: 28px; font-weight: 700; color: var(--text); letter-spacing: -0.5px; }
        .cover-business { margin-top: 10px; font-size: 20px; font-weight: 600; color: var(--primary); }
        .divider { width: 120px; height: 2px; background: var(--primary); opacity: 0.15; margin: 24px auto; border-radius: 2px; }
        .cover-meta { margin-top: 8px; font-size: 13px; color: var(--muted); }
        .cover-badge { margin-top: 16px; display: inline-block; padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #eef2ff; color: #3730a3; }
        .status-idea-inicial { background: #f3f4f6; color: #374151; }
        .status-en-desarrollo { background: #fff7ed; color: #9a3412; }
        .status-consolidado { background: #ecfdf5; color: #065f46; }

        /* Encabezado de página */
        .page-wrap { padding: 16px 8px 0; }
        .page-header { border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-bottom: 18px; }
        .page-header h1 { font-size: 18px; font-weight: 700; letter-spacing: -0.2px; color: var(--text); }
        .page-header .subtitle { font-size: 12px; color: var(--muted); margin-top: 4px; }

        /* Secciones y tarjetas */
        .section { margin: 14px 0 18px; }
        .section h2 { font-size: 14px; color: var(--text); font-weight: 600; margin-bottom: 10px; }
        .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .card { background: #fff; border: 1px solid var(--border); border-radius: 10px; padding: 14px; }
        .metric-label { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
        .metric-value { font-size: 20px; font-weight: 700; color: var(--text); }
        .metric-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }

        /* Tabla */
        table { width: 100%; border-collapse: collapse; }
        .table { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; background: #fff; }
        .table thead th { background: #f9fafb; font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; text-align: left; padding: 10px 12px; font-weight: 600; }
        .table tbody td { padding: 12px; border-top: 1px solid var(--border); font-size: 13px; color: var(--text); }
        .text-center { text-align: center; }

        /* Progreso */
        .progress { width: 100%; height: 8px; background: #f1f5f9; border-radius: 6px; overflow: hidden; }
        .progress-fill { height: 100%; background: var(--primary); width: 0; }

        /* Badges */
        .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
        .excellent { background: #ecfdf5; color: #065f46; }
        .good { background: #eff6ff; color: #1e40af; }
        .fair { background: #fff7ed; color: #9a3412; }
        .poor { background: #fef2f2; color: #991b1b; }

        /* Info items */
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .info-item { background: #fff; border: 1px solid var(--border); border-radius: 10px; padding: 12px; }
        .label { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
        .value { font-size: 14px; color: var(--text); font-weight: 600; }
        .info-item-full { grid-column: 1 / -1; }

        /* Panel neutro */
        .note { margin-top: 12px; background: var(--soft); border: 1px solid var(--border); border-radius: 10px; padding: 12px; }
        .note h4 { font-size: 12px; color: var(--text); margin-bottom: 6px; }
        .note p { font-size: 12px; color: var(--muted); }

        /* Pie */
        .page-footer { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border); text-align: center; color: var(--muted); font-size: 11px; }
    </style>
</head>
<body>
    <!-- Portada -->
    <div class="page cover-page">
        <div class="brand">Salga Adelante Sumercé</div>
        <div class="cover-title">Reporte de Caracterización de Emprendimiento</div>
        <div class="divider"></div>
        <div class="cover-business">${business.name}</div>
        <span class="cover-badge ${estadoClass}">${estado}</span>
        <div class="cover-meta">Generado el ${fecha}</div>
    </div>

    <!-- Resumen Ejecutivo -->
    <div class="page">
      <div class="page-wrap">
        <div class="page-header">
            <h1>Resumen Ejecutivo</h1>
            <div class="subtitle">${business.name}${business.economicSector ? ' · ' + business.economicSector : ''}</div>
        </div>

        <div class="section">
            <div class="grid-3">
                <div class="card">
                    <div class="metric-label">Puntaje total</div>
                    <div class="metric-value">${totalScore}</div>
                    <div class="metric-sub">de ${maxTotal} puntos</div>
                </div>
                <div class="card">
                    <div class="metric-label">Nivel de consolidación</div>
                    <div class="metric-value">${isFinite(totalPercentage) ? totalPercentage.toFixed(1) : 0}%</div>
                    <div class="metric-sub">${estado}</div>
                </div>
                <div class="card">
                    <div class="metric-label">Clasificación</div>
                    <div class="metric-value" style="font-size:16px;">
                        <span class="badge ${this.getScoreBadgeClass(totalPercentage).replace('score-','')}">${estado}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Desempeño por dimensión</h2>
            <div class="table">
                <table>
                    <thead>
                        <tr>
                            <th>Dimensión</th>
                            <th class="text-center">Puntaje</th>
                            <th class="text-center">Porcentaje</th>
                            <th>Progreso</th>
                            <th class="text-center">Nivel</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sections.map(section => `
                            <tr>
                                <td><strong>${section.nombre}</strong></td>
                                <td class="text-center">${section.puntaje} / ${section.max}</td>
                                <td class="text-center">${isFinite(section.porcentaje) ? section.porcentaje.toFixed(1) : 0}%</td>
                                <td>
                                    <div class="progress"><div class="progress-fill" style="width: ${Math.max(0, Math.min(100, section.porcentaje))}%;"></div></div>
                                </td>
                                <td class="text-center">
                                    <span class="badge ${this.getScoreBadgeClass(section.porcentaje).replace('score-','')}">
                                        ${this.getScoreLabel(section.porcentaje)}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>

    <!-- Página de Datos Generales -->
    <div class="page">
      <div class="page-wrap">
        <div class="page-header">
            <h1>A. Datos Generales del Emprendimiento</h1>
            <div class="subtitle">Información básica y de contacto</div>
        </div>

        <div class="section">
            <div class="info-grid">
                <div class="info-item">
                    <div class="label">Nombre del Emprendimiento</div>
                    <div class="value">${business.name || '-'}</div>
                </div>
                <div class="info-item">
                    <div class="label">Año de Creación</div>
                    <div class="value">${business.creationYear || '-'}</div>
                </div>
                <div class="info-item">
                    <div class="label">Sector Económico</div>
                    <div class="value">${business.economicSector || '-'}</div>
                </div>
                <div class="info-item">
                    <div class="label">Tiempo de Operación</div>
                    <div class="value">${this.formatOperationTime(business.operationMonths)}</div>
                </div>
                <div class="info-item">
                    <div class="label">Nombre del Encargado</div>
                    <div class="value">${business.managerName || '-'}</div>
                </div>
                <div class="info-item">
                    <div class="label">Contacto</div>
                    <div class="value">${business.managerContact || '-'}</div>
                </div>
                <div class="info-item info-item-full">
                    <div class="label">Correo Electrónico</div>
                    <div class="value">${business.managerEmail || '-'}</div>
                </div>
            </div>

            <div class="note">
                <h4>Puntuación en Datos Generales</h4>
                <p><strong>${rating.generalDataScore || 0}</strong> de 3 puntos (${isFinite((rating.generalDataScore / 3) * 100) ? ((rating.generalDataScore / 3) * 100).toFixed(1) : 0}%). Basado en el tiempo de operación del emprendimiento.</p>
            </div>
        </div>
      </div>
    </div>

    ${businessModel ? `
    <!-- Página de Modelo de Negocio -->
    <div class="page">
      <div class="page-wrap">
        <div class="page-header">
            <h1>B. Modelo de Negocio</h1>
            <div class="subtitle">Propuesta de valor y estrategia comercial</div>
        </div>

        <div class="section">
            <div class="info-item info-item-full" style="margin-bottom: 10px;">
                <div class="label">Propuesta de Valor</div>
                <div class="value">${businessModel.valueProposition || 'No especificado'}</div>
            </div>
            <div class="info-item info-item-full" style="margin-bottom: 10px;">
                <div class="label">Segmento de Clientes</div>
                <div class="value">${businessModel.customerSegment || 'No especificado'}</div>
            </div>
            <div class="info-item info-item-full" style="margin-bottom: 10px;">
                <div class="label">Canales de Venta</div>
                <div class="value">${businessModel.salesChannels || 'No especificado'}</div>
            </div>
            <div class="info-item info-item-full">
                <div class="label">Fuentes de Ingreso</div>
                <div class="value">${businessModel.incomeSources || 'No especificado'}</div>
            </div>
        </div>
      </div>
    </div>
    ` : ''}

    ${finance ? `
    <!-- Página de Finanzas -->
    <div class="page">
      <div class="page-wrap">
        <div class="page-header">
            <h1>C. Finanzas</h1>
            <div class="subtitle">Indicadores financieros y económicos</div>
        </div>

        <div class="section">
            <div class="grid-2">
                <div class="info-item">
                    <div class="label">Ventas Netas Mensuales</div>
                    <div class="value">${this.formatFinanceValue(finance.monthlyNetSales)}</div>
                </div>
                <div class="info-item">
                    <div class="label">Rentabilidad Mensual</div>
                    <div class="value">${this.formatProfitability(finance.monthlyProfitability)}</div>
                </div>
                <div class="info-item">
                    <div class="label">Fuentes de Financiamiento</div>
                    <div class="value">${this.formatFinancingSources(finance.financingSources)}</div>
                </div>
                <div class="info-item">
                    <div class="label">Costos Fijos Mensuales</div>
                    <div class="value">${this.formatFixedCosts(finance.monthlyFixedCosts)}</div>
                </div>
            </div>

            <div class="note">
                <h4>Puntuación en Finanzas</h4>
                <p><strong>${rating.financeScore || 0}</strong> de 6 puntos (${isFinite((rating.financeScore / 6) * 100) ? ((rating.financeScore / 6) * 100).toFixed(1) : 0}%). Basado en ventas, rentabilidad y costos fijos.</p>
            </div>
        </div>
      </div>
    </div>
    ` : ''}

    ${workTeam ? `
    <!-- Página de Equipo de Trabajo -->
    <div class="page">
      <div class="page-wrap">
        <div class="page-header">
            <h1>D. Equipo de Trabajo</h1>
            <div class="subtitle">Capacidades y estructura del equipo</div>
        </div>

        <div class="section">
            <div class="grid-2">
                <div class="info-item">
                    <div class="label">Nivel de Formación Empresarial</div>
                    <div class="value">${this.formatTrainingLevel(workTeam.businessTrainingLevel)}</div>
                </div>
                <div class="info-item">
                    <div class="label">Cantidad de Empleados</div>
                    <div class="value">${workTeam.employeeCount || 0} empleados</div>
                </div>
                <div class="info-item">
                    <div class="label">Personal Capacitado</div>
                    <div class="value">${workTeam.hasTrainedStaff ? 'Sí' : 'No'}</div>
                </div>
                <div class="info-item">
                    <div class="label">Roles Definidos</div>
                    <div class="value">${workTeam.hasDefinedRoles ? 'Sí' : 'No'}</div>
                </div>
            </div>

            <div class="note">
                <h4>Puntuación en Equipo de Trabajo</h4>
                <p><strong>${rating.workTeamScore || 0}</strong> de 4 puntos (${isFinite((rating.workTeamScore / 4) * 100) ? ((rating.workTeamScore / 4) * 100).toFixed(1) : 0}%). Basado en formación, capacitación y estructura organizacional.</p>
            </div>
        </div>
      </div>
    </div>
    ` : ''}

    <!-- Página Final - Recomendaciones -->
    <div class="page">
      <div class="page-wrap">
        <div class="page-header">
            <h1>Recomendaciones y Próximos Pasos</h1>
            <div class="subtitle">Clasificación: ${estado}</div>
        </div>

        <div class="section">
            ${this.generateRecommendations(rating.globalClassification, sections)}
        </div>

        <div class="page-footer">
            <p><strong>Salga Adelante Sumercé</strong> · Sistema de Caracterización</p>
            <p>Reporte generado el ${fecha}</p>
            <p style="margin-top: 8px;">Documento confidencial, emitido para ${business.managerName || 'el representante del emprendimiento'}.</p>
        </div>
      </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * Métodos auxiliares de formato
     */
    getEstadoLabel(classification) {
        const labels = {
            'idea_inicial': 'Idea Inicial',
            'en_desarrollo': 'En Desarrollo',
            'consolidado': 'Consolidado'
        };
        return labels[classification] || 'Sin clasificar';
    }

    getEstadoClass(classification) {
        return `status-${classification}`;
    }

    getEstadoIcon(classification) {
        // Sin emojis para mantener estilo profesional
        return '';
    }

    formatOperationTime(time) {
        const labels = {
            'menos_6_meses': 'Menos de 6 meses',
            '6_12_meses': '6 a 12 meses',
            '12_24_meses': '12 a 24 meses',
            'mas_24_meses': 'Más de 24 meses'
        };
        return labels[time] || time || '-';
    }

    formatFinanceValue(value) {
        const labels = {
            'menos_1_smmlv': 'Menos de 1 SMMLV',
            '1_3_smmlv': '1 a 3 SMMLV',
            '3_6_smmlv': '3 a 6 SMMLV',
            'mas_6_smmlv': 'Más de 6 SMMLV',
            '3_mas_smmlv': 'Más de 3 SMMLV'
        };
        return labels[value] || value || 'No especificado';
    }

    formatProfitability(value) {
        const labels = {
            'menos_medio_smmlv': 'Menos de medio SMMLV',
            'baja_menos_1_smmlv': 'Baja (menos de 1 SMMLV)',
            'medio_1_smmlv': 'Media (1 SMMLV)',
            '2_mas_smmlv': 'Más de 2 SMMLV',
            'alta_mas_3_smmlv': 'Alta (más de 3 SMMLV)'
        };
        return labels[value] || value || 'No especificado';
    }

    formatFinancingSources(value) {
        const labels = {
            'propios': 'Recursos Propios',
            'credito_bancario': 'Crédito Bancario',
            'inversion_externa': 'Inversión Externa',
            'otro': 'Otro'
        };
        return labels[value] || value || 'No especificado';
    }

    formatFixedCosts(value) {
        const labels = {
            'menos_medio_smmlv': 'Menos de medio SMMLV',
            'bajo_menos_1_smmlv': 'Bajo (menos de 1 SMMLV)',
            'medio_1_smmlv': 'Medio (1 SMMLV)',
            '2_mas_smmlv': 'Más de 2 SMMLV',
            'alto_mas_3_smmlv': 'Alto (más de 3 SMMLV)'
        };
        return labels[value] || value || 'No especificado';
    }

    formatTrainingLevel(level) {
        const labels = {
            'sin_formacion': 'Sin formación específica',
            'tecnica_profesional': 'Técnica o Profesional',
            'administracion_emprendimiento': 'Administración o Emprendimiento'
        };
        return labels[level] || level || '-';
    }

    getScoreBadgeClass(percentage) {
        if (percentage >= 80) return 'score-excellent';
        if (percentage >= 60) return 'score-good';
        if (percentage >= 40) return 'score-fair';
        return 'score-poor';
    }

    getScoreLabel(percentage) {
        if (percentage >= 80) return 'Excelente';
        if (percentage >= 60) return 'Bueno';
        if (percentage >= 40) return 'Regular';
        return 'Bajo';
    }

    generateRecommendations(classification, sections) {
        const recBlocks = {
            'idea_inicial': `
                <div class="card" style="margin-bottom: 10px;">
                    <h3 style="font-size:14px; margin-bottom: 8px;">Fase: Idea Inicial</h3>
                    <p style="font-size:12px; color: var(--muted); margin-bottom: 8px;">Tu emprendimiento está en una etapa temprana. Prioriza:</p>
                    <ul style="padding-left: 16px; color: var(--text); font-size:12px; line-height:1.9;">
                        <li>Validación de la propuesta con clientes</li>
                        <li>Elaboración de un plan de negocio</li>
                        <li>Capacitación en gestión empresarial</li>
                        <li>Identificación de fuentes de financiamiento</li>
                        <li>Definición de roles y responsabilidades</li>
                    </ul>
                </div>
            `,
            'en_desarrollo': `
                <div class="card" style="margin-bottom: 10px;">
                    <h3 style="font-size:14px; margin-bottom: 8px;">Fase: En Desarrollo</h3>
                    <p style="font-size:12px; color: var(--muted); margin-bottom: 8px;">Enfócate en fortalecer y escalar:</p>
                    <ul style="padding-left: 16px; color: var(--text); font-size:12px; line-height:1.9;">
                        <li>Optimización de procesos y finanzas</li>
                        <li>Capacitación del equipo</li>
                        <li>Ampliación de canales de venta</li>
                        <li>Control presupuestario</li>
                        <li>Estrategias de marketing</li>
                    </ul>
                </div>
            `,
            'consolidado': `
                <div class="card" style="margin-bottom: 10px;">
                    <h3 style="font-size:14px; margin-bottom: 8px;">Fase: Consolidado</h3>
                    <p style="font-size:12px; color: var(--muted); margin-bottom: 8px;">Mantén el crecimiento sostenible:</p>
                    <ul style="padding-left: 16px; color: var(--text); font-size:12px; line-height:1.9;">
                        <li>Exploración de nuevos mercados</li>
                        <li>Incorporación de tecnologías</li>
                        <li>Alianzas estratégicas</li>
                        <li>Innovación y desarrollo</li>
                        <li>Certificaciones de calidad</li>
                    </ul>
                </div>
            `
        };

        let html = recBlocks[classification] || '';

        // Áreas de mejora específicas
        html += `
            <div class="card">
                <h3 style="font-size:14px; margin-bottom: 8px;">Áreas prioritarias de mejora</h3>
        `;

        const sortedSections = [...sections].sort((a, b) => a.porcentaje - b.porcentaje);

        sortedSections.forEach(section => {
            if (section.porcentaje < 70) {
                html += `
                    <div class="note" style="margin-bottom: 8px;">
                        <h4 style="margin:0 0 4px 0;">${section.nombre}</h4>
                        <p style="margin:0 0 6px 0;">Nivel actual: ${isFinite(section.porcentaje) ? section.porcentaje.toFixed(1) : 0}% (${section.puntaje}/${section.max} puntos)</p>
                        <p style="margin:0; color: var(--text); font-size:12px;">${this.getAreaRecommendation(section.nombre)}</p>
                    </div>
                `;
            }
        });

        html += `</div>`;

        return html;
    }

    getAreaRecommendation(areaName) {
        const recommendations = {
            'Datos Generales': 'Continúa operando y documentando tu experiencia. El tiempo fortalecerá esta dimensión.',
            'Finanzas': 'Incrementa ventas, mejora la rentabilidad y optimiza los costos fijos.',
            'Equipo de Trabajo': 'Invierte en capacitación, define roles claros y amplía el equipo cuando sea necesario.'
        };
        return recommendations[areaName] || 'Identifica oportunidades de mejora continua.';
    }
}

module.exports = new ReportService();
