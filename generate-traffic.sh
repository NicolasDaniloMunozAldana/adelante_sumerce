#!/bin/bash

# Script para generar tráfico de prueba y validar métricas
# Adelante Sumercé - Traffic Generator & Metrics Validation

set -e

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
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

echo "==========================================="
echo "  Generador de Tráfico y Validación"
echo "  Adelante Sumercé - Monitoring System"
echo "==========================================="
echo ""

# Configuración
DURATION=${1:-60}  # Duración en segundos (default: 60s)
RPS=${2:-10}       # Requests por segundo (default: 10)
CONCURRENCY=${3:-5} # Requests concurrentes (default: 5)

print_info "Configuración:"
echo "  Duración: ${DURATION}s"
echo "  RPS objetivo: ${RPS}"
echo "  Concurrencia: ${CONCURRENCY}"
echo ""

# Verificar dependencias
check_dependency() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 no está instalado"
        echo "  Para instalar: $2"
        exit 1
    fi
}

print_step "1. Verificando dependencias..."
check_dependency "curl" "brew install curl"
check_dependency "jq" "brew install jq"

if ! command -v ab &> /dev/null; then
    print_warning "Apache Bench (ab) no está instalado"
    print_warning "Instalación: brew install httpd"
    print_warning "Usando curl en su lugar (menos eficiente)"
    USE_CURL=1
else
    USE_CURL=0
    print_info "Apache Bench disponible"
fi

# Verificar servicios
print_step "2. Verificando servicios..."

check_service() {
    local NAME=$1
    local URL=$2
    
    if curl -s -f "$URL" > /dev/null 2>&1; then
        print_info "$NAME está disponible en $URL"
        return 0
    else
        print_error "$NAME no responde en $URL"
        return 1
    fi
}

ALL_OK=1
check_service "Main App" "http://localhost:3030/health" || ALL_OK=0
check_service "Auth Service" "http://localhost:3001/api/health" || ALL_OK=0
check_service "Report Service" "http://localhost:3002/health" || ALL_OK=0
check_service "Prometheus" "http://localhost:9090/-/healthy" || ALL_OK=0
check_service "Grafana" "http://localhost:3000/api/health" || ALL_OK=0

if [ $ALL_OK -eq 0 ]; then
    print_error "Algunos servicios no están disponibles"
    print_warning "Ejecuta: docker-compose up -d"
    exit 1
fi

echo ""

# Función para generar tráfico
generate_traffic() {
    local ENDPOINT=$1
    local NAME=$2
    
    print_step "Generando tráfico a $NAME..."
    
    if [ $USE_CURL -eq 1 ]; then
        # Usar curl
        local COUNT=$((DURATION * RPS / CONCURRENCY))
        for i in $(seq 1 $CONCURRENCY); do
            (
                for j in $(seq 1 $COUNT); do
                    curl -s -o /dev/null -w "%{http_code}\n" "$ENDPOINT" >> /tmp/traffic_results_${i}.txt
                    sleep $(awk "BEGIN {print 1/$RPS}")
                done
            ) &
        done
        wait
        
        # Analizar resultados
        cat /tmp/traffic_results_*.txt | sort | uniq -c
        rm -f /tmp/traffic_results_*.txt
        
    else
        # Usar Apache Bench
        local TOTAL_REQUESTS=$((DURATION * RPS))
        ab -n $TOTAL_REQUESTS -c $CONCURRENCY -q "$ENDPOINT" 2>&1 | grep -E "(Requests per second|Time per request|Failed requests)"
    fi
}

# 3. Capturar métricas iniciales
print_step "3. Capturando métricas iniciales..."

get_metric() {
    local METRIC=$1
    local PORT=$2
    curl -s "http://localhost:${PORT}/metrics" | grep "^${METRIC}" | grep -v "#" | tail -1 | awk '{print $2}'
}

INITIAL_REQUESTS=$(get_metric "adelante_app_http_requests_total" 3030)
INITIAL_ERRORS=$(get_metric "adelante_app_http_errors_total" 3030)
INITIAL_AUTH_REQUESTS=$(get_metric "auth_service_http_requests_total" 3001)

print_info "Requests iniciales (main): ${INITIAL_REQUESTS:-0}"
print_info "Errores iniciales (main): ${INITIAL_ERRORS:-0}"
print_info "Requests iniciales (auth): ${INITIAL_AUTH_REQUESTS:-0}"

echo ""

# 4. Generar tráfico a diferentes endpoints
print_step "4. Generando tráfico (${DURATION}s)..."

START_TIME=$(date +%s)

# Tráfico a la página principal
(generate_traffic "http://localhost:81/" "Main Page") &
PID_MAIN=$!

# Esperar un poco
sleep 2

# Tráfico al servicio de auth
if [ $USE_CURL -eq 1 ]; then
    (
        for i in $(seq 1 20); do
            curl -s -o /dev/null -X POST http://localhost:3001/api/auth/login \
                -H "Content-Type: application/json" \
                -d '{"username":"test","password":"wrong"}' 2>/dev/null || true
            sleep 3
        done
    ) &
    PID_AUTH=$!
fi

# Esperar a que termine la generación de tráfico principal
wait $PID_MAIN
END_TIME=$(date +%s)

ACTUAL_DURATION=$((END_TIME - START_TIME))
print_info "Generación de tráfico completada en ${ACTUAL_DURATION}s"

echo ""

# 5. Esperar a que se procesen las métricas
print_step "5. Esperando procesamiento de métricas (5s)..."
sleep 5

