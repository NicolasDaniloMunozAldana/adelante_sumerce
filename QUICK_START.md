# 🚀 Quick Start Guide

## Instalación Rápida (5 pasos)

### 1️⃣ Instalar Kafka

```bash
brew install kafka
brew services start zookeeper
brew services start kafka
```

### 2️⃣ Crear Topics

```bash
kafka-topics --create --bootstrap-server localhost:9092 --topic generate-user-report --partitions 1 --replication-factor 1
kafka-topics --create --bootstrap-server localhost:9092 --topic generate-admin-report --partitions 1 --replication-factor 1
kafka-topics --create --bootstrap-server localhost:9092 --topic generate-comparative-report --partitions 1 --replication-factor 1
kafka-topics --create --bootstrap-server localhost:9092 --topic report-generated --partitions 1 --replication-factor 1
kafka-topics --create --bootstrap-server localhost:9092 --topic report-failed --partitions 1 --replication-factor 1
```

### 3️⃣ Instalar Dependencias

```bash
# Proyecto principal
cd adelante_sumerce
npm install

# Microservicio
cd ../report_service
npm install
```

### 4️⃣ Configurar Environment

**adelante_sumerce/.env:**
```env
KAFKA_BROKERS=localhost:9092
```

**report_service/.env:**
```env
KAFKA_BROKERS=localhost:9092

# Gmail (ejemplo)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-app-password-de-gmail
```

> 💡 Para Gmail: Generar App Password en https://myaccount.google.com/apppasswords

### 5️⃣ Iniciar Servicios

```bash
# Terminal 1: Proyecto Principal
cd adelante_sumerce
npm run dev

# Terminal 2: Microservicio
cd report_service
npm run dev
```

---

## ✅ Verificación

### Ver que Kafka funciona:
```bash
kafka-topics --list --bootstrap-server localhost:9092
```

### Ver consumer group:
```bash
kafka-consumer-groups --describe \
  --bootstrap-server localhost:9092 \
  --group report-service-group
```

### Ver logs del microservicio:
```bash
tail -f report_service/logs/combined.log
```

---

## 🧪 Probar

1. Inicia sesión en http://localhost:3000
2. Ve a Dashboard
3. Click en "Generar Reporte PDF"
4. Verás: "Se enviará por correo"
5. Revisa tu email

---

## 📚 Documentación Completa

- **`KAFKA_SETUP.md`** - Instalación detallada de Kafka
- **`IMPLEMENTATION_SUMMARY.md`** - Resumen ejecutivo completo
- **`report_service/README.md`** - Doc del microservicio

---

## 🆘 Problemas Comunes

### "Connection refused" a Kafka
```bash
brew services restart kafka
```

### Email no llega
1. Verifica SMTP_USER y SMTP_PASSWORD en `.env`
2. Si usas Gmail, asegúrate de usar App Password
3. Revisa logs: `tail -f report_service/logs/error.log`

### LAG > 0 (mensajes pendientes)
1. Verifica que el microservicio esté corriendo
2. Revisa los logs de error

---

¡Listo! 🎉
