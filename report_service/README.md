# 📊 Report Service - Microservicio de Generación de Reportes

Microservicio autónomo para la generación y envío de reportes por correo electrónico, implementado con arquitectura dirigida por eventos (EDA) usando Apache Kafka.

## 🎯 Descripción

Este microservicio es parte de la plataforma "Salga Adelante Sumercé" y se encarga exclusivamente de:

1. **Consumir eventos** de solicitudes de reportes desde Kafka
2. **Generar reportes** en formato PDF y Excel usando Puppeteer y ExcelJS
3. **Enviar reportes** por correo electrónico a los usuarios/administradores
4. **Publicar eventos** de confirmación o error

## 🏗️ Arquitectura

```
┌─────────────────────┐
│ Proyecto Principal  │
│ (adelante_sumerce)  │
└──────────┬──────────┘
           │
           ├─ Publica eventos
           │  • GENERATE_USER_REPORT
           │  • GENERATE_ADMIN_REPORT
           │  • GENERATE_COMPARATIVE_PDF
           │  • GENERATE_COMPARATIVE_EXCEL
           │
           ▼
     ┌──────────┐
     │  KAFKA   │ ◄─── Broker de mensajes (persistencia)
     └────┬─────┘
          │
          ├─ Consume eventos
          │
          ▼
┌───────────────────────┐
│   Report Service      │
│  (Microservicio)      │
├───────────────────────┤
│ • Genera PDFs/Excel   │
│ • Envía por correo    │
│ • Publica respuestas  │
└───────────────────────┘
```

## 📁 Estructura del Proyecto

```
report_service/
├── src/
│   ├── consumers/
│   │   └── reportConsumer.js       # Consumer principal de Kafka
│   ├── services/
│   │   ├── reportService.js        # Generación de reportes de usuario
│   │   ├── adminReportService.js   # Generación de reportes administrativos
│   │   └── comparativeReportService.js  # Reportes comparativos
│   ├── email/
│   │   └── emailService.js         # Servicio de envío de correos
│   ├── kafka/
│   │   ├── kafkaConsumer.js        # Cliente Kafka Consumer
│   │   └── kafkaProducer.js        # Cliente Kafka Producer
│   ├── utils/
│   │   └── logger.js               # Sistema de logging
│   ├── config/
│   │   └── index.js                # Configuración centralizada
│   └── index.js                    # Punto de entrada
├── logs/                           # Archivos de log
├── package.json
├── .env.example
└── README.md
```

## 🔧 Instalación

### 1. Instalar dependencias

```bash
cd report_service
npm install
```

### 2. Configurar variables de entorno

Copia el archivo `.env.example` a `.env` y configura las variables:

```bash
cp .env.example .env
```

Edita el archivo `.env`:

```env
# Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=report-service
KAFKA_GROUP_ID=report-service-group

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-app-password

# Service Configuration
SERVICE_NAME=report-service
LOG_LEVEL=info

# Topics
TOPIC_GENERATE_ADMIN_REPORT=generate-admin-report
TOPIC_GENERATE_COMPARATIVE_REPORT=generate-comparative-report
TOPIC_GENERATE_USER_REPORT=generate-user-report
TOPIC_REPORT_GENERATED=report-generated
TOPIC_REPORT_FAILED=report-failed
```

### 3. Configurar Gmail (si usas Gmail)

1. Activa la verificación en dos pasos en tu cuenta de Google
2. Genera una "Contraseña de aplicación" en https://myaccount.google.com/apppasswords
3. Usa esa contraseña en `SMTP_PASSWORD`

## 🚀 Ejecución

### Modo desarrollo (con nodemon)
```bash
npm run dev
```

### Modo producción
```bash
npm start
```

## ⚙️ Características de Resiliencia

### 1. **Manejo de Offsets Manual**
```javascript
// Auto-commit deshabilitado
autoCommit: false

// Commit manual solo tras éxito
await this.commitOffset(topic, partition, message.offset);
```

### 2. **Procesamiento Garantizado**
- Los mensajes se procesan uno por vez
- Solo se commitea el offset tras generación y envío exitoso del reporte
- Si el servicio se cae, los mensajes pendientes permanecen en Kafka
- Al reiniciar, se procesan todos los mensajes pendientes

### 3. **Reintentos Automáticos**
```javascript
retry: {
    initialRetryTime: 100,
    retries: 8
}
```

### 4. **Graceful Shutdown**
```bash
# Al recibir SIGTERM/SIGINT:
1. Detiene de aceptar nuevos mensajes
2. Termina de procesar mensajes actuales
3. Desconecta de Kafka ordenadamente
4. Sale del proceso
```

