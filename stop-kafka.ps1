# Script para detener y limpiar Kafka y ZooKeeper
# Uso: .\stop-kafka.ps1

Write-Host "🛑 Deteniendo Kafka y ZooKeeper..." -ForegroundColor Yellow

# Detener contenedores
Write-Host "`n⏹️  Deteniendo contenedores..." -ForegroundColor Cyan
docker stop kafka zookeeper 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Contenedores detenidos" -ForegroundColor Green
} else {
    Write-Host "⚠️  Algunos contenedores ya estaban detenidos" -ForegroundColor Yellow
}

# Eliminar contenedores
Write-Host "`n🗑️  Eliminando contenedores..." -ForegroundColor Cyan
docker rm kafka zookeeper 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Contenedores eliminados" -ForegroundColor Green
} else {
    Write-Host "⚠️  Algunos contenedores ya estaban eliminados" -ForegroundColor Yellow
}

# Opcional: Eliminar la red (comentado por defecto)
# Write-Host "`n📡 Eliminando red 'kafka-network'..." -ForegroundColor Cyan
# docker network rm kafka-network 2>$null

Write-Host "`n✅ Kafka y ZooKeeper han sido detenidos y limpiados" -ForegroundColor Green
Write-Host ""
