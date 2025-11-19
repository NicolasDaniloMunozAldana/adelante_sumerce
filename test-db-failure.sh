#!/bin/bash

# Script para simular caída de base de datos y medir recuperación
# Adelante Sumercé - Database Failure Test

set -e

echo "==========================================="
echo "  Simulación de Caída de Base de Datos"
echo "==========================================="
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 1. Verificar que todo esté corriendo
print_step "1. Verificando que los servicios estén corriendo..."

if ! docker ps | grep -q adelante_sumerce_mysql; then
    print_error "MySQL no está corriendo. Por favor ejecuta: docker-compose up -d"
    exit 1
fi

if ! docker ps | grep -q adelante_sumerce_app_1; then
    print_error "La aplicación no está corriendo. Por favor ejecuta: docker-compose up -d"
    exit 1
fi

print_info "Todos los servicios están corriendo"

# 2. Generar tráfico inicial
print_step "2. Generando tráfico inicial (baseline)..."

if command -v ab &> /dev/null; then
    print_info "Enviando 100 requests a la aplicación..."
    ab -n 100 -c 10 -q http://localhost:81/ > /dev/null 2>&1
    print_info "Tráfico baseline completado"
else
    print_warning "Apache Bench (ab) no está instalado. Saltando generación de tráfico."
    print_warning "Para instalar: sudo apt-get install apache2-utils"
fi

sleep 5

# 3. Capturar métricas antes de la caída
print_step "3. Capturando métricas ANTES de la caída..."

METRICS_BEFORE=$(mktemp)
curl -s http://localhost:3030/metrics > "$METRICS_BEFORE"

DB_AVAILABLE_BEFORE=$(grep "adelante_app_db_available" "$METRICS_BEFORE" | grep -v "#" | awk '{print $2}')
QUEUE_SIZE_BEFORE=$(grep "adelante_app_kafka_queue_size" "$METRICS_BEFORE" | grep -v "#" | awk '{print $2}')

print_info "  DB Available: $DB_AVAILABLE_BEFORE"
print_info "  Queue Size: $QUEUE_SIZE_BEFORE"

# 4. Detener MySQL (simular caída)
print_step "4. Deteniendo MySQL (simulando caída de BD)..."
docker-compose stop mysql
print_error "MySQL DETENIDO"

# Timestamp de inicio de caída
FAILURE_START=$(date +%s)

# 5. Generar tráfico durante la caída
print_step "5. Generando tráfico DURANTE la caída..."

print_warning "Esperando 10 segundos para que el sistema detecte la caída..."
sleep 10

if command -v ab &> /dev/null; then
    print_info "Intentando 50 requests (se esperan errores)..."
    ab -n 50 -c 5 -q http://localhost:81/ > /dev/null 2>&1 || true
fi

print_warning "Esperando 20 segundos más (acumulando mensajes en Kafka)..."
sleep 20

# 6. Capturar métricas durante la caída
print_step "6. Capturando métricas DURANTE la caída..."

METRICS_DURING=$(mktemp)
curl -s http://localhost:3030/metrics > "$METRICS_DURING"

DB_AVAILABLE_DURING=$(grep "adelante_app_db_available" "$METRICS_DURING" | grep -v "#" | awk '{print $2}')
QUEUE_SIZE_DURING=$(grep "adelante_app_kafka_queue_size" "$METRICS_DURING" | grep -v "#" | tail -1 | awk '{print $2}')
QUEUED_WRITES=$(grep "adelante_app_queued_writes_during_downtime_total" "$METRICS_DURING" | grep -v "#" | awk '{print $2}')

print_info "  DB Available: $DB_AVAILABLE_DURING"
print_info "  Queue Size: $QUEUE_SIZE_DURING"
print_info "  Queued Writes: $QUEUED_WRITES"

# 7. Reiniciar MySQL
print_step "7. Reiniciando MySQL..."
docker-compose start mysql

print_warning "Esperando a que MySQL esté listo..."
sleep 15

# Verificar que MySQL esté up
MAX_RETRIES=30
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
    if docker exec adelante_sumerce_mysql mysqladmin ping -h localhost -u root -prootpassword &> /dev/null; then
        print_info "MySQL está ONLINE"
        break
    fi
    RETRY=$((RETRY+1))
    sleep 1
