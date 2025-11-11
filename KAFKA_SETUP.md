# 🚀 Guía de Instalación y Configuración de Apache Kafka

Esta guía te ayudará a instalar y configurar Apache Kafka en macOS para el proyecto "Salga Adelante Sumercé".

## 📋 Tabla de Contenidos

1. [Instalación de Kafka](#1-instalación-de-kafka)
2. [Iniciar Kafka](#2-iniciar-kafka)
3. [Crear Topics](#3-crear-topics)
4. [Verificar la Instalación](#4-verificar-la-instalación)
5. [Comandos Útiles](#5-comandos-útiles)
6. [Integración con el Proyecto](#6-integración-con-el-proyecto)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Instalación de Kafka

### Opción A: Usando Homebrew (Recomendado para macOS)

```bash
# Instalar Kafka (incluye Zookeeper)
brew install kafka

# Verificar la instalación
kafka-topics --version
```

### Opción B: Descarga Manual

```bash
# Descargar Kafka
cd ~/Downloads
curl -O https://downloads.apache.org/kafka/3.6.1/kafka_2.13-3.6.1.tgz

# Extraer
tar -xzf kafka_2.13-3.6.1.tgz

# Mover a una ubicación permanente
sudo mv kafka_2.13-3.6.1 /usr/local/kafka

# Agregar al PATH (añade esto a tu ~/.zshrc)
export PATH="/usr/local/kafka/bin:$PATH"

# Recargar la configuración
source ~/.zshrc
```

---

## 2. Iniciar Kafka

Kafka requiere que Zookeeper esté corriendo primero.

### Terminal 1: Iniciar Zookeeper

```bash
# Si instalaste con Homebrew:
zookeeper-server-start /usr/local/etc/kafka/zookeeper.properties

# Si instalaste manualmente:
zookeeper-server-start.sh /usr/local/kafka/config/zookeeper.properties
```

**Salida esperada:**
```
...
[2025-01-01 10:00:00,123] INFO binding to port 0.0.0.0/0.0.0.0:2181
```

### Terminal 2: Iniciar Kafka Broker

```bash
# Si instalaste con Homebrew:
kafka-server-start /usr/local/etc/kafka/server.properties

# Si instalaste manualmente:
kafka-server-start.sh /usr/local/kafka/config/server.properties
```

**Salida esperada:**
```
...
[2025-01-01 10:00:05,456] INFO [KafkaServer id=0] started (kafka.server.KafkaServer)
```

### Opción: Ejecutar como servicios en segundo plano

```bash
# Iniciar Zookeeper como servicio
brew services start zookeeper

# Iniciar Kafka como servicio
brew services start kafka

# Verificar que están corriendo
brew services list
```

---

## 3. Crear Topics

Ahora que Kafka está corriendo, crea los topics necesarios:

```bash
# Topic para reportes de usuario
kafka-topics --create \
  --bootstrap-server localhost:9092 \
  --replication-factor 1 \
  --partitions 1 \
  --topic generate-user-report

# Topic para reportes administrativos
kafka-topics --create \
  --bootstrap-server localhost:9092 \
  --replication-factor 1 \
  --partitions 1 \
  --topic generate-admin-report

# Topic para reportes comparativos
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --replication-factor 1 \
  --partitions 1 \
  --topic generate-comparative-report

# Topic para notificaciones de éxito
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --replication-factor 1 \
  --partitions 1 \
  --topic report-generated

# Topic para notificaciones de error
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --replication-factor 1 \
  --partitions 1 \
  --topic report-failed
```

**Salida esperada para cada comando:**
```
Created topic generate-user-report.
```

---

## 4. Verificar la Instalación

### Listar todos los topics

```bash
kafka-topics.sh --list --bootstrap-server localhost:9092
```

**Salida esperada:**
```
generate-admin-report
generate-comparative-report
generate-user-report
report-failed
report-generated
```

### Ver detalles de un topic

```bash
kafka-topics.sh --describe \
  --bootstrap-server localhost:9092 \
  --topic generate-user-report
```

**Salida esperada:**
```
Topic: generate-user-report	TopicId: abc123...	PartitionCount: 1	ReplicationFactor: 1
	Topic: generate-user-report	Partition: 0	Leader: 0	Replicas: 0	Isr: 0
```

### Test Producer/Consumer

#### Terminal 3: Iniciar un consumer de prueba

```bash
kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic generate-user-report \
  --from-beginning
```

#### Terminal 4: Enviar un mensaje de prueba

```bash
kafka-console-producer.sh \
  --bootstrap-server localhost:9092 \
  --topic generate-user-report
```

Escribe un mensaje y presiona Enter:
```
{"type": "TEST", "message": "Hola Kafka!"}
```

Deberías ver el mensaje en la Terminal 3 (consumer).

---

## 5. Comandos Útiles

### Gestión de Topics

```bash
# Listar todos los topics
kafka-topics --list --bootstrap-server localhost:9092

# Describir un topic
kafka-topics --describe --bootstrap-server localhost:9092 --topic generate-user-report

# Eliminar un topic
kafka-topics --delete --bootstrap-server localhost:9092 --topic nombre-del-topic

# Modificar particiones de un topic
kafka-topics --alter --bootstrap-server localhost:9092 --topic generate-user-report --partitions 3
```

### Monitoreo de Mensajes

```bash
# Ver mensajes desde el principio
kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic generate-user-report \
  --from-beginning

# Ver solo mensajes nuevos
kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic generate-user-report

# Ver con detalles (key, timestamp, etc.)
kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic generate-user-report \
  --from-beginning \
  --property print.timestamp=true \
  --property print.key=true \
  --property print.value=true
```

### Consumer Groups

```bash
# Listar consumer groups
kafka-consumer-groups --list --bootstrap-server localhost:9092

# Describir un consumer group
kafka-consumer-groups --describe \
  --bootstrap-server localhost:9092 \
  --group report-service-group

# Ver lag (mensajes pendientes)
kafka-consumer-groups --describe \
  --bootstrap-server localhost:9092 \
  --group report-service-group
```

**Salida del describe:**
```
GROUP                TOPIC                    PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
report-service-group generate-user-report    0          45              45              0
```

- **CURRENT-OFFSET**: Último mensaje procesado
- **LOG-END-OFFSET**: Último mensaje en el topic
- **LAG**: Mensajes pendientes (0 = todo al día)

### Reiniciar Offsets (útil para debugging)

```bash
# CUIDADO: Esto hará que se reprocesen todos los mensajes

# Resetear a earliest (desde el principio)
kafka-consumer-groups --reset-offsets \
  --bootstrap-server localhost:9092 \
  --group report-service-group \
  --topic generate-user-report \
  --to-earliest \
  --execute

# Resetear a latest (solo mensajes nuevos)
kafka-consumer-groups --reset-offsets \
  --bootstrap-server localhost:9092 \
  --group report-service-group \
  --topic generate-user-report \
  --to-latest \
  --execute
```

---

## 6. Integración con el Proyecto

### Proyecto Principal (adelante_sumerce)

1. **Instalar kafkajs:**
```bash
cd adelante_sumerce
npm install kafkajs
```

2. **Crear archivo de configuración:**
```javascript
// adelante_sumerce/src/kafka/config.js
require('dotenv').config();

module.exports = {
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    clientId: 'adelante-sumerce',
    topics: {
        generateUserReport: 'generate-user-report',
        generateAdminReport: 'generate-admin-report',
        generateComparativePDF: 'generate-comparative-report',
        generateComparativeExcel: 'generate-comparative-report'
    }
};
```

3. **Agregar al .env:**
```env
KAFKA_BROKERS=localhost:9092
```

### Microservicio (report_service)

1. **Ya está configurado** - solo necesitas:

```bash
cd report_service
npm install
```

2. **Configurar .env** (copia de .env.example)

3. **Iniciar el servicio:**
```bash
npm run dev
```

---

## 7. Troubleshooting

### Problema: "Connection refused" al iniciar Kafka

**Solución:** Asegúrate de que Zookeeper esté corriendo primero.

```bash
# Verificar Zookeeper
nc -zv localhost 2181

# Si no responde, inícialo:
zookeeper-server-start /usr/local/etc/kafka/zookeeper.properties
```

### Problema: Topic no existe

**Solución:** Créalo manualmente o habilita auto-creación.

```bash
# Crear topic manualmente
kafka-topics --create --bootstrap-server localhost:9092 --topic mi-topic

# O editar server.properties para auto-crear:
# auto.create.topics.enable=true
```

### Problema: Mensajes no se consumen

**Solución:** Verifica el consumer group y lag.

```bash
# Ver estado del consumer group
kafka-consumer-groups --describe \
  --bootstrap-server localhost:9092 \
  --group report-service-group
```

Si el LAG es > 0 pero no disminuye:
1. Verifica que el microservicio esté corriendo
2. Revisa los logs del microservicio: `tail -f report_service/logs/error.log`

### Problema: Kafka usa mucho espacio en disco

**Solución:** Configurar retención de mensajes.

Edita `/usr/local/etc/kafka/server.properties`:

```properties
# Retener mensajes por 7 días
log.retention.hours=168

# Tamaño máximo del log por partition (1GB)
log.segment.bytes=1073741824
```

Reinicia Kafka:
```bash
brew services restart kafka
```

### Problema: Puerto 9092 ya en uso

**Solución:** Cambia el puerto o detén el proceso que lo usa.

```bash
# Ver qué está usando el puerto
lsof -i :9092

# Matar el proceso
kill -9 <PID>

# O cambiar puerto en server.properties:
# listeners=PLAINTEXT://localhost:9093
```

---

## 8. Detener Kafka

### Si están corriendo como servicios:

```bash
brew services stop kafka
brew services stop zookeeper
```

### Si están corriendo en terminales:

Presiona `Ctrl+C` en cada terminal (primero Kafka, luego Zookeeper).

---

## 9. Configuración en Producción

Para producción, considera:

1. **Múltiples Brokers** (cluster de Kafka)
2. **Replication Factor > 1** para alta disponibilidad
3. **Múltiples Partitions** para mejor rendimiento
4. **Monitoreo** con Kafka Manager o Conduktor
5. **Kafka en Docker/Kubernetes** para despliegue

Ejemplo de topic para producción:
```bash
kafka-topics --create \
  --bootstrap-server localhost:9092 \
  --replication-factor 3 \
  --partitions 3 \
  --topic generate-user-report \
  --config retention.ms=604800000  # 7 días
```

---

## 📚 Recursos Adicionales

- [Documentación oficial de Kafka](https://kafka.apache.org/documentation/)
- [KafkaJS Documentation](https://kafka.js.org/)
- [Kafka Docker](https://hub.docker.com/r/confluentinc/cp-kafka/)

---

¡Listo! Ahora tienes Kafka configurado y funcionando para tu proyecto de microservicios. 🎉
