# Guía de Monitoreo - Adelante Sumerce

## Stack de Monitoreo

Este proyecto incluye un stack completo de monitoreo con:

- **Prometheus**: Recolección y almacenamiento de métricas
- **Grafana**: Visualización de métricas y dashboards
- **Alertmanager**: Gestión de alertas
- **cAdvisor**: Métricas de contenedores Docker
- **Node Exporter**: Métricas del host (Windows)
- **MySQL Exporter**: Métricas de la base de datos
- **Nginx Exporter**: Métricas del balanceador de carga

## Inicio Rápido

### 1. Iniciar el Stack de Monitoreo

```powershell
.\start-monitoring.ps1
```

Este script:
- Verifica que Docker esté corriendo
- Detiene contenedores previos
- Construye las imágenes necesarias
- Inicia todos los servicios en el orden correcto
- Espera a que los servicios estén listos

### 2. Verificar el Estado

```powershell
.\check-monitoring.ps1
```

Este script verifica:
- Estado de contenedores
- Salud de endpoints
- Targets de Prometheus
- Datasources de Grafana
- Reglas de alertas
- Métricas clave

## Acceso a las Interfaces

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| **Aplicación** | http://localhost | - |
| **Grafana** | http://localhost:3000 | admin/admin |
| **Prometheus** | http://localhost:9090 | - |
| **Alertmanager** | http://localhost:9093 | - |
| **cAdvisor** | http://localhost:8080 | - |
| **Node Exporter** | http://localhost:9100/metrics | - |
| **MySQL Exporter** | http://localhost:9104/metrics | - |
| **Nginx Exporter** | http://localhost:9113/metrics | - |

## Métricas Monitoreadas

### 1. Disponibilidad del Sistema
- **Métrica**: `up`
- **Descripción**: Indica si un servicio está activo (1) o caído (0)
- **Query Prometheus**: `up{job="app_instances"}`

### 2. Latencia de Peticiones
- **Métrica**: `http_request_duration_seconds`
- **Descripción**: Tiempo de respuesta de las peticiones HTTP
- **Query Prometheus**: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`

### 3. Consumo de CPU
- **Métrica**: `process_cpu_seconds_total`
- **Descripción**: Uso de CPU por proceso
- **Query Prometheus**: `rate(process_cpu_seconds_total[5m]) * 100`

### 4. Consumo de Memoria
- **Métrica**: `process_resident_memory_bytes`
- **Descripción**: Memoria RAM utilizada
- **Query Prometheus**: `process_resident_memory_bytes`

### 5. Estado de MySQL
- **Métrica**: `mysql_up`
- **Descripción**: Estado de la base de datos
- **Query Prometheus**: `mysql_up`

### 6. Conexiones MySQL
- **Métrica**: `mysql_global_status_threads_connected`
- **Descripción**: Número de conexiones activas
- **Query Prometheus**: `mysql_global_status_threads_connected`

### 7. Tasa de Errores
- **Métrica**: `http_requests_total{status=~"5.."}`
- **Descripción**: Peticiones HTTP con errores 5xx
- **Query Prometheus**: `rate(http_requests_total{status=~"5.."}[5m])`

## Alertas Configuradas

### Alertas de Disponibilidad

#### ServiceDown
- **Condición**: `up == 0` por más de 1 minuto
- **Severidad**: Critical
- **Descripción**: Un servicio está caído

#### HighErrorRate
- **Condición**: Más del 5% de errores 5xx en 5 minutos
- **Severidad**: Warning
- **Descripción**: Alta tasa de errores en la aplicación

### Alertas de Latencia

#### HighLatency
- **Condición**: P95 de latencia > 1 segundo por 5 minutos
- **Severidad**: Warning
- **Descripción**: Respuestas lentas en la aplicación

### Alertas de Recursos

#### HighCPUUsage
- **Condición**: CPU > 80% por 5 minutos
- **Severidad**: Warning
- **Descripción**: Alto consumo de CPU

#### HighMemoryUsage
- **Condición**: Memoria > 80% por 5 minutos
- **Severidad**: Warning
- **Descripción**: Alto consumo de memoria

### Alertas de Base de Datos

#### MySQLDown
- **Condición**: `mysql_up == 0` por más de 1 minuto
- **Severidad**: Critical
- **Descripción**: Base de datos caída

#### HighMySQLConnections
- **Condición**: Más del 80% de conexiones en uso
- **Severidad**: Warning
- **Descripción**: Muchas conexiones activas

## Simulación de Fallos

### 1. Simular Caída de Base de Datos

```powershell
# Detener MySQL
docker stop adelante_sumerce_mysql

# Esperar y observar métricas
Start-Sleep -Seconds 60

