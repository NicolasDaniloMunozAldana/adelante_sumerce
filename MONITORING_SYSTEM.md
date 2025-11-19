# 📊 Sistema de Monitoreo Completo - Adelante Sumercé

## 🎯 Descripción General

Este documento describe el sistema de monitoreo profesional implementado para el proyecto **Adelante Sumercé**, cumpliendo con todos los requisitos del despliegue en VPS de DigitalOcean.

## 🔧 Stack Tecnológico

- **Prometheus**: Recolección de métricas
- **Grafana**: Visualización y dashboards
- **Alertmanager**: Gestión de alertas
- **prom-client**: Cliente de Prometheus para Node.js
- **node_exporter**: Métricas del host
- **mysqld_exporter**: Métricas de MySQL
- **nginx_exporter**: Métricas de Nginx
- **cAdvisor**: Métricas de contenedores

---

## 📈 Métricas Implementadas

### 1. **Aplicación Principal (adelante_sumerce)**

#### HTTP Metrics
- `adelante_app_http_requests_total`: Total de peticiones HTTP por método, ruta y código de estado
- `adelante_app_http_request_duration_seconds`: Duración de peticiones HTTP (histograma)
- `adelante_app_active_connections`: Número de conexiones HTTP activas

#### Database Metrics
- `adelante_app_db_queries_total`: Total de queries por operación y tabla
- `adelante_app_db_query_duration_seconds`: Duración de queries (histograma)
- `adelante_app_db_active_connections`: Conexiones activas a la base de datos
- `adelante_app_db_connection_errors_total`: Total de errores de conexión
- `adelante_app_db_available`: Disponibilidad de la base de datos (1=up, 0=down)

#### Redis Metrics
- `adelante_app_redis_operations_total`: Total de operaciones de Redis
- `adelante_app_redis_operation_duration_seconds`: Duración de operaciones Redis
- `adelante_app_redis_cache_hit_rate`: Tasa de aciertos del caché (%)
- `adelante_app_redis_available`: Disponibilidad de Redis (1=up, 0=down)

#### Kafka Metrics
- `adelante_app_kafka_messages_produced_total`: Total de mensajes producidos
- `adelante_app_kafka_messages_consumed_total`: Total de mensajes consumidos
- `adelante_app_kafka_message_processing_duration_seconds`: Duración de procesamiento
- `adelante_app_kafka_queue_size`: Tamaño de la cola (mensajes pendientes)
- `adelante_app_kafka_available`: Disponibilidad de Kafka (1=up, 0=down)

#### Business Metrics
- `adelante_app_user_logins_total`: Total de logins de usuarios
- `adelante_app_characterization_operations_total`: Operaciones de caracterización
- `adelante_app_report_requests_total`: Solicitudes de reportes
- `adelante_app_data_recovery_duration_seconds`: Tiempo de recuperación tras caída de BD
- `adelante_app_queued_writes_during_downtime_total`: Escrituras encoladas durante downtime

### 2. **Auth Service**

#### Authentication Metrics
- `auth_service_auth_attempts_total`: Intentos de autenticación
- `auth_service_auth_duration_seconds`: Duración de autenticación
- `auth_service_active_tokens`: Tokens JWT activos
- `auth_service_token_operations_total`: Operaciones de tokens
- `auth_service_failed_logins_total`: Logins fallidos
- `auth_service_rate_limit_hits_total`: Límites de tasa alcanzados

#### Database & Cache Metrics
- `auth_service_db_queries_total`: Queries a la base de datos
- `auth_service_db_query_duration_seconds`: Duración de queries
- `auth_service_redis_operations_total`: Operaciones de Redis
- `auth_service_redis_cache_hit_rate`: Tasa de aciertos del caché

### 3. **Report Service**

#### Kafka Consumer Metrics
- `report_service_kafka_messages_consumed_total`: Mensajes consumidos
- `report_service_kafka_message_processing_duration_seconds`: Duración de procesamiento
- `report_service_kafka_consumer_lag`: Lag del consumidor

#### Report Generation Metrics
- `report_service_report_generation_total`: Total de reportes generados
- `report_service_report_generation_duration_seconds`: Duración de generación
- `report_service_active_report_generations`: Reportes en generación
- `report_service_report_queue_size`: Reportes pendientes

