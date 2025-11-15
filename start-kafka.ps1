Write-Host "Iniciando Kafka en Docker..." -ForegroundColor Green

Write-Host "`nCreando red Docker kafka-network..." -ForegroundColor Cyan
$networkExists = docker network ls --format "{{.Name}}" | Select-String "^kafka-network$"

if (-not $networkExists) {
    docker network create kafka-network | Out-Null
    Write-Host "Red kafka-network creada" -ForegroundColor Green
}
else {
    Write-Host "La red kafka-network ya existe" -ForegroundColor Yellow
}

Write-Host "`nEliminando contenedores previos..." -ForegroundColor Cyan
docker rm -f kafka zookeeper 2>$null | Out-Null

Write-Host "`nIniciando ZooKeeper..." -ForegroundColor Cyan
docker run -d `
    --name zookeeper `
    --network kafka-network `
    -p 2181:2181 `
    -e ZOOKEEPER_CLIENT_PORT=2181 `
    -e ZOOKEEPER_TICK_TIME=2000 `
    confluentinc/cp-zookeeper:7.5.0 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al iniciar ZooKeeper" -ForegroundColor Red
    exit 1
}

Write-Host "ZooKeeper iniciado en puerto 2181" -ForegroundColor Green
Start-Sleep -Seconds 5

Write-Host "`nIniciando Kafka..." -ForegroundColor Cyan
docker run -d `
    --name kafka `
    --network kafka-network `
    -p 9092:9092 `
    -p 29092:29092 `
    -e KAFKA_BROKER_ID=1 `
    -e KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181 `
    -e KAFKA_LISTENERS=PLAINTEXT://0.0.0.0:9092,PLAINTEXT_HOST://0.0.0.0:29092 `
    -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092,PLAINTEXT_HOST://localhost:29092 `
    -e KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT `
    -e KAFKA_INTER_BROKER_LISTENER_NAME=PLAINTEXT `
    -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 `
    -e KAFKA_AUTO_CREATE_TOPICS_ENABLE=false `
    confluentinc/cp-kafka:7.5.0 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al iniciar Kafka" -ForegroundColor Red
    docker rm -f zookeeper | Out-Null
    exit 1
}

Write-Host "Kafka iniciado en puerto 9092" -ForegroundColor Green
Start-Sleep -Seconds 10

Write-Host "`nCreando topicos..." -ForegroundColor Cyan

$topics = @(
    "generate-user-report",
    "generate-admin-report",
    "generate-comparative-report",
    "report-generated",
    "report-failed"
)

foreach ($topic in $topics) {
    Write-Host "Creando topico: $topic"
    
    docker exec kafka kafka-topics `
        --create `
        --topic $topic `
        --bootstrap-server localhost:9092 `
        --replication-factor 1 `
        --partitions 3 2>$null

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Topico creado: $topic"
    }
    else {
        Write-Host "Topico existe o error: $topic"
    }
}

Write-Host "`nTopicos disponibles:"
docker exec kafka kafka-topics --list --bootstrap-server localhost:9092

Write-Host "`nKafka listo."
