const { Business, BusinessModel, Finance, WorkTeam, Rating, User } = require('../models');
const sequelize = require('../config/database');
const cacheService = require('./cacheService');

/**
 * Servicio de precarga de datos críticos
 * Este servicio se encarga de precargar todos los datos importantes en caché
 * para que la aplicación pueda funcionar incluso si la BD se cae
 */
class DataPreloadService {
    constructor() {
        this.isPreloading = false;
        this.lastPreloadTime = null;
        this.preloadInterval = null;
        // Tiempo entre precargas automáticas (cada 15 minutos)
        this.PRELOAD_INTERVAL_MS = 15 * 60 * 1000;
    }

    /**
     * Inicia el proceso de precarga y sincronización periódica
     */
    async start() {
        console.log('🚀 Iniciando servicio de precarga de datos...');
        
        // Precarga inicial
        await this.preloadAllCriticalData();
        
        // Configurar precarga periódica
        this.preloadInterval = setInterval(async () => {
            console.log('🔄 Ejecutando precarga periódica de datos...');
            await this.preloadAllCriticalData();
        }, this.PRELOAD_INTERVAL_MS);

        console.log(`✅ Servicio de precarga iniciado. Próxima sincronización en ${this.PRELOAD_INTERVAL_MS / 60000} minutos`);
    }

    /**
     * Detiene el servicio de precarga periódica
     */
    stop() {
        if (this.preloadInterval) {
            clearInterval(this.preloadInterval);
            this.preloadInterval = null;
            console.log('⏹️  Servicio de precarga detenido');
        }
    }

    /**
     * Precarga todos los datos críticos del sistema
     */
    async preloadAllCriticalData() {
        if (this.isPreloading) {
            console.log('⚠️  Ya hay una precarga en progreso, omitiendo...');
            return;
        }

        this.isPreloading = true;
        const startTime = Date.now();
        
        try {
            console.log('📦 Iniciando precarga de datos críticos...');

            // Ejecutar todas las precargas en paralelo para mayor eficiencia
            const results = await Promise.allSettled([
                this.preloadAllUsers(),
                this.preloadAllBusinesses(),
                this.preloadUserBusinessMappings(),
                this.preloadStatistics()
            ]);

            // Analizar resultados
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            
            if (failed > 0) {
                console.warn(`⚠️  Precarga completada con advertencias: ${successful} exitosos, ${failed} fallidos (${duration}s)`);
                results.forEach((result, index) => {
                    if (result.status === 'rejected') {
                        console.error(`   - Error en tarea ${index + 1}:`, result.reason?.message);
                    }
                });
            } else {
                console.log(`✅ Precarga completa exitosa en ${duration}s`);
            }

            this.lastPreloadTime = new Date();
            
        } catch (error) {
            console.error('❌ Error crítico en precarga de datos:', error);
        } finally {
            this.isPreloading = false;
        }
    }

    /**
     * Precarga información básica de todos los usuarios
     */
    async preloadAllUsers() {
        try {
            const users = await User.findAll({
                attributes: ['id', 'email', 'firstName', 'lastName', 'role']
            });

            console.log(`   📋 Precargando ${users.length} usuarios...`);

            for (const user of users) {
                const cacheKey = cacheService.generateCacheKey('user:basic', { userId: user.id });
                await cacheService.set(cacheKey, user.toJSON(), cacheService.CRITICAL_DATA_TTL);
            }

            console.log(`   ✅ ${users.length} usuarios precargados`);
            return users.length;

        } catch (error) {
            console.error('   ❌ Error al precargar usuarios:', error.message);
            throw error;
        }
    }

