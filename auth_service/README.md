# Auth Service - Adelante Sumercé

Microservicio de autenticación para la plataforma Adelante Sumercé. Implementa autenticación basada en JWT con access tokens de corta duración y refresh tokens rotativos para mantener sesiones seguras y persistentes.

## 🚀 Características

- ✅ Autenticación con JWT (JSON Web Tokens)
- ✅ Access tokens de corta duración (15 minutos por defecto)
- ✅ Refresh tokens rotativos (sliding session) para sesiones prolongadas
- ✅ **Caché con Redis para alta disponibilidad**
- ✅ **Fallback automático a caché si la BD cae**
- ✅ Gestión de roles (administrador, emprendedor)
- ✅ Registro de usuarios
- ✅ Cierre de sesión individual y masivo
- ✅ Rate limiting para prevenir ataques
- ✅ Seguridad con Helmet
- ✅ CORS configurado
- ✅ Validación de datos
- ✅ Arquitectura limpia y escalable

## 📋 Requisitos Previos

- Node.js >= 14.x
- MySQL >= 5.7
- **Redis >= 6.x** (opcional pero recomendado)
- npm o yarn

## 🛠️ Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
cp .env.example .env
```

Edita el archivo `.env` con tus configuraciones:
```env
PORT=3001
DB_HOST=localhost
DB_NAME=adelante_sumerce
DB_USER=root
DB_PASSWORD=tu_password

# Redis (opcional pero recomendado)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=1

JWT_ACCESS_SECRET=genera-un-secreto-muy-seguro-aqui
JWT_REFRESH_SECRET=genera-otro-secreto-muy-seguro-aqui
```

3. Ejecutar migraciones de base de datos:
```bash
mysql -u root -p adelante_sumerce < migrations/001_add_refresh_tokens.sql
```

## 🚀 Ejecución

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm start
```

## 📡 API Endpoints

### Autenticación

#### POST `/api/auth/register`
Registra un nuevo usuario.

**Request Body:**
```json
{
  "email": "usuario@example.com",
  "password": "password123",
  "confirmPassword": "password123",
  "celular": "3001234567",
  "nombres": "Juan",
  "apellidos": "Pérez"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registro exitoso",
  "data": {
    "user": {
      "id": 1,
      "email": "usuario@example.com",
      "role": "emprendedor"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": "15m"
  }
}
```

#### POST `/api/auth/login`
Inicia sesión.

**Request Body:**
```json
{
  "email": "usuario@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Inicio de sesión exitoso",
  "data": {
    "user": {
      "id": 1,
      "email": "usuario@example.com",
      "firstName": "Juan",
      "lastName": "Pérez",
      "role": "emprendedor"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": "15m"
  }
}
```

#### POST `/api/auth/refresh`
Refresca el access token usando el refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tokens actualizados exitosamente",
  "data": {
    "user": { ... },
    "accessToken": "nuevo_access_token",
    "refreshToken": "nuevo_refresh_token",
    "expiresIn": "15m"
  }
}
```

#### POST `/api/auth/logout`
Cierra la sesión actual.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### POST `/api/auth/logout-all`
Cierra todas las sesiones del usuario (requiere autenticación).

**Headers:**
```
Authorization: Bearer {accessToken}
```

#### GET `/api/auth/verify`
Verifica si un access token es válido.

**Headers:**
```
Authorization: Bearer {accessToken}
```

#### GET `/api/auth/me`
Obtiene información del usuario autenticado.

**Headers:**
```
Authorization: Bearer {accessToken}
```

### Health Check

#### GET `/api/health`
Verifica el estado del servicio, Redis y base de datos.

**Response:**
```json
{
  "success": true,
  "message": "Auth service is healthy",
  "timestamp": "2025-11-12T...",
  "uptime": 1234.56,
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

## 🔐 Seguridad

### Access Tokens
- Duración corta (15 minutos por defecto)
- Firmados con JWT
- Incluyen información del usuario y rol
- No se almacenan en base de datos

### Refresh Tokens
- Duración larga (7 días por defecto)
- Rotación automática (sliding session)
- Almacenados en base de datos
- Pueden ser revocados
- Incluyen información de IP y User-Agent

### Flujo de Autenticación

1. Usuario inicia sesión → recibe access token y refresh token
2. Usuario usa access token para hacer peticiones
3. Cuando access token expira → usa refresh token para obtener nuevos tokens
4. Refresh token antiguo se revoca, nuevo refresh token se emite (rotación)
5. Este proceso se repite, manteniendo la sesión "infinita"

## 🏗️ Arquitectura

```
src/
├── config/           # Configuraciones
│   ├── database.js   # Configuración de MySQL
│   ├── redis.js      # Configuración de Redis
│   └── index.js      # Config general
├── controllers/      # Controladores (lógica de endpoints)
├── middlewares/      # Middlewares (autenticación, validación, errores)
├── models/          # Modelos de Sequelize
├── repositories/    # Capa de acceso a datos (con caché integrado)
├── routes/          # Definición de rutas
├── services/        # Lógica de negocio
│   ├── authService.js
│   └── cacheService.js  # Servicio de caché Redis
├── utils/           # Utilidades (JWT, errores, respuestas)
└── index.js         # Punto de entrada
```

### Sistema de Caché

El servicio implementa un **sistema de caché robusto con Redis** que:

- 📦 Almacena usuarios en caché durante 2 horas
- ⚡ Consulta primero Redis antes que la BD (Cache-Aside Pattern)
- 🛡️ **Fallback automático**: Si la BD cae, sirve datos desde caché
- 🔄 Auto-reconexión a Redis si se pierde la conexión
- ✅ Funciona sin Redis (graceful degradation)

**Para más detalles, ver:** [REDIS_CACHE.md](./REDIS_CACHE.md)

## 🔧 Mantenimiento

### Limpieza de Tokens Expirados

Se recomienda ejecutar periódicamente:
```bash
mysql -u root -p adelante_sumerce < migrations/cleanup_tokens.sql
```

O configurar un cron job:
```bash
# Limpiar tokens expirados cada día a las 3 AM
0 3 * * * mysql -u root -p adelante_sumerce < /ruta/migrations/cleanup_tokens.sql
```

## 🧪 Testing

```bash
npm test
```

## 📝 Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| PORT | Puerto del servidor | 3001 |
| DB_HOST | Host de MySQL | localhost |
| DB_PORT | Puerto de MySQL | 3306 |
| DB_NAME | Nombre de la BD | adelante_sumerce |
| DB_USER | Usuario de MySQL | root |
| DB_PASSWORD | Contraseña de MySQL | |
| REDIS_HOST | Host de Redis | localhost |
| REDIS_PORT | Puerto de Redis | 6379 |
| REDIS_PASSWORD | Contraseña de Redis | |
| REDIS_DB | Base de datos Redis | 0 |
| JWT_ACCESS_SECRET | Secreto para access tokens | (requerido) |
| JWT_REFRESH_SECRET | Secreto para refresh tokens | (requerido) |
| JWT_ACCESS_EXPIRATION | Duración access token | 15m |
| JWT_REFRESH_EXPIRATION | Duración refresh token | 7d |
| ALLOWED_ORIGINS | Orígenes permitidos CORS | http://localhost:3030 |

## 📄 Licencia

ISC