# Reiniciar MySQL
docker start adelante_sumerce_mysql
```

**Métricas a observar:**
- `mysql_up` cambiará a 0
- Alertas se activarán
- Tiempo de recuperación

### 2. Simular Alta Carga

```powershell
# Instalar Apache Bench (si no está instalado)
# choco install apache-httpd

# Generar carga
ab -n 10000 -c 100 http://localhost/
```

**Métricas a observar:**
- Incremento en `http_requests_total`
- Latencia de respuesta
- Uso de CPU y memoria

### 3. Simular Caída de Réplica

```powershell
# Detener una réplica
docker stop adelante_sumerce_app_1

# Nginx debería redirigir a otras réplicas
# Verificar que el servicio sigue funcionando

# Reiniciar
docker start adelante_sumerce_app_1
```

## Comandos Útiles

### Ver Logs de un Servicio

```powershell
docker-compose logs -f prometheus
docker-compose logs -f grafana
docker-compose logs -f mysqld_exporter
```

### Ver Estado de Contenedores

```powershell
docker-compose ps
```

### Reiniciar un Servicio

```powershell
docker-compose restart prometheus
```

### Detener Todo

```powershell
docker-compose down
```

### Detener y Limpiar Volúmenes

```powershell
docker-compose down -v
```

### Ver Uso de Recursos

```powershell
docker stats
```

## Configuración de Grafana

### Primer Acceso

1. Accede a http://localhost:3000
2. Login: `admin` / `admin`
3. Cambia la contraseña (o sáltalo)

### Dashboards Pre-configurados

El sistema incluye un dashboard básico: **Adelante Sumerce - System Overview**

### Importar Dashboards Adicionales

Dashboards recomendados de Grafana.com:

1. **Node Exporter Full** (ID: 1860)
   - Dashboard completo para métricas del host

2. **MySQL Overview** (ID: 7362)
   - Dashboard para MySQL

3. **Docker Container & Host Metrics** (ID: 179)
   - Métricas de contenedores Docker

4. **Nginx Overview** (ID: 12708)
   - Métricas de Nginx

**Pasos para importar:**
1. En Grafana, ve a Dashboards → Import
2. Ingresa el ID del dashboard
3. Selecciona el datasource "Prometheus"
4. Click en "Import"

## Troubleshooting

### Prometheus no recoge métricas

```powershell
# Verificar configuración
docker exec prometheus cat /etc/prometheus/prometheus.yml

# Verificar targets
curl http://localhost:9090/api/v1/targets | ConvertFrom-Json | ConvertTo-Json -Depth 10

# Recargar configuración
curl -X POST http://localhost:9090/-/reload
```

### MySQL Exporter no conecta

```powershell
# Verificar archivo .my.cnf
cat docker\mysqld_exporter\.my.cnf

# Ver logs
docker logs mysqld_exporter

# Probar conexión manual
docker exec mysqld_exporter mysqladmin ping -h mysql
```

### Grafana no muestra datos

1. Verifica que Prometheus esté recogiendo métricas
2. En Grafana, ve a Configuration → Data Sources → Prometheus
3. Click en "Test" para verificar conexión
4. Revisa que los dashboards usen el datasource correcto

### Node Exporter en Windows

Node Exporter puede tener limitaciones en Windows cuando corre en Docker. Si tienes problemas:

```powershell
# Ver logs
docker logs node_exporter

# Verificar métricas disponibles
curl http://localhost:9100/metrics
```

## Métricas Personalizadas

Para agregar métricas personalizadas a tu aplicación Node.js:

```javascript
const client = require('prom-client');

// Crear un registro
const register = new client.Registry();

// Métricas por defecto
client.collectDefaultMetrics({ register });

// Métrica personalizada
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

register.registerMetric(httpRequestDuration);

// Endpoint de métricas
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

## Mantenimiento

### Backup de Datos de Grafana

```powershell
docker run --rm --volumes-from grafana -v ${PWD}:/backup alpine tar czf /backup/grafana-backup.tar.gz /var/lib/grafana
```

### Restaurar Datos de Grafana

```powershell
docker run --rm --volumes-from grafana -v ${PWD}:/backup alpine tar xzf /backup/grafana-backup.tar.gz -C /
```

### Limpiar Datos Antiguos de Prometheus

Prometheus automáticamente limpia datos antiguos según la configuración de retención (por defecto 15 días).

Para cambiar la retención, modifica `docker-compose.yml`:

```yaml
prometheus:
  command:
    - '--storage.tsdb.retention.time=30d'  # 30 días
```

## Soporte

Para problemas o preguntas:
1. Revisa los logs: `docker-compose logs [servicio]`
2. Ejecuta `.\check-monitoring.ps1`
3. Verifica la documentación oficial de cada componente

## Referencias

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Node Exporter](https://github.com/prometheus/node_exporter)
- [MySQL Exporter](https://github.com/prometheus/mysqld_exporter)
- [cAdvisor](https://github.com/google/cadvisor)