    /**
     * Precarga todos los emprendimientos con sus relaciones
     */
    async preloadAllBusinesses() {
        try {
            const businesses = await Business.findAll({
                include: [
                    { model: BusinessModel },
                    { model: Finance },
                    { model: WorkTeam },
                    { model: Rating },
                    { 
                        model: User, 
                        attributes: ['id', 'email', 'firstName', 'lastName', 'role']
                    }
                ]
            });

            console.log(`   📋 Precargando ${businesses.length} emprendimientos...`);

            for (const business of businesses) {
                const businessData = business.toJSON();
                
                // Cachear emprendimiento completo por ID
                const businessKey = cacheService.generateCacheKey('admin:business', { 
                    businessId: business.id 
                });
                await cacheService.set(businessKey, businessData, cacheService.CRITICAL_DATA_TTL);

                // Cachear dashboard del emprendimiento
                const dashboardKey = cacheService.generateCacheKey('admin:business-dashboard', { 
                    businessId: business.id 
                });
                await cacheService.set(dashboardKey, businessData, cacheService.CRITICAL_DATA_TTL);

                // Cachear resultados de caracterización
                const resultsKey = cacheService.generateCacheKey('characterization:business', { 
                    businessId: business.id 
                });
                await cacheService.set(resultsKey, businessData, cacheService.CRITICAL_DATA_TTL);
            }

            // Cachear lista completa de emprendimientos
            const allBusinessesKey = cacheService.generateCacheKey('admin:all-businesses');
            const businessesData = businesses.map(b => b.toJSON());
            await cacheService.set(allBusinessesKey, businessesData, cacheService.CRITICAL_DATA_TTL);

            console.log(`   ✅ ${businesses.length} emprendimientos precargados`);
            return businesses.length;

        } catch (error) {
            console.error('   ❌ Error al precargar emprendimientos:', error.message);
            throw error;
        }
    }

    /**
     * Precarga mapeos de usuario -> emprendimientos para acceso rápido
     */
    async preloadUserBusinessMappings() {
        try {
            const businesses = await Business.findAll({
                include: [
                    { model: BusinessModel },
                    { model: Finance },
                    { model: WorkTeam },
                    { model: Rating }
                ]
            });

            console.log(`   📋 Precargando mapeos usuario-emprendimiento...`);

            // Agrupar emprendimientos por usuario
            const userBusinessMap = new Map();
            
            for (const business of businesses) {
                const userId = business.userId;
                
                if (!userBusinessMap.has(userId)) {
                    userBusinessMap.set(userId, []);
                }
                
                userBusinessMap.get(userId).push(business);
            }

            // Cachear datos por usuario
            let mappingsCount = 0;
            for (const [userId, userBusinesses] of userBusinessMap) {
                // Cachear caracterización del usuario (último emprendimiento)
                const latestBusiness = userBusinesses[userBusinesses.length - 1];
                const characterizationKey = cacheService.generateCacheKey('characterization:user', { 
                    userId 
                });
                await cacheService.set(characterizationKey, latestBusiness.toJSON(), cacheService.CRITICAL_DATA_TTL);

                // Cachear dashboard del usuario
                if (latestBusiness.Rating) {
                    const dashboardData = this.buildDashboardData(latestBusiness);
                    const dashboardKey = cacheService.generateCacheKey('dashboard:user', { 
                        userId 
                    });
                    await cacheService.set(dashboardKey, dashboardData, cacheService.CRITICAL_DATA_TTL);
                }

                // Cachear lista de emprendimientos del usuario
                const businessesKey = cacheService.generateCacheKey('businesses:user', { 
                    userId 
                });
                const businessesData = userBusinesses.map(b => {
                    const businessJSON = b.toJSON ? b.toJSON() : b;
                    return {
                        id: businessJSON.id,
                        nombre: businessJSON.name,
                        sector: businessJSON.economicSector,
                        fechaRegistro: businessJSON.registrationDate,
                        puntajeTotal: businessJSON.Rating ? businessJSON.Rating.totalScore : 0,
                        clasificacion: businessJSON.Rating ? this.getEstadoLabel(businessJSON.Rating.globalClassification) : 'Sin calificar'
                    };
                });
                await cacheService.set(businessesKey, businessesData, cacheService.CRITICAL_DATA_TTL);

                mappingsCount++;
            }

            console.log(`   ✅ ${mappingsCount} mapeos usuario-emprendimiento precargados`);
            return mappingsCount;

        } catch (error) {
            console.error('   ❌ Error al precargar mapeos:', error.message);
            throw error;
        }
    }

