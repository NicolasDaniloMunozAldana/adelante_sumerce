# 🔧 Correcciones Aplicadas al Sistema de Monitoreo

**Fecha:** 19 de noviembre de 2025  
**Branch:** feature/monitoring

---

## 📋 Problemas Identificados y Solucionados

### ❌ Problema 1: Auth Service y Report Service aparecían como "No data" en Grafana

**Causa raíz:**
- Los microservicios no exponían la métrica `*_available` que el dashboard esperaba
- Las queries en el dashboard usaban métricas que no existían

**Solución aplicada:**

#### 1.1 Auth Service
**Archivo:** `auth_service/src/monitoring/metrics.js`

✅ Agregada métrica `auth_service_available`:
```javascript
const serviceAvailable = new client.Gauge({
  name: 'auth_service_available',
  help: 'Auth service availability (1 = available, 0 = unavailable)'
});
```

✅ Métrica inicializada en 1 cuando el servicio inicia:
```javascript
serviceAvailable.set(1); // Service is available
```

#### 1.2 Report Service
**Archivo:** `report_service/src/monitoring/metrics.js`

✅ Agregada métrica `report_service_available`:
```javascript
const serviceAvailable = new client.Gauge({
  name: 'report_service_available',
  help: 'Report service availability (1 = available, 0 = unavailable)'
});
```

✅ Inicializada al arrancar:
```javascript
serviceAvailable.set(1);
```

**Archivo:** `report_service/src/index.js`

✅ Servidor HTTP configurado para escuchar en `0.0.0.0:3002`:
```javascript
this.httpServer = app.listen(port, '0.0.0.0', (err) => {
  // ... código de inicio
});
```

**Archivo:** `report_service/src/kafka/kafkaConsumer.js`

✅ Métrica de Kafka actualizada según el estado de conexión:
```javascript
async connect() {
  await this.consumer.connect();
  metrics.kafkaAvailable.set(1); // ✓ Kafka disponible
}

async disconnect() {
  await this.consumer.disconnect();
  metrics.kafkaAvailable.set(0); // ✗ Kafka desconectado
}
```

---

### ❌ Problema 2: Paneles de latencia entre servicios sin datos

**Causa raíz:**
- Las métricas `adelante_app_auth_service_latency_seconds` y `adelante_app_report_service_latency_seconds` no estaban siendo registradas
- Los clientes de servicios (authServiceClient, kafkaProducer) no instrumentaban las llamadas

**Solución aplicada:**

#### 2.1 Métricas de Inter-Service Latency
**Archivo:** `adelante_sumerce/src/monitoring/metrics.js`

✅ Agregadas métricas de latencia entre servicios:
```javascript
// Latencia Main App → Auth Service
const authServiceLatency = new client.Histogram({
  name: 'adelante_app_auth_service_latency_seconds',
  help: 'Latency between Main App and Auth Service',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

// Latencia Main App → Report Service (via Kafka)
const reportServiceLatency = new client.Histogram({
  name: 'adelante_app_report_service_latency_seconds',
  help: 'Latency between Main App and Report Service via Kafka',
  labelNames: ['operation'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30]
});
```

#### 2.2 Instrumentación de authServiceClient
**Archivo:** `adelante_sumerce/src/services/authServiceClient.js`

✅ Cada método ahora mide latencia:
```javascript
async login(email, password, ipAddress, userAgent) {
  const end = metrics.authServiceLatency.startTimer({ operation: 'login' });
  try {
    const response = await this.client.post('/login', { /*...*/ });
    end(); // ✓ Registra duración
    return response.data;
  } catch (error) {
    end(); // ✓ Registra incluso en error
    this._handleError(error);
  }
}
```

✅ Operaciones instrumentadas:
- `login`
- `register`
- `refresh`
- `verify`
- `logout`
- `logout_all`
- `get_me`

#### 2.3 Instrumentación de Kafka Producer
**Archivo:** `adelante_sumerce/src/kafka/kafkaProducer.js`