done

if [ $RETRY -eq $MAX_RETRIES ]; then
    print_error "MySQL no respondió después de 30 segundos"
    exit 1
fi

# Timestamp de fin de caída
FAILURE_END=$(date +%s)
DOWNTIME=$((FAILURE_END - FAILURE_START))

print_info "Tiempo de caída: ${DOWNTIME} segundos"

# 8. Esperar recuperación
print_step "8. Esperando recuperación del sistema..."
print_info "El sistema procesará las escrituras encoladas..."

RECOVERY_START=$(date +%s)

# Esperar a que la cola se vacíe
MAX_WAIT=120
WAIT=0
while [ $WAIT -lt $MAX_WAIT ]; do
    CURRENT_QUEUE=$(curl -s http://localhost:3030/metrics | grep "adelante_app_kafka_queue_size" | grep -v "#" | tail -1 | awk '{print $2}')
    
    if [ -z "$CURRENT_QUEUE" ] || [ "$CURRENT_QUEUE" == "0" ]; then
        print_info "Cola de Kafka vacía - Recuperación completada"
        break
    fi
    
    print_info "  Cola: $CURRENT_QUEUE mensajes pendientes... (esperando)"
    sleep 5
    WAIT=$((WAIT+5))
done

RECOVERY_END=$(date +%s)
RECOVERY_TIME=$((RECOVERY_END - RECOVERY_START))

# 9. Capturar métricas después de la recuperación
print_step "9. Capturando métricas DESPUÉS de la recuperación..."

METRICS_AFTER=$(mktemp)
curl -s http://localhost:3030/metrics > "$METRICS_AFTER"

DB_AVAILABLE_AFTER=$(grep "adelante_app_db_available" "$METRICS_AFTER" | grep -v "#" | awk '{print $2}')
QUEUE_SIZE_AFTER=$(grep "adelante_app_kafka_queue_size" "$METRICS_AFTER" | grep -v "#" | tail -1 | awk '{print $2}')
RECOVERY_DURATION=$(grep "adelante_app_data_recovery_duration_seconds" "$METRICS_AFTER" | grep -v "#" | tail -1 | awk '{print $2}')

print_info "  DB Available: $DB_AVAILABLE_AFTER"
print_info "  Queue Size: $QUEUE_SIZE_AFTER"
print_info "  Recovery Duration: ${RECOVERY_DURATION}s (métrica interna)"

# 10. Resumen
echo ""
echo "==========================================="
echo "  RESUMEN DE LA PRUEBA"
echo "==========================================="
echo ""
print_info "Tiempo total de caída de BD: ${DOWNTIME}s"
print_info "Tiempo de recuperación: ${RECOVERY_TIME}s"
print_info "Escrituras encoladas: $QUEUED_WRITES"
echo ""
echo "Métricas comparativas:"
echo "  ANTES | DURANTE | DESPUÉS"
echo "  DB:    $DB_AVAILABLE_BEFORE  |    $DB_AVAILABLE_DURING    |    $DB_AVAILABLE_AFTER"
echo "  Queue: $QUEUE_SIZE_BEFORE  |    $QUEUE_SIZE_DURING    |    $QUEUE_SIZE_AFTER"
echo ""
echo "==========================================="
echo "  Acciones Recomendadas"
echo "==========================================="
echo ""
echo "1. Ver gráficas en Grafana:"
echo "   http://localhost:3000"
echo ""
echo "2. Dashboard 2 - Kafka & Queue Metrics:"
echo "   - Data Recovery Time After DB Failure"
echo "   - Queued Writes During DB Downtime"
echo "   - Kafka Queue Size"
echo ""
echo "3. Dashboard 3 - Base de Datos:"
echo "   - MySQL Status"
echo "   - Active Connections"
echo ""
echo "4. Ver alertas en Alertmanager:"
echo "   http://localhost:9094"
echo ""
echo "5. Ver targets en Prometheus:"
echo "   http://localhost:9090/targets"
echo ""

# Cleanup
rm -f "$METRICS_BEFORE" "$METRICS_DURING" "$METRICS_AFTER"

print_info "Prueba completada exitosamente!"