#### Email Metrics
- `report_service_emails_sent_total`: Emails enviados
- `report_service_email_send_duration_seconds`: Duración de envío
- `report_service_email_errors_total`: Errores de email

#### PDF/Excel Metrics
- `report_service_pdf_generation_total`: PDFs generados
- `report_service_pdf_generation_duration_seconds`: Duración de generación PDF
- `report_service_excel_generation_total`: Archivos Excel generados
- `report_service_excel_generation_duration_seconds`: Duración de generación Excel

### 4. **Sistema (Host)**

- CPU: Uso por núcleo y total
- Memoria: Uso, disponible, total
- Disco: Uso por partición
- Red: Tráfico de entrada/salida
- Load Average: 1m, 5m, 15m
- Uptime del sistema

### 5. **Base de Datos (MySQL)**

- `mysql_up`: Estado de MySQL
- `mysql_global_status_threads_connected`: Conexiones activas
- `mysql_global_status_threads_running`: Threads ejecutándose
- `mysql_global_status_commands_total`: Comandos ejecutados
- `mysql_global_status_slow_queries`: Queries lentas
- `mysql_global_status_innodb_buffer_pool_*`: Métricas de InnoDB

---

## 🚨 Alertas Configuradas

### Disponibilidad (Critical)

1. **ServiceDown**
   - Condición: `up == 0`
   - Duración: 1 minuto
   - Severidad: Critical

2. **DatabaseDown**
   - Condición: `mysql_up == 0`
   - Duración: 30 segundos
   - Severidad: Critical

3. **KafkaDown**
   - Condición: Kafka no disponible
   - Duración: 1 minuto
   - Severidad: Critical

### Rendimiento (Warning)

4. **HighLatency**
   - Condición: P95 > 1s
   - Duración: 5 minutos
   - Severidad: Warning

5. **HighErrorRate**
   - Condición: >5% errores 5xx
   - Duración: 5 minutos
   - Severidad: Warning

### Recursos (Critical/Warning)

6. **HighCPUUsage**
   - Condición: CPU > 85%
   - Duración: 5 minutos
   - Severidad: Critical

7. **HighMemoryUsage**
   - Condición: Memoria > 85%
   - Duración: 5 minutos
   - Severidad: Critical

8. **HighDiskUsage**
   - Condición: Disco > 80%
   - Duración: 5 minutos
   - Severidad: Warning

### Base de Datos

9. **HighMySQLConnections**
   - Condición: >80% de conexiones usadas
   - Duración: 5 minutos
   - Severidad: Warning

10. **MySQLSlowQueries**
    - Condición: >5 queries lentas/segundo
    - Duración: 5 minutos
    - Severidad: Warning

### Aplicación

11. **HighKafkaQueueSize**
    - Condición: >100 mensajes pendientes
    - Duración: 5 minutos
    - Severidad: Warning

12. **SlowDataRecovery**
    - Condición: Recuperación >60 segundos
    - Duración: 1 minuto
    - Severidad: Warning

---

## 📊 Dashboards de Grafana

### Dashboard 1: Estado del Sistema (Host)

**Ubicación**: `dashboard_system.json`

**Paneles**:
- System Uptime (gauge)
- Load Average 1m (gauge)
- CPU Usage % (gauge + gráfico)
- Memory Usage % (gauge + gráfico)
- Memory Usage Bytes (gráfico)
- Disk Usage % (bar gauge)
- Network Traffic (gráfico)
- Load Average histórico (gráfico)

**Actualización**: 10 segundos

### Dashboard 2: App y Microservicios

**Ubicación**: `dashboard_apps.json`

**Secciones**:

#### Service Availability
- Main Application Status
- Auth Service Status
- Report Service Status
- Database Status

#### Request Rates & Latency
- Requests Per Second (RPS)
- Request Latency (p50, p95, p99)
- Latency Main App → Auth Service
- Latency Main App → Report Service (via Kafka)

#### Errors & Performance
- 5xx Errors Per Minute
- Application Errors Per Minute
- Errors por endpoint

#### Kafka & Queue Metrics
- Kafka Queue Size (pending messages)
- Kafka Messages Processed
- Data Recovery Time After DB Failure
- Queued Writes During DB Downtime