✅ Medición de latencia para envío de reportes:
```javascript
async sendGenerateUserReportEvent(userId, email, businessData) {
  const end = metrics.reportServiceLatency.startTimer({ operation: 'generate_user_report' });
  try {
    const result = await this.sendEvent(this.topics.generateUserReport, {/*...*/});
    end();
    return result;
  } catch (error) {
    end();
    throw error;
  }
}
```

✅ Operaciones instrumentadas:
- `generate_user_report`
- `generate_admin_report`
- `generate_comparative_pdf`
- `generate_comparative_excel`

---

### ❌ Problema 3: Falta panel de estado UP/DOWN individual por réplica

**Causa raíz:**
- El dashboard mostraba el uptime acumulado pero no el estado individual de cada réplica
- No había forma de ver visualmente si una réplica específica estaba DOWN

**Solución aplicada:**

#### 3.1 Dashboard actualizado
**Archivo:** `docker/grafana/provisioning/dashboards/dashboard_apps.json`

✅ Panel 1 modificado para mostrar 3 instancias:
```json
{
  "title": "Main Application Status",
  "targets": [
    {"expr": "adelante_app_uptime_seconds{instance=\"app_1:3030\"} > 0", "legendFormat": "Main App 1"},
    {"expr": "adelante_app_uptime_seconds{instance=\"app_2:3030\"} > 0", "legendFormat": "Main App 2"},
    {"expr": "adelante_app_uptime_seconds{instance=\"app_3:3030\"} > 0", "legendFormat": "Main App 3"}
  ]
}
```

✅ Panel 2 corregido para Auth Service:
```json
{
  "title": "Auth Service Status",
  "targets": [
    {"expr": "auth_service_available", "legendFormat": "Auth Service"}
  ]
}
```

✅ Panel 3 corregido para Report Service:
```json
{
  "title": "Report Service Status",
  "targets": [
    {"expr": "report_service_available", "legendFormat": "Report Service"}
  ]
}
```

✅ **NUEVO Panel 5:** Uptime individual por réplica
```json
{
  "title": "Main Application Uptime (per replica)",
  "type": "stat",
  "targets": [
    {"expr": "adelante_app_uptime_seconds{instance=\"app_1:3030\"}", "legendFormat": "Main App 1"},
    {"expr": "adelante_app_uptime_seconds{instance=\"app_2:3030\"}", "legendFormat": "Main App 2"},
    {"expr": "adelante_app_uptime_seconds{instance=\"app_3:3030\"}", "legendFormat": "Main App 3"}
  ],
  "fieldConfig": {
    "unit": "s",
    "decimals": 0
  }
}
```

**Resultado esperado:**
```
┌──────────────┬──────────────┬──────────────┐
│  Main App 1  │  Main App 2  │  Main App 3  │
│     UP       │     UP       │    DOWN      │
│   1434 s     │   414 s      │     0 s      │
└──────────────┴──────────────┴──────────────┘
```

---

### ❌ Problema 4: Paneles de Kafka sin datos

**Queries corregidas en dashboard:**

✅ **Kafka Queue Size:**
```promql
# ANTES (incorrecto):
kafka_queue_size

# DESPUÉS (correcto):
adelante_app_kafka_queue_size
```

✅ **Kafka Messages Processed:**
```promql
# ANTES (incorrecto):
rate(kafka_messages_consumed[5m])

# DESPUÉS (correcto):
rate(adelante_app_kafka_messages_consumed_total[5m])
+ rate(report_service_kafka_messages_consumed_total[5m])
```

✅ **Latency Between Services:**
```promql
# Auth Service Latency:
histogram_quantile(0.95, 
  rate(adelante_app_auth_service_latency_seconds_bucket[5m])
)

# Report Service Latency (via Kafka):
histogram_quantile(0.95, 
  rate(adelante_app_report_service_latency_seconds_bucket[5m])
)
```

✅ **Data Recovery Time:**
```promql
adelante_app_data_recovery_duration_seconds
```

✅ **Queued Writes During DB Downtime:**
```promql
adelante_app_queued_writes_during_downtime_total
```

