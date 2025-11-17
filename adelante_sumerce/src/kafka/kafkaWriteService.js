const kafkaProducer = require('./kafkaProducer');
const cacheService = require('../services/cacheService');

/**
 * Servicio para manejar escrituras resilientes con Kafka
 * Implementa Event Sourcing para permitir escrituras aunque la BD esté caída
 */
class KafkaWriteService {
    /**
     * Registra un nuevo emprendimiento
     * @param {Object} businessData - Datos del emprendimiento
     * @param {Object} businessModelData - Datos del modelo de negocio
     * @param {Object} financeData - Datos financieros
     * @param {Object} workTeamData - Datos del equipo de trabajo
     * @param {Object} userData - Datos del usuario (req.user)
     * @returns {Promise<Object>} Resultado de la operación
     */
    async createCharacterization(businessData, businessModelData, financeData, workTeamData, userData = null) {
        try {
            // 1. Generar ID temporal único
            const tempId = `temp_${Date.now()}_${businessData.userId}`;
            
            // 2. Crear evento de escritura
            const writeEvent = {
                eventId: `write_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                eventType: 'CREATE_CHARACTERIZATION',
                timestamp: new Date().toISOString(),
                userId: businessData.userId,
                tempId: tempId,
                data: {
                    business: businessData,
                    businessModel: businessModelData,
                    finance: financeData,
                    workTeam: workTeamData
                },
                userData: userData ? { // Incluir datos del usuario
                    id: userData.id,
                    email: userData.email,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    phoneContact: userData.phoneContact
                } : null,
                status: 'PENDING' // PENDING, PROCESSING, COMPLETED, FAILED
            };

            // 3. Publicar evento a Kafka (persistencia garantizada)
            await kafkaProducer.sendCharacterizationWriteEvent(writeEvent);
            
            console.log(`✅ Evento de escritura enviado a Kafka: ${writeEvent.eventId}`);

            // 4. Actualizar caché inmediatamente (optimistic update)
            await this.updateCacheWithPendingData(businessData.userId, tempId, writeEvent.data, userData);

            return {
                success: true,
                tempId: tempId,
                eventId: writeEvent.eventId,
                message: 'Caracterización registrada. Los cambios se están procesando.',
                cached: true
            };

        } catch (error) {
            console.error('❌ Error en createCharacterization:', error);
            throw new Error('No se pudo registrar la caracterización. Por favor, intenta más tarde.');
        }
    }

    /**
     * Actualiza una caracterización existente
     * @param {number} businessId - ID del emprendimiento
     * @param {Object} updates - Datos a actualizar
     * @returns {Promise<Object>} Resultado de la operación
     */
    async updateCharacterization(businessId, updates) {
        try {
            // 1. Crear evento de actualización
            const writeEvent = {
                eventId: `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                eventType: 'UPDATE_CHARACTERIZATION',
                timestamp: new Date().toISOString(),
                businessId: businessId,
                updates: updates,
                status: 'PENDING'
            };

            // 2. Publicar evento a Kafka
            await kafkaProducer.sendCharacterizationUpdateEvent(writeEvent);
            
            console.log(`✅ Evento de actualización enviado a Kafka: ${writeEvent.eventId}`);

            // 3. Actualizar caché inmediatamente
            await this.updateCacheWithUpdates(businessId, updates);

            return {
                success: true,
                eventId: writeEvent.eventId,
                message: 'Actualización registrada. Los cambios se están procesando.',
                cached: true
            };

        } catch (error) {
            console.error('❌ Error en updateCharacterization:', error);
            throw new Error('No se pudo actualizar la caracterización. Por favor, intenta más tarde.');
        }
    }

