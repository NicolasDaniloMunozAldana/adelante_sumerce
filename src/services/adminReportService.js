const puppeteer = require('puppeteer');
const { Business, BusinessModel, Finance, WorkTeam, Rating, User } = require('../models');

class AdminReportService {
    /**
     * Genera un reporte PDF completo del emprendimiento para el administrador
     */
    async generateBusinessReport(businessId) {
        try {
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

    /**
     * Genera el HTML completo del reporte con dialecto administrativo
     */
    generateReportHTML(business) {
        const rating = business.Rating;
        const businessModel = business.BusinessModel;
        const finance = business.Finance;
        const workTeam = business.WorkTeam;
        const user = business.User;

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
    <title>Evaluación de Emprendimiento - ${business.name}</title>
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
        .admin-label { margin-top: 20px; font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }

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

        /* Panel de información administrativa */
        .admin-panel { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 14px; margin-bottom: 14px; }
        .admin-panel h3 { font-size: 13px; color: #0c4a6e; margin-bottom: 8px; font-weight: 600; }
        .admin-panel .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e0f2fe; }
        .admin-panel .info-row:last-child { border-bottom: none; }
        .admin-panel .info-key { font-size: 11px; color: #0e7490; font-weight: 600; }
        .admin-panel .info-value { font-size: 11px; color: #164e63; }

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
        <div class="cover-title">Evaluación de Emprendimiento</div>
        <div class="divider"></div>
        <div class="cover-business">${business.name}</div>
        <span class="cover-badge ${estadoClass}">${estado}</span>
        <div class="cover-meta">Generado el ${fecha}</div>
        <div class="admin-label">Documento Administrativo · Uso Interno</div>
    </div>

    <!-- Resumen Ejecutivo -->
    <div class="page">
      <div class="page-wrap">
        <div class="page-header">
            <h1>Resumen Ejecutivo</h1>
            <div class="subtitle">${business.name}${business.economicSector ? ' · ' + business.economicSector : ''}</div>
        </div>

        <!-- Panel de información del emprendedor -->
        <div class="admin-panel">
            <h3>Información del Emprendedor</h3>
            <div class="info-row">
                <span class="info-key">Nombre Completo</span>
                <span class="info-value">${user ? `${user.firstName} ${user.lastName}` : 'No disponible'}</span>
            </div>
            <div class="info-row">
                <span class="info-key">Email</span>
                <span class="info-value">${user ? user.email : 'No disponible'}</span>
            </div>
            <div class="info-row">
                <span class="info-key">Teléfono</span>
                <span class="info-value">${user ? user.phoneContact : 'No disponible'}</span>
            </div>
            <div class="info-row">
                <span class="info-key">ID de Usuario</span>
                <span class="info-value">#${user ? user.id : 'N/A'}</span>
            </div>
            <div class="info-row">
                <span class="info-key">ID del Emprendimiento</span>
                <span class="info-value">#${business.id}</span>
            </div>
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
            <h2>Evaluación por Dimensión</h2>
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
            <div class="subtitle">Información básica registrada</div>
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
                <h4>Análisis de Puntuación - Datos Generales</h4>
                <p><strong>${rating.generalDataScore || 0}</strong> de 3 puntos (${isFinite((rating.generalDataScore / 3) * 100) ? ((rating.generalDataScore / 3) * 100).toFixed(1) : 0}%). Esta puntuación se basa en el tiempo de operación del emprendimiento, siendo un indicador de madurez y experiencia en el mercado.</p>
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
            <div class="subtitle">Estructura estratégica del emprendimiento</div>
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

        <div class="note">
            <h4>Observaciones Administrativas</h4>
            <p>Esta sección documenta el modelo de negocio declarado por el emprendedor. Se recomienda validar la coherencia entre la propuesta de valor y el segmento de clientes identificado.</p>
        </div>
      </div>
    </div>
    ` : ''}

    ${finance ? `
    <!-- Página de Finanzas -->
    <div class="page">
      <div class="page-wrap">
        <div class="page-header">
            <h1>C. Situación Financiera</h1>
            <div class="subtitle">Análisis de indicadores económicos</div>
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
                <h4>Análisis de Puntuación - Finanzas</h4>
                <p><strong>${rating.financeScore || 0}</strong> de 6 puntos (${isFinite((rating.financeScore / 6) * 100) ? ((rating.financeScore / 6) * 100).toFixed(1) : 0}%). La puntuación refleja el nivel de ventas, rentabilidad y estructura de costos. Se sugiere monitorear estos indicadores trimestralmente.</p>
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
            <div class="subtitle">Estructura organizacional y capacidades</div>
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
                <h4>Análisis de Puntuación - Equipo de Trabajo</h4>
                <p><strong>${rating.workTeamScore || 0}</strong> de 4 puntos (${isFinite((rating.workTeamScore / 4) * 100) ? ((rating.workTeamScore / 4) * 100).toFixed(1) : 0}%). Esta evaluación considera la formación empresarial, capacitación del personal y estructura organizacional. Un equipo bien formado y estructurado es clave para el crecimiento sostenible.</p>
            </div>
        </div>
      </div>
    </div>
    ` : ''}

    <!-- Página Final - Diagnóstico y Recomendaciones -->
    <div class="page">
      <div class="page-wrap">
        <div class="page-header">
            <h1>Diagnóstico y Plan de Acción</h1>
            <div class="subtitle">Clasificación: ${estado}</div>
        </div>

        <div class="section">
            ${this.generateAdminRecommendations(rating.globalClassification, sections)}
        </div>

        <div class="admin-panel" style="margin-top: 16px;">
            <h3>Notas para el Seguimiento</h3>
            <div class="info-row">
                <span class="info-key">Fecha de Evaluación</span>
                <span class="info-value">${rating.calculationDate ? new Date(rating.calculationDate).toLocaleDateString('es-CO') : fecha}</span>
            </div>
            <div class="info-row">
                <span class="info-key">Próxima Revisión Sugerida</span>
                <span class="info-value">3 meses después de esta evaluación</span>
            </div>
            <div class="info-row">
                <span class="info-key">Analista Responsable</span>
                <span class="info-value">Sistema Administrativo</span>
            </div>
        </div>

        <div class="page-footer">
            <p><strong>Salga Adelante Sumercé</strong> · Sistema de Caracterización</p>
            <p>Documento administrativo generado el ${fecha}</p>
            <p style="margin-top: 8px;">Reporte confidencial · Uso exclusivo para análisis y seguimiento administrativo.</p>
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

    generateAdminRecommendations(classification, sections) {
        const recBlocks = {
            'idea_inicial': `
                <div class="card" style="margin-bottom: 10px;">
                    <h3 style="font-size:14px; margin-bottom: 8px;">Diagnóstico: Idea Inicial</h3>
                    <p style="font-size:12px; color: var(--muted); margin-bottom: 8px;">Este emprendimiento se encuentra en fase temprana. Se recomienda brindar apoyo en:</p>
                    <ul style="padding-left: 16px; color: var(--text); font-size:12px; line-height:1.9;">
                        <li>Acompañamiento en la validación de la propuesta de valor</li>
                        <li>Capacitación en elaboración de planes de negocio</li>
                        <li>Formación en gestión empresarial básica</li>
                        <li>Orientación sobre fuentes de financiamiento disponibles</li>
                        <li>Talleres de definición de roles y estructura organizacional</li>
                    </ul>
                </div>
            `,
            'en_desarrollo': `
                <div class="card" style="margin-bottom: 10px;">
                    <h3 style="font-size:14px; margin-bottom: 8px;">Diagnóstico: En Desarrollo</h3>
                    <p style="font-size:12px; color: var(--muted); margin-bottom: 8px;">El emprendimiento muestra avances significativos. Priorizar acompañamiento en:</p>
                    <ul style="padding-left: 16px; color: var(--text); font-size:12px; line-height:1.9;">
                        <li>Optimización de procesos operativos y financieros</li>
                        <li>Programas de capacitación especializada para el equipo</li>
                        <li>Estrategias de ampliación de canales comerciales</li>
                        <li>Implementación de sistemas de control presupuestario</li>
                        <li>Desarrollo de estrategias de marketing digital</li>
                    </ul>
                </div>
            `,
            'consolidado': `
                <div class="card" style="margin-bottom: 10px;">
                    <h3 style="font-size:14px; margin-bottom: 8px;">Diagnóstico: Consolidado</h3>
                    <p style="font-size:12px; color: var(--muted); margin-bottom: 8px;">Emprendimiento con alto nivel de madurez. Oportunidades de apoyo avanzado:</p>
                    <ul style="padding-left: 16px; color: var(--text); font-size:12px; line-height:1.9;">
                        <li>Facilitación de acceso a nuevos mercados y segmentos</li>
                        <li>Apoyo en la incorporación de tecnologías emergentes</li>
                        <li>Conexión con alianzas estratégicas y redes empresariales</li>
                        <li>Programas de innovación y desarrollo de productos/servicios</li>
                        <li>Acompañamiento en procesos de certificación y calidad</li>
                    </ul>
                </div>
            `
        };

        let html = recBlocks[classification] || '';

        // Áreas críticas identificadas
        html += `
            <div class="card">
                <h3 style="font-size:14px; margin-bottom: 8px;">Áreas Críticas Identificadas</h3>
        `;

        const sortedSections = [...sections].sort((a, b) => a.porcentaje - b.porcentaje);

        sortedSections.forEach(section => {
            if (section.porcentaje < 70) {
                html += `
                    <div class="note" style="margin-bottom: 8px;">
                        <h4 style="margin:0 0 4px 0;">${section.nombre}</h4>
                        <p style="margin:0 0 6px 0;">Nivel registrado: ${isFinite(section.porcentaje) ? section.porcentaje.toFixed(1) : 0}% (${section.puntaje}/${section.max} puntos)</p>
                        <p style="margin:0; color: var(--text); font-size:12px;">${this.getAdminAreaRecommendation(section.nombre)}</p>
                    </div>
                `;
            }
        });

        if (sortedSections.every(s => s.porcentaje >= 70)) {
            html += `
                <div class="note">
                    <p style="margin:0; color: var(--text); font-size:12px;">No se identificaron áreas críticas. Todas las dimensiones muestran niveles aceptables de desempeño.</p>
                </div>
            `;
        }

        html += `</div>`;

        return html;
    }

    getAdminAreaRecommendation(areaName) {
        const recommendations = {
            'Datos Generales': 'Emprendimiento reciente. Acompañar en la documentación de actividades y experiencia. El tiempo fortalecerá esta dimensión naturalmente.',
            'Finanzas': 'Requiere intervención prioritaria. Proveer capacitación en gestión financiera, incremento de ventas y optimización de costos operativos.',
            'Equipo de Trabajo': 'Necesita fortalecimiento. Ofrecer programas de capacitación empresarial, talleres de definición de roles y estrategias de formación de equipos.'
        };
        return recommendations[areaName] || 'Monitorear continuamente y evaluar necesidades específicas de intervención.';
    }
}

module.exports = new AdminReportService();