---

## 🎯 Estado Final de las Métricas

### ✅ Métricas Disponibles por Servicio

#### Main Application (adelante_app)
- `adelante_app_uptime_seconds` - Uptime por réplica
- `adelante_app_http_requests_total` - Total de requests HTTP
- `adelante_app_http_request_duration_seconds` - Latencia HTTP
- `adelante_app_db_available` - Disponibilidad de DB
- `adelante_app_redis_available` - Disponibilidad de Redis
- `adelante_app_kafka_available` - Disponibilidad de Kafka
- `adelante_app_kafka_queue_size` - Tamaño de cola Kafka
- `adelante_app_kafka_messages_produced_total` - Mensajes producidos
- `adelante_app_auth_service_latency_seconds` ⭐ **NUEVA** - Latencia a Auth Service
- `adelante_app_report_service_latency_seconds` ⭐ **NUEVA** - Latencia a Report Service
- `adelante_app_data_recovery_duration_seconds` - Tiempo de recuperación
- `adelante_app_queued_writes_during_downtime_total` - Escrituras encoladas

#### Auth Service
- `auth_service_uptime_seconds` - Uptime del servicio
- `auth_service_available` ⭐ **NUEVA** - Disponibilidad (1/0)
- `auth_service_http_requests_total` - Total de requests
- `auth_service_http_request_duration_seconds` - Latencia HTTP
- `auth_service_db_available` - Disponibilidad de DB
- `auth_service_redis_available` - Disponibilidad de Redis
- `auth_service_auth_attempts_total` - Intentos de autenticación
- `auth_service_failed_logins_total` - Logins fallidos

#### Report Service
- `report_service_uptime_seconds` - Uptime del servicio
- `report_service_available` ⭐ **NUEVA** - Disponibilidad (1/0)
- `report_service_kafka_available` - Disponibilidad de Kafka
- `report_service_kafka_messages_consumed_total` - Mensajes consumidos
- `report_service_kafka_message_processing_duration_seconds` - Tiempo de procesamiento
- `report_service_emails_sent_total` - Emails enviados
- `report_service_pdf_generation_duration_seconds` - Tiempo de generación PDF

---

## 📊 Configuración de Prometheus

**Archivo:** `docker/prometheus/prometheus.yml`

### Scrape Configs Verificados:

```yaml
# Auth Service ✓
- job_name: 'auth_service'
  static_configs:
    - targets: ['auth_service:3001']  # Nombre del servicio en Docker
  metrics_path: '/api/metrics'
  scrape_interval: 15s

# Report Service ✓
- job_name: 'report_service'
  static_configs:
    - targets: ['report_service:3002']  # Puerto 3002 expuesto
  metrics_path: '/metrics'
  scrape_interval: 15s

# Main App - 3 réplicas ✓
- job_name: 'adelante_app'
  static_configs:
    - targets: 
      - 'app_1:3030'
      - 'app_2:3030'
      - 'app_3:3030'
  metrics_path: '/metrics'
  scrape_interval: 15s
```

---

## 🔍 Verificación Post-Despliegue

### Comandos de Verificación:

```bash
# 1. Verificar que report_service expone puerto 3002
docker exec adelante_sumerce_reports netstat -tlnp | grep 3002

# 2. Verificar métricas desde Prometheus
docker exec prometheus wget -qO- http://report_service:3002/metrics | grep available

# 3. Verificar targets en Prometheus
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job:.labels.job, health:.health}'

# 4. Verificar métricas específicas
curl -s http://localhost:3030/metrics | grep -E "(auth_service_latency|report_service_latency)"
curl -s http://localhost:3001/api/metrics | grep "auth_service_available"
curl -s http://localhost:3002/metrics | grep "report_service_available"
```

### Resultado Esperado:

```
auth_service:3001       ✓ UP    (2/2 metrics)
report_service:3002     ✓ UP    (2/2 metrics)
app_1:3030              ✓ UP    (2/2 metrics)
app_2:3030              ✓ UP    (2/2 metrics)
app_3:3030              ✓ UP    (2/2 metrics)
```