### 5. **Dead Letter Queue (DLQ)**
Los mensajes que fallan repetidamente pueden ser enviados a un topic especial para análisis posterior (implementación futura).

## 📨 Tipos de Eventos

### Eventos de Entrada (Consume)

#### 1. GENERATE_USER_REPORT
```json
{
  "type": "GENERATE_USER_REPORT",
  "timestamp": 1234567890,
  "data": {
    "userId": 123,
    "email": "usuario@example.com",
    "businessData": {
      "name": "Mi Emprendimiento",
      "creationYear": 2023,
      "economicSector": "tecnologia",
      "BusinessModel": {...},
      "Finance": {...},
      "WorkTeam": {...},
      "Rating": {...}
    }
  }
}
```

#### 2. GENERATE_ADMIN_REPORT
```json
{
  "type": "GENERATE_ADMIN_REPORT",
  "timestamp": 1234567890,
  "data": {
    "businessId": 456,
    "adminEmail": "admin@example.com",
    "businessData": {
      "id": 456,
      "name": "Emprendimiento XYZ",
      "User": {...},
      "BusinessModel": {...},
      "Finance": {...},
      "WorkTeam": {...},
      "Rating": {...}
    }
  }
}
```

#### 3. GENERATE_COMPARATIVE_PDF / GENERATE_COMPARATIVE_EXCEL
```json
{
  "type": "GENERATE_COMPARATIVE_PDF",
  "timestamp": 1234567890,
  "data": {
    "adminEmail": "admin@example.com",
    "filters": {
      "classification": "consolidado",
      "sector": "tecnologia"
    },
    "businessesData": [
      { /* emprendimiento 1 */ },
      { /* emprendimiento 2 */ },
      ...
    ]
  }
}
```

### Eventos de Salida (Produce)

#### REPORT_GENERATED
```json
{
  "type": "REPORT_GENERATED",
  "timestamp": 1234567890,
  "data": {
    "userId": 123,
    "email": "usuario@example.com",
    "reportType": "USER_REPORT",
    "businessName": "Mi Emprendimiento",
    "success": true
  }
}
```

#### REPORT_FAILED
```json
{
  "type": "REPORT_FAILED",
  "timestamp": 1234567890,
  "data": {
    "userId": 123,
    "email": "usuario@example.com",
    "reportType": "USER_REPORT",
    "error": "Error message"
  }
}
```

## 📊 Logs

Los logs se almacenan en el directorio `logs/`:

- `combined.log` - Todos los logs
- `error.log` - Solo errores

Formato de log:
```json
{
  "level": "info",
  "message": "Mensaje del log",
  "timestamp": "2025-01-01 10:00:00",
  "service": "report-service"
}
```

## 🔍 Monitoreo

### Ver logs en tiempo real
```bash
tail -f logs/combined.log
```

### Ver solo errores
```bash
tail -f logs/error.log
```

### Verificar estado del servicio
El servicio muestra en consola:
- ✅ Eventos procesados exitosamente
- ❌ Errores en el procesamiento
- 📨 Emails enviados
- 📊 Reportes generados

## 🧪 Testing

```bash
npm test
```

## 🛠️ Troubleshooting

### El servicio no consume mensajes

1. Verifica que Kafka esté corriendo:
```bash
# Verificar que Kafka esté en ejecución
nc -zv localhost 9092
```

2. Verifica que los topics existan:
```bash
kafka-topics --list --bootstrap-server localhost:9092
```

3. Verifica la configuración de `KAFKA_BROKERS` en `.env`

### No se envían correos

1. Verifica la configuración SMTP en `.env`
2. Si usas Gmail, verifica que hayas creado una "App Password"
3. Revisa los logs de error: `logs/error.log`

### Mensajes no se procesan tras reinicio

Esto es normal - Kafka mantiene los mensajes. El servicio los procesará cuando se reinicie.
Verifica que `KAFKA_GROUP_ID` sea consistente.

## 🔐 Seguridad

- **Nunca** commitees el archivo `.env` con credenciales reales
- Usa contraseñas de aplicación (app passwords) en lugar de contraseñas reales
- Mantén actualizado Puppeteer para evitar vulnerabilidades
- Los reportes contienen información sensible - asegúrate de que los correos lleguen a los destinatarios correctos

## 📝 Licencia

ISC

## 👥 Contribuciones

Este microservicio es parte del proyecto "Salga Adelante Sumercé". Para contribuir, consulta el repositorio principal.
