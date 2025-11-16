# Adelante Sumercé - Arquitectura de Microservicios

Sistema de gestión comercial para emprendedores, refactorizado con arquitectura de microservicios y autenticación JWT.

## 🎯 Características Principales

-  **Autenticación JWT**: Access tokens de corta duración + Refresh tokens rotativos
-  **Microservicios**: Autenticación separada del negocio principal
-  **Sliding Session**: Sensación de sesión infinita sin comprometer seguridad
-  **Gestión de Roles**: Administrador y Emprendedor
-  **Retrocompatibilidad**: Código original intacto, nueva implementación en paralelo
-  **Caracterización de Emprendimientos**: Formularios y reportes
-  **Dashboard Administrativo**: Métricas y reportes comparativos

## 📁 Estructura del Proyecto

```
adelante_sumerce/
│
├── auth_service/              # Microservicio de autenticación
│   ├── src/
│   │   ├── config/           # Configuración y DB
│   │   ├── controllers/      # Controladores
│   │   ├── middlewares/      # Autenticación, validación, errores
│   │   ├── models/           # Modelos Sequelize (User, RefreshToken)
│   │   ├── repositories/     # Capa de acceso a datos
│   │   ├── routes/           # Definición de rutas
│   │   ├── services/         # Lógica de negocio
│   │   ├── utils/            # JWT, helpers
│   │   └── index.js          # Entry point
│   ├── migrations/           # Scripts SQL
│   ├── package.json
│   └── README.md
│
├── adelante_sumerce/          # Aplicación principal (Frontend + API)
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   │   ├── authController.js        # Autenticación con JWT
│   │   │   └── ...
│   │   ├── middlewares/
│   │   │   ├── authMiddleware.js        # Middleware JWT
│   │   ├── models/
│   │   ├── routes/
│   │   │   ├── *Routes.js               # Rutas con JWT
│   │   ├── services/
│   │   │   ├── authServiceClient.js     # Cliente del auth service
│   │   │   └── ...
│   │   ├── views/
│   │   └── index.js                     # Entry point con JWT
│   └── package.json
│
├── sources/                   # Scripts SQL iniciales
├── MIGRATION_GUIDE.md        # Guía completa de migración
├── start.sh                  # Script para iniciar ambos servicios
├── stop.sh                   # Script para detener servicios
└── README.md                 # Este archivo
```

## 🚀 Inicio Rápido

### 🐳 Opción 1: Docker Compose (Recomendado)

La forma más rápida de desplegar el proyecto completo con balanceo de carga incluido.

**Características:**
- ✅ 3 réplicas de la aplicación principal con Nginx load balancer
- ✅ Todos los servicios configurados automáticamente
- ✅ Base de datos, Redis y Kafka incluidos
- ✅ Health checks y restart automático

```bash
# Windows
docker-deploy.bat setup
# Editar .env con tus configuraciones
docker-deploy.bat start

# Linux/Mac
./docker-deploy.sh setup
# Editar .env con tus configuraciones
./docker-deploy.sh start
```

**Acceder:**
- Aplicación: http://localhost
- Auth Service: http://localhost:3001

📖 **Documentación completa:** Ver [QUICK_START_DOCKER.md](QUICK_START_DOCKER.md)

---

### 💻 Opción 2: Instalación Manual (Node.js)

Para desarrollo local sin Docker.

**Prerequisitos:**
- Node.js >= 14.x
- MySQL >= 5.7
- Redis (opcional, para cache)
- Kafka (opcional, para reportes)
- npm o yarn

### 1. Configurar Base de Datos

```bash
# Crear la base de datos
mysql -u root -p
CREATE DATABASE adelante_sumerce;
exit;

# Ejecutar script inicial
mysql -u root -p adelante_sumerce < sources/create_database.sql

# Ejecutar migraciones para JWT
mysql -u root -p adelante_sumerce < auth_service/migrations/001_add_refresh_tokens.sql
```

### 2. Instalación y Configuración