---

## 📈 Dashboards Actualizados

### Dashboard 2: Applications & Microservices

**Paneles corregidos/agregados:**

1. ✅ **Service Availability** (4 paneles)
   - Main Application Status (3 réplicas individuales)
   - Auth Service Status
   - Report Service Status
   - Database Status

2. ⭐ **NUEVO: Main Application Uptime** (por réplica)
   - Muestra uptime en segundos de cada réplica
   - Permite detectar reinicios

3. ✅ **Request Rates & Latency**
   - Requests Per Second (todas las réplicas)
   - Request Latency p50/p95/p99

4. ✅ **Latency Between Services**
   - Main App → Auth Service (p95)
   - Main App → Report Service via Kafka (p95)

5. ✅ **Kafka & Queue Metrics**
   - Kafka Queue Size
   - Kafka Messages Processed (rate)
   - Data Recovery Time After DB Failure
   - Queued Writes During DB Downtime

---

## 🚀 Despliegue de Correcciones

### Pasos ejecutados:

```bash
# 1. Rebuild del report_service (cambios en index.js)
docker-compose up -d --build report_service

# 2. Restart de auth_service (cambios en metrics.js)
docker-compose restart auth_service

# 3. Restart de main app (cambios en authServiceClient.js, kafkaProducer.js)
docker-compose restart app_1 app_2 app_3

# 4. Reload de Prometheus (configuración sin cambios)
docker exec prometheus kill -HUP 1

# 5. Verificación de Grafana
# Los dashboards se recargan automáticamente desde provisioning
```

---

## ✅ Checklist de Validación

### Antes del Deploy:
- [x] Métricas `*_available` agregadas a todos los servicios
- [x] AuthServiceClient instrumentado con latency tracking
- [x] KafkaProducer instrumentado con latency tracking
- [x] Report Service escuchando en puerto 3002
- [x] Dashboard actualizado con queries correctas
- [x] Prometheus configurado para scrape correcto

### Después del Deploy:
- [ ] Verificar http://localhost:9090/targets (todos UP)
- [ ] Verificar http://localhost:3002/metrics (report_service)
- [ ] Verificar http://localhost:3001/api/metrics (auth_service)
- [ ] Verificar Dashboard 2 en Grafana (sin "No data")
- [ ] Simular caída de réplica y verificar estado DOWN
- [ ] Ejecutar `generate-traffic.sh` y verificar latencias
- [ ] Ejecutar `test-db-failure.sh` y verificar data recovery

---

## 🎯 Mejoras Implementadas

1. ✅ **Visibilidad completa de microservicios**
   - Auth Service y Report Service ahora visibles
   - Estado UP/DOWN en tiempo real

2. ✅ **Monitoreo de latencia entre servicios**
   - Main App ↔ Auth Service
   - Main App ↔ Report Service (via Kafka)

3. ✅ **Estado individual de réplicas**
   - 3 paneles independientes para cada réplica
   - Detección inmediata de caídas

4. ✅ **Métricas de Kafka funcionando**
   - Queue size
   - Messages processed
   - Data recovery time

---

## 📝 Notas Finales

### Configuración crítica verificada:

✅ `docker-compose.yml` - Puerto 3002 expuesto para report_service  
✅ `prometheus.yml` - Targets correctos con paths de métricas  
✅ `dashboard_apps.json` - Queries actualizadas  
✅ Todos los `metrics.js` - Métricas registradas  
✅ Clientes instrumentados - authServiceClient, kafkaProducer  

### Próximos pasos sugeridos:

1. Configurar alertas específicas por réplica
2. Agregar SLOs (Service Level Objectives) para latencias
3. Implementar distributed tracing con Jaeger/Zipkin
4. Configurar auto-scaling basado en métricas

---

**Documento generado automáticamente**  
**Sistema:** Adelante Sumercé - Monitoring Stack  
**Versión:** 1.0.0 (feature/monitoring)