# 6. Capturar métricas finales
print_step "6. Capturando métricas finales..."

FINAL_REQUESTS=$(get_metric "adelante_app_http_requests_total" 3030)
FINAL_ERRORS=$(get_metric "adelante_app_http_errors_total" 3030)
FINAL_AUTH_REQUESTS=$(get_metric "auth_service_http_requests_total" 3001)

print_info "Requests finales (main): ${FINAL_REQUESTS:-0}"
print_info "Errores finales (main): ${FINAL_ERRORS:-0}"
print_info "Requests finales (auth): ${FINAL_AUTH_REQUESTS:-0}"

echo ""

# 7. Calcular diferencias
print_step "7. Análisis de resultados..."

REQUESTS_DIFF=$((${FINAL_REQUESTS:-0} - ${INITIAL_REQUESTS:-0}))
ERRORS_DIFF=$((${FINAL_ERRORS:-0} - ${INITIAL_ERRORS:-0}))
AUTH_DIFF=$((${FINAL_AUTH_REQUESTS:-0} - ${INITIAL_AUTH_REQUESTS:-0}))

ACTUAL_RPS=$(awk "BEGIN {print $REQUESTS_DIFF / $ACTUAL_DURATION}")
ERROR_RATE=$(awk "BEGIN {if ($REQUESTS_DIFF > 0) print ($ERRORS_DIFF / $REQUESTS_DIFF) * 100; else print 0}")

echo ""
echo "==========================================="
echo "  RESULTADOS"
echo "==========================================="
echo ""
print_info "Requests procesados (main): $REQUESTS_DIFF"
print_info "Errores generados (main): $ERRORS_DIFF"
print_info "Requests procesados (auth): $AUTH_DIFF"
echo ""
print_info "RPS real: $(printf '%.2f' $ACTUAL_RPS)"
print_info "Tasa de error: $(printf '%.2f' $ERROR_RATE)%"
echo ""

# 8. Validar métricas críticas
print_step "8. Validando métricas críticas..."

# Verificar que se estén generando métricas
METRICS_FILE=$(mktemp)
curl -s http://localhost:3030/metrics > "$METRICS_FILE"

validate_metric() {
    local METRIC=$1
    local DESCRIPTION=$2
    
    if grep -q "^${METRIC}" "$METRICS_FILE"; then
        print_info "✓ $DESCRIPTION"
        return 0
    else
        print_error "✗ $DESCRIPTION no encontrado"
        return 1
    fi
}

ALL_METRICS_OK=1
validate_metric "adelante_app_http_requests_total" "HTTP Requests Total" || ALL_METRICS_OK=0
validate_metric "adelante_app_http_request_duration_seconds" "HTTP Request Duration" || ALL_METRICS_OK=0
validate_metric "adelante_app_db_queries_total" "Database Queries Total" || ALL_METRICS_OK=0
validate_metric "adelante_app_db_query_duration_seconds" "Database Query Duration" || ALL_METRICS_OK=0
validate_metric "adelante_app_redis_operations_total" "Redis Operations" || ALL_METRICS_OK=0
validate_metric "adelante_app_kafka_messages_produced_total" "Kafka Messages Produced" || ALL_METRICS_OK=0
validate_metric "process_cpu_seconds_total" "Process CPU Usage" || ALL_METRICS_OK=0
validate_metric "process_resident_memory_bytes" "Process Memory" || ALL_METRICS_OK=0

rm -f "$METRICS_FILE"

echo ""

if [ $ALL_METRICS_OK -eq 1 ]; then
    print_info "Todas las métricas críticas están funcionando correctamente"
else
    print_warning "Algunas métricas no se encontraron - verifica la implementación"
fi

echo ""

# 9. Mostrar URLs útiles
echo "==========================================="
echo "  DASHBOARDS Y HERRAMIENTAS"
echo "==========================================="
echo ""
echo "📊 Grafana Dashboards:"
echo "   http://localhost:3000/d/system-dashboard"
echo "   http://localhost:3000/d/apps-dashboard"
echo "   http://localhost:3000/d/database-dashboard"
echo "   Login: admin / admin"
echo ""
echo "📈 Prometheus:"
echo "   Targets: http://localhost:9090/targets"
echo "   Graph: http://localhost:9090/graph"
echo ""
echo "🔔 Alertmanager:"
echo "   http://localhost:9094"
echo ""
echo "📊 Métricas crudas:"
echo "   Main App: http://localhost:3030/metrics"
echo "   Auth Service: http://localhost:3001/api/metrics"
echo "   Report Service: http://localhost:3002/metrics"
echo ""
echo "==========================================="
echo ""

# 10. Ejemplo de queries Prometheus
print_step "Queries de ejemplo para Prometheus:"
echo ""
echo "1. RPS por servicio:"
echo "   rate(adelante_app_http_requests_total[1m])"
echo ""
echo "2. Latencia p95:"
echo "   histogram_quantile(0.95, rate(adelante_app_http_request_duration_seconds_bucket[5m]))"
echo ""
echo "3. Tasa de errores:"
echo "   rate(adelante_app_http_errors_total[5m]) / rate(adelante_app_http_requests_total[5m])"
echo ""
echo "4. Uso de CPU:"
echo "   rate(process_cpu_seconds_total[1m]) * 100"
echo ""
echo "5. Memoria usada:"
echo "   process_resident_memory_bytes / 1024 / 1024"
echo ""

print_info "Generación y validación completada exitosamente!"
echo ""
print_warning "Nota: Para detener todos los procesos en background:"
echo "  pkill -f 'curl|ab'"