```bash
# Hacer scripts ejecutables
chmod +x start.sh stop.sh

# Iniciar servicios (instala dependencias automáticamente)
./start.sh
```

El script `start.sh` automáticamente:
- Verifica puertos disponibles
- Instala dependencias si no están
- Configura archivos .env
- Inicia ambos servicios
- Muestra logs en tiempo real

### 3. Acceder a la Aplicación

- **Frontend**: http://localhost:3030
- **Auth Service**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

### 4. Detener Servicios

```bash
./stop.sh
```

## 🧪 Tests Unitarios

Este proyecto cuenta con **74 tests unitarios** distribuidos en los 3 servicios:

```bash

# Ejecutar por servicio
cd adelante_sumerce && npm test
cd auth_service && npm test
cd report_service && npm test

```

## 📖 Documentación Completa

- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)**: Guía completa de migración y arquitectura
- **[auth_service/README.md](./auth_service/README.md)**: API del microservicio de autenticación

## 🔐 Cómo Funciona la Autenticación JWT

### Flujo Simplificado

```
1. Usuario hace login
   ↓
2. Recibe Access Token (15min) + Refresh Token (7 días)
   ↓
3. Access token se usa para requests
   ↓
4. Cuando expira, se refresca automáticamente
   ↓
5. Sesión se mantiene "infinita" sin que el usuario lo note
```

Ver detalles completos en [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md#-cómo-funciona)

## 🛡️ Seguridad

- JWT firmados y verificados
- Cookies httpOnly (no accesibles desde JS)
- Refresh tokens rotativos (un solo uso)
- Rate limiting
- CORS configurado
- Passwords hasheados con bcrypt

## 📊 Roles

- **Emprendedor**: Gestiona su emprendimiento, genera reportes individuales
- **Administrador**: Ve todos los emprendimientos, genera reportes comparativos

## 🧪 Testing Rápido

```bash
# Verificar que auth service funciona
curl http://localhost:3001/api/health

# Registrar usuario
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "confirmPassword": "password123",
    "celular": "3001234567",
    "nombres": "Test",
    "apellidos": "User"
  }'
```

Más ejemplos en [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md#-testing)

## 📝 Scripts Disponibles

### Inicio Rápido
```bash
./start.sh      # Inicia ambos servicios
./stop.sh       # Detiene ambos servicios
```

### Auth Service
```bash
cd auth_service
npm start       # Producción
npm run dev     # Desarrollo
```

### Frontend
```bash
cd adelante_sumerce
npm start       # Producción con JWT
npm run dev     # Desarrollo con JWT
```

## 🐛 Troubleshooting

### Servicios no inician
```bash
# Verificar que MySQL esté corriendo
mysql -u root -p -e "SELECT 1;"

# Verificar puertos libres
lsof -i :3001
lsof -i :3030
```

### Ver logs
```bash
tail -f logs/auth_service.log
tail -f logs/frontend.log
```

Más soluciones en [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md#-troubleshooting)

## 🔄 Implementación

Este proyecto utiliza **autenticación JWT** con microservicio independiente:

| Característica | Implementación |
|----------------|----------------|
| Autenticación | JWT + Refresh Tokens |
| Arquitectura | Microservicios |
| Sesiones | Sliding session (infinita) |
| Comando | `npm run dev` |

## 📦 Deployment

Ver guía completa de deployment en [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md#-deployment)

Opciones:
- Docker Compose
- Servidores separados
- Cloud providers (AWS, Azure, GCP)

## 🔧 Mantenimiento

```bash
# Limpiar tokens expirados (ejecutar periódicamente)
mysql -u root -p adelante_sumerce < auth_service/migrations/cleanup_tokens.sql
```

Configurar cron job:
```cron
0 3 * * * mysql -u root adelante_sumerce < /ruta/cleanup_tokens.sql
```

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar funcionalidad'`)
4. Push (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

ISC

---

**¿Necesitas ayuda?** Consulta [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) para información detallada.