    /**
     * Actualiza el caché con datos pendientes de escritura
     * @param {number} userId - ID del usuario
     * @param {string} tempId - ID temporal
     * @param {Object} data - Datos a cachear
     * @param {Object} userData - Datos del usuario
     */
    async updateCacheWithPendingData(userId, tempId, data, userData = null) {
        try {
            // Calcular puntajes (lógica simplificada del characterizationService)
            const operationTimeScore = this.calculateOperationTimeScore(data.business.operationMonths);
            const financeScore = this.calculateFinanceScores(data.finance);
            const workTeamScore = this.calculateWorkTeamScores(data.workTeam);
            const totalScore = operationTimeScore + financeScore + workTeamScore;
            const totalPercentage = (totalScore / 13) * 100;
            const globalClassification = this.calculateGlobalClassification(totalScore);

            // Crear objeto completo con estructura idéntica a Sequelize
            const cachedBusiness = {
                id: tempId, // ID temporal
                userId: userId,
                usuario_id: userId, // Campo de BD también
                name: data.business.name,
                nombre_emprendimiento: data.business.name, // Campo de BD
                creationYear: data.business.creationYear,
                anio_creacion: data.business.creationYear,
                economicSector: data.business.economicSector,
                sector_economico: data.business.economicSector,
                managerName: data.business.managerName,
                nombre_encargado: data.business.managerName,
                managerContact: data.business.managerContact,
                contacto_encargado: data.business.managerContact,
                managerEmail: data.business.managerEmail,
                email_encargado: data.business.managerEmail,
                operationMonths: data.business.operationMonths,
                tiempo_operacion_meses: data.business.operationMonths,
                registrationDate: new Date().toISOString(),
                fecha_registro: new Date().toISOString(),
                _isPending: true, // Marcar como pendiente de BD
                _tempId: tempId, // Guardar ID temporal para referencia
                
                // Incluir datos del usuario si están disponibles
                User: userData ? {
                    id: userData.id,
                    email: userData.email,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    phoneContact: userData.phoneContact
                } : null,
                // Relaciones anidadas con estructura completa
                BusinessModel: {
                    id: null,
                    businessId: tempId,
                    emprendimiento_id: tempId,
                    valueProposition: data.businessModel.valueProposition,
                    propuesta_valor: data.businessModel.valueProposition,
                    customerSegment: data.businessModel.customerSegment,
                    segmento_clientes: data.businessModel.customerSegment,
                    salesChannels: data.businessModel.salesChannels,
                    canales_venta: data.businessModel.salesChannels,
                    incomeSources: data.businessModel.incomeSources,
                    fuentes_ingreso: data.businessModel.incomeSources,
                    registrationDate: new Date().toISOString(),
                    fecha_registro: new Date().toISOString()
                },
                
                Finance: {
                    id: null,
                    businessId: tempId,
                    emprendimiento_id: tempId,
                    monthlyNetSales: data.finance.monthlyNetSales,
                    ventas_netas_mes: data.finance.monthlyNetSales,
                    monthlyProfitability: data.finance.monthlyProfitability,
                    rentabilidad_mensual: data.finance.monthlyProfitability,
                    financingSources: data.finance.financingSources,
                    fuentes_financiamiento: data.finance.financingSources,
                    monthlyFixedCosts: data.finance.monthlyFixedCosts,
                    costos_fijos_mensuales: data.finance.monthlyFixedCosts,
                    registrationDate: new Date().toISOString(),
                    fecha_registro: new Date().toISOString()
                },
                
                WorkTeam: {
                    id: null,
                    businessId: tempId,
                    emprendimiento_id: tempId,
                    businessTrainingLevel: data.workTeam.businessTrainingLevel,
                    nivel_formacion_empresarial: data.workTeam.businessTrainingLevel,
                    hasTrainedStaff: data.workTeam.hasTrainedStaff,
                    personal_capacitado: data.workTeam.hasTrainedStaff,
                    hasDefinedRoles: data.workTeam.hasDefinedRoles,
                    roles_definidos: data.workTeam.hasDefinedRoles,
                    employeeCount: data.workTeam.employeeCount || 0,
                    cantidad_empleados: data.workTeam.employeeCount || 0,
                    registrationDate: new Date().toISOString(),
                    fecha_registro: new Date().toISOString()
                },
                
                Rating: {
                    id: null,
                    businessId: tempId,
                    emprendimiento_id: tempId,
                    generalDataScore: operationTimeScore,
                    puntaje_datos_generales: operationTimeScore,
                    businessModelScore: 0,
                    puntaje_modelo_negocio: 0,
                    financeScore: financeScore,
                    puntaje_finanzas: financeScore,
                    workTeamScore: workTeamScore,
                    puntaje_equipo_trabajo: workTeamScore,
                    socialImpactScore: 0,
                    puntaje_impacto_social: 0,
                    totalScore: totalScore,
                    puntaje_total: totalScore,
                    totalPercentage: totalPercentage,
                    porcentaje_total: totalPercentage,
                    globalClassification: globalClassification,
                    clasificacion_global: globalClassification,
                    calculationDate: new Date().toISOString(),
                    fecha_calculo: new Date().toISOString()
                }
            };

            // Cachear en múltiples claves para acceso rápido
            const characterizationKey = cacheService.generateCacheKey('characterization:user', { userId });
            const dashboardKey = cacheService.generateCacheKey('dashboard:user', { userId });

            await cacheService.set(characterizationKey, cachedBusiness, cacheService.CRITICAL_DATA_TTL);
            
            // Dashboard data
            const dashboardData = this.buildDashboardData(cachedBusiness);
            await cacheService.set(dashboardKey, dashboardData, cacheService.CRITICAL_DATA_TTL);

            // Cachear también en clave individual para acceso directo
            const businessKey = cacheService.generateCacheKey('admin:business', { businessId: tempId });
            await cacheService.set(businessKey, cachedBusiness, cacheService.CRITICAL_DATA_TTL);

            // AGREGAR a la lista administrativa (no solo invalidar)
            await this.addToAdminBusinessesList(cachedBusiness);

            // Publicar evento de actualización de caché vía Redis Pub/Sub
            await this.publishCacheUpdateEvent('NEW_BUSINESS', { userId, tempId, businessData: cachedBusiness });

            console.log(`💾 Caché actualizado para userId ${userId} (datos pendientes)`);
            console.log(`   ✅ Agregado a lista admin con ID temporal: ${tempId}`);

        } catch (error) {
            console.error('❌ Error actualizando caché con datos pendientes:', error);
            // No lanzar error, el evento ya está en Kafka
        }
    }