**Actualización**: 10 segundos

### Dashboard 3: Base de Datos

**Ubicación**: `dashboard_database.json`

**Secciones**:

#### Database Status
- MySQL Status (UP/DOWN)
- MySQL Uptime
- Active Connections
- Connection Usage %

#### Connections & Traffic
- MySQL Connections Over Time
- Query Operations Per Second (SELECT, INSERT, UPDATE, DELETE)

#### Query Performance & Latency
- Database Query Latency (p50, p95, p99)
- Slow Queries Rate
- Application Database Queries
- Database Errors

#### InnoDB & Buffer Pool
- InnoDB Buffer Pool Usage
- InnoDB Read Operations

**Actualización**: 10 segundos

---

## 🔍 Métricas Requeridas por el Proyecto

### 1. Disponibilidad del Sistema
**Métrica**: Porcentaje de tiempo operativo tras caída de BD

```promql
# Uptime de la aplicación
adelante_app_uptime_seconds

# Disponibilidad de la base de datos
adelante_app_db_available

# Tiempo de inactividad (inverso de uptime)
(time() - adelante_app_uptime_seconds)
```

**Dashboard**: Dashboard 2 - Service Availability

### 2. Latencia Promedio entre App y Microservicios

```promql
# Latencia App → Auth Service
histogram_quantile(0.95, rate(auth_service_auth_duration_seconds_bucket[5m]))

# Latencia App → Report Service (vía Kafka)
histogram_quantile(0.95, rate(report_service_kafka_message_processing_duration_seconds_bucket[5m]))
```

**Dashboard**: Dashboard 2 - Request Rates & Latency

### 3. Tiempo de Recuperación de Datos

```promql
# Tiempo que tarda en procesar escrituras encoladas
adelante_app_data_recovery_duration_seconds

# Total de escrituras encoladas
adelante_app_queued_writes_during_downtime_total
```

**Dashboard**: Dashboard 2 - Kafka & Queue Metrics

### 4. Consumo de Recursos (CPU, RAM)

```promql
# CPU por componente
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)

# Memoria por componente
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# CPU de contenedores (via cAdvisor)
rate(container_cpu_usage_seconds_total{name=~"adelante.*"}[1m])

# Memoria de contenedores
container_memory_usage_bytes{name=~"adelante.*"}
```

**Dashboard**: Dashboard 1 - Estado del Sistema

### 5. Requests Por Segundo

```promql
# RPS de la aplicación principal
rate(adelante_app_http_requests_total[1m])

# RPS de Auth Service
rate(auth_service_http_requests_total[1m])

# RPS bajo fallo de BD
rate(adelante_app_http_requests_total{status_code!~"5.."}[1m]) 
  and on() (adelante_app_db_available == 0)
```

**Dashboard**: Dashboard 2 - Request Rates & Latency

### 6. Logs de Errores

```promql
# Errores de aplicación
rate(adelante_app_errors_total[1m])

# Errores 5xx
rate(adelante_app_http_requests_total{status_code=~"5.."}[1m])

# Errores de base de datos
rate(adelante_app_db_connection_errors_total[1m])
```

**Dashboard**: Dashboard 2 - Errors & Performance

---

## 🚀 Endpoints de Métricas

### Aplicación Principal
```
GET http://localhost:3030/metrics
GET http://localhost:3030/health
GET http://localhost:3030/ready
GET http://localhost:3030/live
```

### Auth Service
```
GET http://localhost:3001/api/metrics
GET http://localhost:3001/api/health
GET http://localhost:3001/api/ready
GET http://localhost:3001/api/live
```

### Report Service
```
GET http://localhost:3002/metrics
GET http://localhost:3002/health
GET http://localhost:3002/ready
GET http://localhost:3002/live
```

---

## 🔧 Configuración

### Prometheus Scrape Config

```yaml
scrape_configs:
  # Main App - 3 réplicas
  - job_name: 'adelante_app'
    static_configs:
      - targets: 
        - 'app_1:3030'
        - 'app_2:3030'
        - 'app_3:3030'
    metrics_path: '/metrics'
    scrape_interval: 15s

  # Auth Service
  - job_name: 'auth_service'
    static_configs:
      - targets: ['auth_service:3001']
    metrics_path: '/api/metrics'
    scrape_interval: 15s

  # Report Service
  - job_name: 'report_service'
    static_configs:
      - targets: ['report_service:3002']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### Alertmanager Email Config

```yaml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'munozaldananicolas@gmail.com'
  smtp_auth_username: 'munozaldananicolas@gmail.com'
  smtp_auth_password: 'jzkorrdeccuvlzyo'

