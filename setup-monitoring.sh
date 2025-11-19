#!/bin/bash

# Script de instalación del sistema de monitoreo
# Adelante Sumercé - Monitoring Setup

set -e

echo "======================================"
echo "  Adelante Sumercé - Monitoring Setup"
echo "======================================"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 1. Verificar Docker
print_info "Verificando Docker..."
if ! command -v docker &> /dev/null; then
    print_error "Docker no está instalado. Por favor instálalo primero."
    exit 1
fi
print_info "Docker encontrado: $(docker --version)"

# 2. Verificar Docker Compose
print_info "Verificando Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose no está instalado. Por favor instálalo primero."
    exit 1
fi
print_info "Docker Compose encontrado: $(docker-compose --version)"

# 3. Instalar dependencias de Node.js
print_info "Instalando dependencias de Node.js..."

print_info "  → Instalando dependencias de la app principal..."
cd adelante_sumerce
npm install --production
cd ..

print_info "  → Instalando dependencias de Auth Service..."
cd auth_service
npm install --production
cd ..

print_info "  → Instalando dependencias de Report Service..."
cd report_service
npm install --production
cd ..

# 4. Crear directorios necesarios
print_info "Creando directorios necesarios..."
mkdir -p docker/grafana/provisioning/datasources
mkdir -p docker/grafana/provisioning/dashboards
mkdir -p nginx/logs

# 5. Verificar archivos de configuración
print_info "Verificando archivos de configuración..."

FILES=(
    "docker/prometheus/prometheus.yml"
    "docker/prometheus/alert_rules.yml"
    "docker/alertmanager/alertmanager.yml"
    "docker/grafana/provisioning/datasources/prometheus.yml"
    "docker/grafana/provisioning/dashboards/dashboards.yml"
    "docker/grafana/provisioning/dashboards/dashboard_system.json"
    "docker/grafana/provisioning/dashboards/dashboard_apps.json"
    "docker/grafana/provisioning/dashboards/dashboard_database.json"
)

for file in "${FILES[@]}"; do
    if [ ! -f "$file" ]; then
        print_warning "Archivo faltante: $file"
    else
        print_info "  ✓ $file"
    fi
done

# 6. Verificar variables de entorno
print_info "Verificando variables de entorno..."
if [ ! -f ".env" ]; then
    print_warning "Archivo .env no encontrado. Creando desde example.env..."
    if [ -f "adelante_sumerce/example.env" ]; then
        cp adelante_sumerce/example.env .env
        print_info "  ✓ Archivo .env creado. Por favor configúralo antes de continuar."
    else
        print_error "example.env no encontrado"
    fi
else
    print_info "  ✓ Archivo .env encontrado"
fi

# 7. Construir imágenes
print_info "Construyendo imágenes Docker..."
docker-compose build --no-cache

# 8. Iniciar servicios
print_info "Iniciando servicios..."
docker-compose up -d

# 9. Esperar a que los servicios estén listos
print_info "Esperando a que los servicios estén listos..."
sleep 30

# 10. Verificar salud de los servicios
print_info "Verificando salud de los servicios..."

echo ""
echo "======================================"
echo "  Estado de los Servicios"
echo "======================================"

# MySQL
if docker exec adelante_sumerce_mysql mysqladmin ping -h localhost -u root -prootpassword &> /dev/null; then
    print_info "MySQL: UP"
else
    print_error "MySQL: DOWN"
fi

# Redis
if docker exec adelante_sumerce_redis redis-cli ping &> /dev/null; then
    print_info "Redis: UP"
else
    print_error "Redis: DOWN"
fi

# Kafka
if docker exec adelante_sumerce_kafka kafka-broker-api-versions --bootstrap-server localhost:9093 &> /dev/null; then
    print_info "Kafka: UP"
else
    print_error "Kafka: DOWN"
fi

# Prometheus
if curl -s http://localhost:9090/-/healthy &> /dev/null; then
    print_info "Prometheus: UP"
else
    print_error "Prometheus: DOWN"
fi

# Grafana
if curl -s http://localhost:3000/api/health &> /dev/null; then
    print_info "Grafana: UP"
else
    print_error "Grafana: DOWN"
fi

# Alertmanager
if curl -s http://localhost:9094/-/healthy &> /dev/null; then
    print_info "Alertmanager: UP"
else
    print_error "Alertmanager: DOWN"
fi

# 11. Mostrar URLs
echo ""
echo "======================================"
echo "  URLs de Acceso"
echo "======================================"
echo "Aplicación Principal: http://localhost:81"
echo "Grafana:             http://localhost:3000 (admin/admin)"
echo "Prometheus:          http://localhost:9090"
echo "Alertmanager:        http://localhost:9094"
echo ""
echo "Métricas:"
echo "  App Principal:     http://localhost:3030/metrics"
echo "  Auth Service:      http://localhost:3001/api/metrics"
echo "  Report Service:    http://localhost:3002/metrics"
echo ""

echo "======================================"
echo "  Comandos Útiles"
echo "======================================"
echo "Ver logs de todos los servicios:"
echo "  docker-compose logs -f"
echo ""
echo "Ver logs de un servicio específico:"
echo "  docker-compose logs -f app_1"
echo ""
echo "Reiniciar servicios:"
echo "  docker-compose restart"
echo ""
echo "Detener servicios:"
echo "  docker-compose down"
echo ""
echo "Verificar targets de Prometheus:"
echo "  http://localhost:9090/targets"
echo ""

print_info "Instalación completada!"
print_warning "Recuerda configurar las variables de entorno en .env antes de usar en producción"

echo ""
