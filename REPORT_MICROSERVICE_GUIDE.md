# 📊 Guía de Migración: Microservicio de Reportes con Kafka

## 🎯 Resumen

Se ha implementado un **microservicio independiente de generación de reportes** utilizando **Event-Driven Architecture** con Apache Kafka.

## ✅ ¿Qué se ha implementado?

### 1. **Microservicio `report_service`**
   - ✅ Generación de reportes PDF/Excel
   - ✅ Envío automático por correo electrónico
   - ✅ Arquitectura limpia y desacoplada
   - ✅ Sistema de logging robusto
   - ✅ Resiliencia con manejo de offsets manual

### 2. **Integración con Kafka**
   - ✅ Producer en proyecto principal (adelante_sumerce)
   - ✅ Consumer en microservicio (report_service)
   - ✅ 5 topics configurados
   - ✅ Procesamiento asíncrono garantizado

### 3. **Actualización del Proyecto Principal**
   - ✅ Rutas actualizadas para enviar eventos
   - ✅ Controladores modificados (no generan reportes directamente)
   - ✅ Respuestas inmediatas al usuario

## 🚀 Pasos de Instalación

### 1. Instalar Kafka

```bash
# macOS
brew install kafka

# Iniciar servicios
brew services start zookeeper
brew services start kafka
```

### 2. Crear Topics

```bash
kafka-topics --create --bootstrap-server localhost:9092 --topic generate-user-report --partitions 1 --replication-factor 1
kafka-topics --create --bootstrap-server localhost:9092 --topic generate-admin-report --partitions 1 --replication-factor 1
kafka-topics --create --bootstrap-server localhost:9092 --topic generate-comparative-report --partitions 1 --replication-factor 1
kafka-topics --create --bootstrap-server localhost:9092 --topic report-generated --partitions 1 --replication-factor 1
kafka-topics --create --bootstrap-server localhost:9092 --topic report-failed --partitions 1 --replication-factor 1
```

### 3. Instalar Dependencias

**Proyecto principal:**
```bash
cd adelante_sumerce
npm install kafkajs
```

**Microservicio:**
```bash
cd ../report_service
npm install
```

### 4. Configurar Variables de Entorno

**adelante_sumerce/.env:**
```env
KAFKA_BROKERS=localhost:9092
```

**report_service/.env:**
```env
KAFKA_BROKERS=localhost:9092
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-app-password
```

### 5. Iniciar Servicios

```bash
# Terminal 1
cd adelante_sumerce
npm run dev

# Terminal 2
cd report_service
npm run dev
```

## 📁 Archivos Creados/Modificados

### Proyecto Principal (adelante_sumerce)
```
✅ src/kafka/kafkaProducer.js (nuevo)
✅ src/routes/reportRoutes.js (modificado)
✅ src/controllers/adminController.js (modificado)
✅ package.json (añadido kafkajs)
✅ example.env (añadidas variables Kafka)
```

### Microservicio (report_service)
```
✅ Todo el directorio es nuevo
✅ Arquitectura limpia con 7 carpetas principales
✅ 15+ archivos creados
```

## 📖 Documentación Completa

- **`KAFKA_SETUP.md`** - Instalación paso a paso de Kafka
- **`report_service/README.md`** - Documentación del microservicio
- Este archivo - Guía de migración

## 🧪 Cómo Probar

1. Inicia sesión en la aplicación
2. Solicita un reporte desde el dashboard
3. Verás: "Tu reporte está siendo generado y será enviado a tu correo"
4. Revisa tu correo en unos segundos

## 📊 Monitoreo

```bash
# Ver estado de Kafka
kafka-consumer-groups --describe --bootstrap-server localhost:9092 --group report-service-group

# Ver logs del microservicio
tail -f report_service/logs/combined.log
```

¡Listo! 🎉
