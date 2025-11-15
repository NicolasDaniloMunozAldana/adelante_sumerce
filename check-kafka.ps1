# Script para verificar el estado de Kafka
# Uso: .\check-kafka.ps1

Write-Host "🔍 Verificando estado de Kafka..." -ForegroundColor Cyan

# Verificar contenedores
Write-Host "`n📦 Estado de contenedores:" -ForegroundColor Cyan
docker ps --filter "name=kafka" --filter "name=zookeeper" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Verificar si Kafka está corriendo
$kafkaRunning = docker ps --filter "name=kafka" --filter "status=running" --format "{{.Names}}"
$zookeeperRunning = docker ps --filter "name=zookeeper" --filter "status=running" --format "{{.Names}}"

if ($kafkaRunning -and $zookeeperRunning) {
    Write-Host "`n✅ Kafka y ZooKeeper están corriendo correctamente" -ForegroundColor Green
    
    # Listar tópicos
    Write-Host "`n📋 Tópicos disponibles:" -ForegroundColor Cyan
    docker exec kafka kafka-topics --list --bootstrap-server localhost:9092
    
    # Información detallada de tópicos
    Write-Host "`n📊 Información detallada de tópicos:" -ForegroundColor Cyan
    $topics = docker exec kafka kafka-topics --list --bootstrap-server localhost:9092
    foreach ($topic in $topics) {
        Write-Host "`n  Tópico: $topic" -ForegroundColor Yellow
        docker exec kafka kafka-topics --describe --topic $topic --bootstrap-server localhost:9092
    }
    
} elseif ($kafkaRunning) {
    Write-Host "`n⚠️  Kafka está corriendo pero ZooKeeper no" -ForegroundColor Yellow
} elseif ($zookeeperRunning) {
    Write-Host "`n⚠️  ZooKeeper está corriendo pero Kafka no" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ Kafka y ZooKeeper no están corriendo" -ForegroundColor Red
    Write-Host "   Ejecuta: .\start-kafka.ps1" -ForegroundColor Gray
}

Write-Host ""