    /**
     * Precarga estadísticas administrativas
     */
    async preloadStatistics() {
        try {
            console.log(`   📋 Precargando estadísticas...`);

            const [
                totalBusinesses,
                totalUsers,
                businessesByClassification,
                businessesBySector
            ] = await Promise.all([
                Business.count(),
                User.count({ where: { role: 'emprendedor' } }),
                sequelize.query(
                    'SELECT clasificacion_global as globalClassification, COUNT(*) as count FROM calificaciones GROUP BY clasificacion_global',
                    { type: sequelize.QueryTypes.SELECT }
                ),
                sequelize.query(
                    'SELECT sector_economico as economicSector, COUNT(*) as count FROM emprendimientos GROUP BY sector_economico',
                    { type: sequelize.QueryTypes.SELECT }
                )
            ]);

            const statistics = {
                totalBusinesses,
                totalUsers,
                byClassification: {
                    idea_inicial: 0,
                    en_desarrollo: 0,
                    consolidado: 0
                },
                bySector: {}
            };

            businessesByClassification.forEach(item => {
                const classification = item.globalClassification;
                const count = parseInt(item.count);
                if (classification) {
                    statistics.byClassification[classification] = count;
                }
            });

            businessesBySector.forEach(item => {
                const sector = item.economicSector;
                const count = parseInt(item.count);
                if (sector) {
                    statistics.bySector[sector] = count;
                }
            });

            const statsKey = cacheService.generateCacheKey('admin:statistics');
            await cacheService.set(statsKey, statistics, cacheService.CRITICAL_DATA_TTL);

            console.log(`   ✅ Estadísticas precargadas`);
            return statistics;

        } catch (error) {
            console.error('   ❌ Error al precargar estadísticas:', error.message);
            throw error;
        }
    }

    /**
     * Construye los datos del dashboard a partir de un emprendimiento
     */
    buildDashboardData(business) {
        const rating = business.Rating;
        if (!rating) return null;

        const maxTotal = 13;
        const totalPercentage = parseFloat(rating.totalPercentage) || 0;
        const generalDataScore = parseInt(rating.generalDataScore) || 0;
        const businessModelScore = parseInt(rating.businessModelScore) || 0;
        const financeScore = parseInt(rating.financeScore) || 0;
        const workTeamScore = parseInt(rating.workTeamScore) || 0;
        const socialImpactScore = parseInt(rating.socialImpactScore) || 0;
        const totalScore = parseInt(rating.totalScore) || 0;

        return {
            puntajeTotal: totalScore,
            maxTotal: maxTotal,
            porcentaje: parseFloat(totalPercentage.toFixed(2)),
            estado: this.getEstadoLabel(rating.globalClassification),
            secciones: [
                {
                    nombre: 'Datos Generales',
                    puntaje: generalDataScore,
                    max: 3,
                    porcentaje: parseFloat(((generalDataScore / 3) * 100).toFixed(2))
                },
                {
                    nombre: 'Modelo de Negocio',
                    puntaje: businessModelScore,
                    max: 0,
                    porcentaje: 0
                },
                {
                    nombre: 'Finanzas',
                    puntaje: financeScore,
                    max: 6,
                    porcentaje: parseFloat(((financeScore / 6) * 100).toFixed(2))
                },
                {
                    nombre: 'Equipo de Trabajo',
                    puntaje: workTeamScore,
                    max: 4,
                    porcentaje: parseFloat(((workTeamScore / 4) * 100).toFixed(2))
                },
                {
                    nombre: 'Impacto Social',
                    puntaje: socialImpactScore,
                    max: 0,
                    porcentaje: 0
                }
            ].filter(s => s.max > 0),
            emprendimiento: {
                nombre: business.name,
                sector: business.economicSector,
                anioCreacion: business.creationYear,
                encargado: business.managerName
            },
            fechaCalculo: rating.calculationDate
        };
    }

    getEstadoLabel(classification) {
        const labels = {
            'idea_inicial': 'Idea Inicial',
            'en_desarrollo': 'En Desarrollo',
            'consolidado': 'Consolidado'
        };
        return labels[classification] || 'Sin clasificar';
    }

    /**
     * Fuerza una recarga inmediata de todos los datos
     */
    async forceReload() {
        console.log('🔄 Forzando recarga de datos...');
        await this.preloadAllCriticalData();
    }

    /**
     * Obtiene el estado del servicio
     */
    getStatus() {
        return {
            isRunning: this.preloadInterval !== null,
            isPreloading: this.isPreloading,
            lastPreloadTime: this.lastPreloadTime,
            nextPreloadIn: this.preloadInterval 
                ? `${Math.round(this.PRELOAD_INTERVAL_MS / 60000)} minutos`
                : 'N/A'
        };
    }
}

module.exports = new DataPreloadService();