    /**
     * Actualiza el caché con cambios parciales
     * @param {number} businessId - ID del emprendimiento
     * @param {Object} updates - Datos actualizados
     */
    async updateCacheWithUpdates(businessId, updates) {
        try {
            // Obtener datos actuales del caché
            const cacheKey = cacheService.generateCacheKey('admin:business', { businessId });
            let currentData = await cacheService.get(cacheKey);

            if (!currentData) {
                console.warn(`⚠️  No hay datos en caché para businessId ${businessId}, no se puede actualizar`);
                return;
            }

            // Aplicar actualizaciones
            const updatedData = {
                ...currentData,
                ...updates,
                _isPending: true, // Marcar como pendiente de sincronización
                _lastUpdate: new Date().toISOString()
            };

            // Actualizar todas las claves relacionadas
            await cacheService.set(cacheKey, updatedData, cacheService.CRITICAL_DATA_TTL);
            
            // Actualizar también characterization:user si existe userId
            if (updatedData.userId) {
                const charKey = cacheService.generateCacheKey('characterization:user', { 
                    userId: updatedData.userId 
                });
                await cacheService.set(charKey, updatedData, cacheService.CRITICAL_DATA_TTL);
            }

            console.log(`💾 Caché actualizado para businessId ${businessId} (actualización pendiente)`);

        } catch (error) {
            console.error('❌ Error actualizando caché:', error);
            // No lanzar error, el evento ya está en Kafka
        }
    }

    // ============= MÉTODOS DE CÁLCULO (copiados de characterizationService) =============

    calculateOperationTimeScore(operationMonths) {
        switch (operationMonths) {
            case 'menos_6_meses': return 0;
            case '6_12_meses': return 1;
            case '12_24_meses': return 2;
            case 'mas_24_meses': return 3;
            default: return 0;
        }
    }

    calculateFinanceScores(financeData) {
        let score = 0;

        switch (financeData.monthlyNetSales) {
            case 'menos_1_smmlv': score += 0; break;
            case '1_3_smmlv': score += 1; break;
            case '3_mas_smmlv': score += 2; break;
        }

        switch (financeData.monthlyProfitability) {
            case 'menos_medio_smmlv': score += 0; break;
            case 'medio_1_smmlv': score += 1; break;
            case '2_mas_smmlv': score += 2; break;
        }

        switch (financeData.monthlyFixedCosts) {
            case 'menos_medio_smmlv': score += 0; break;
            case 'medio_1_smmlv': score += 1; break;
            case '2_mas_smmlv': score += 2; break;
        }

        return score;
    }

    calculateWorkTeamScores(workTeamData) {
        let score = 0;

        switch (workTeamData.businessTrainingLevel) {
            case 'sin_formacion': score += 0; break;
            case 'tecnica_profesional': score += 1; break;
            case 'administracion_emprendimiento': score += 2; break;
        }

        score += workTeamData.hasTrainedStaff ? 1 : 0;
        score += workTeamData.hasDefinedRoles ? 1 : 0;

        return score;
    }