receivers:
  - name: 'email-notifications'
    email_configs:
      - to: 'munozaldananicolasdanilo@gmail.com'
```

---

## 📦 Instalación

### 1. Instalar dependencias

```bash
# App principal
cd adelante_sumerce
npm install

# Auth Service
cd ../auth_service
npm install

# Report Service
cd ../report_service
npm install
```

### 2. Levantar el stack completo

```bash
# Desde la raíz del proyecto
docker-compose up -d
```

### 3. Verificar servicios

```bash
# Prometheus
curl http://localhost:9090/-/healthy

# Grafana
curl http://localhost:3000/api/health

# Alertmanager
curl http://localhost:9094/-/healthy
```

### 4. Acceder a Grafana

```
URL: http://localhost:3000
Usuario: admin
Password: admin
```

Los dashboards se cargan automáticamente desde `/docker/grafana/provisioning/dashboards/`

---

## 📊 Cómo usar los Dashboards

### Visualizar métricas en tiempo real

1. Acceder a Grafana: `http://localhost:3000`
2. Ir a **Dashboards** → Buscar "Adelante"
3. Seleccionar:
   - **Dashboard 1 - Estado del Sistema (Host)**
   - **Dashboard 2 - App & Microservicios**
   - **Dashboard 3 - Base de Datos**

### Simular caída de base de datos

```bash
# Detener MySQL
docker-compose stop mysql

# Observar en Dashboard 2:
# - Database Status → DOWN
# - Queued Writes During DB Downtime → aumenta
# - Kafka Queue Size → aumenta

# Reiniciar MySQL
docker-compose start mysql

# Observar:
# - Data Recovery Time After DB Failure
# - El sistema procesa las escrituras encoladas
```

### Generar carga

```bash
# Instalar herramienta de carga (Apache Bench)
# En la VPS
sudo apt-get install apache2-utils

# Generar 1000 requests con 10 concurrentes
ab -n 1000 -c 10 http://localhost:81/

# Observar en Dashboard 2:
# - Requests Per Second
# - Request Latency
# - CPU/Memory usage
```

---

## 📧 Notificaciones de Alertas

Las alertas se envían por email a: `munozaldananicolasdanilo@gmail.com`

**Ejemplo de alerta**:

```
[ALERTA] HighCPUUsage

Description: CPU > 85% por 5 minutos en adelante-host
Severity: critical
Instance: adelante-host
Summary: Alto uso de CPU
Details: CPU > 85% por 5 minutos en adelante-host
```

---

## 🐛 Troubleshooting

### Prometheus no scrapeando métricas

```bash
# Verificar targets en Prometheus
http://localhost:9090/targets

# Verificar logs
docker logs prometheus

# Validar que los servicios exponen /metrics
curl http://app_1:3030/metrics
```

### Grafana sin datos

```bash
# Verificar datasource
http://localhost:3000/datasources

# Verificar que Prometheus tiene datos
http://localhost:9090/graph
# Query: up
```

### Alertas no enviándose

```bash
# Verificar Alertmanager
http://localhost:9094/#/alerts

# Ver logs
docker logs alertmanager

# Verificar reglas en Prometheus
http://localhost:9090/alerts
```

---

## 📝 Notas Importantes

1. **Persistencia**: Los datos de Prometheus se almacenan en el volumen `prometheus_data`
2. **Retención**: Por defecto Prometheus retiene datos por 15 días
3. **Escalabilidad**: El sistema monitorea las 3 réplicas de la app principal
4. **Seguridad**: En producción, cambiar las credenciales de Grafana y Alertmanager

---

## 📚 Referencias

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [prom-client (Node.js)](https://github.com/siimon/prom-client)
- [Node Exporter](https://github.com/prometheus/node_exporter)

---

**Autor**: Sistema de Monitoreo Adelante Sumercé  
**Versión**: 1.0.0  
**Fecha**: Noviembre 2025