    calculateGlobalClassification(totalScore) {
        const percentage = (totalScore / 13) * 100;

        if (percentage < 30) return 'idea_inicial';
        if (percentage < 70) return 'en_desarrollo';
        return 'consolidado';
    }

    buildDashboardData(business) {
        const rating = business.Rating;
        if (!rating) return null;

        const maxTotal = 13;
        const totalPercentage = parseFloat(rating.totalPercentage) || 0;
        const generalDataScore = parseInt(rating.generalDataScore) || 0;
        const financeScore = parseInt(rating.financeScore) || 0;
        const workTeamScore = parseInt(rating.workTeamScore) || 0;

        return {
            puntajeTotal: parseInt(rating.totalScore) || 0,
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
                }
            ],
            emprendimiento: {
                nombre: business.name,
                sector: business.economicSector,
                anioCreacion: business.creationYear,
                encargado: business.managerName
            },
            fechaCalculo: rating.calculationDate,
            _isPending: business._isPending || false
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
     * Agrega un nuevo emprendimiento a la lista administrativa en caché
     * Esto permite que los admins vean emprendimientos nuevos aunque la BD esté caída
     */
    async addToAdminBusinessesList(newBusiness) {
        try {
            const { redisClient, isRedisAvailable } = require('../config/redis');
            
            if (!isRedisAvailable()) {
                console.log('⚠️  Redis no disponible, no se puede actualizar lista admin');
                return;
            }

            const cacheKey = 'admin:all-businesses';
            
            // Obtener lista actual
            let businesses = await cacheService.get(cacheKey);
            
            if (!businesses) {
                // Si no hay lista, crear una nueva con este emprendimiento
                businesses = [newBusiness];
            } else {
                // Verificar si ya existe por ID, userId o _tempId
                const exists = businesses.some(b => {
                    // Mismo ID
                    if (b.id === newBusiness.id) return true;
                    // Mismo usuario y ambos pendientes
                    if (b.userId === newBusiness.userId && b._isPending && newBusiness._isPending) return true;
                    // Mismo _tempId
                    if (b._tempId && b._tempId === newBusiness._tempId) return true;
                    return false;
                });
                
                if (!exists) {
                    // Agregar al inicio de la lista (más reciente primero)
                    businesses = [newBusiness, ...businesses];
                } else {
                    console.log(`⚠️  Emprendimiento ya existe en lista, no se agregará duplicado`);
                }
            }
            
            // Guardar lista actualizada con TTL corto
            await cacheService.set(cacheKey, businesses, 300); // 5 minutos
            
            console.log(`✅ Lista admin actualizada (total: ${businesses.length})`);
            
            // También invalidar estadísticas para que se recalculen
            await cacheService.delete('admin:statistics');
            
        } catch (error) {
            console.error('⚠️  Error agregando a lista admin:', error.message);
        }
    }

    /**
     * Invalida todos los cachés administrativos que listan emprendimientos
     */
    async invalidateAdminCaches() {
        try {
            // Invalidar lista completa de emprendimientos
            await cacheService.delete('admin:all-businesses');
            
            // Invalidar estadísticas administrativas
            await cacheService.delete('admin:statistics');
            
            // Invalidar cachés de usuarios (lista de todos los emprendedores)
            await cacheService.delete('admin:all-users');
            
            console.log('🔄 Cachés administrativos invalidados');
        } catch (error) {
            console.error('⚠️  Error invalidando cachés administrativos:', error.message);
        }
    }

    /**
     * Publica evento de actualización de caché vía Redis Pub/Sub
     * para notificar a otras instancias de la aplicación
     */
    async publishCacheUpdateEvent(eventType, data) {
        try {
            const { redisClient, isRedisAvailable } = require('../config/redis');
            
            if (!isRedisAvailable()) {
                return;
            }

            const event = {
                type: eventType,
                timestamp: Date.now(),
                data: data
            };

            await redisClient.publish('cache-updates', JSON.stringify(event));
            console.log(`📢 Evento de caché publicado: ${eventType}`);
        } catch (error) {
            console.error('⚠️  Error publicando evento de caché:', error.message);
        }
    }
}

module.exports = new KafkaWriteService();
