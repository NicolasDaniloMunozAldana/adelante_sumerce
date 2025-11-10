# Migración a Arquitectura de Microservicios con JWT

Este documento describe la refactorización del proyecto **Adelante Sumercé** para extraer la autenticación a un microservicio independiente usando JWT y refresh tokens rotativos.

## 📋 Tabla de Contenidos

1. [Resumen de Cambios](#resumen-de-cambios)
2. [Arquitectura](#arquitectura)
3. [Instalación y Configuración](#instalación-y-configuración)
4. [Migración de Base de Datos](#migración-de-base-de-datos)
5. [Cómo Funciona](#cómo-funciona)
6. [Testing](#testing)
7. [Deployment](#deployment)

## 🎯 Resumen de Cambios

### Antes (Monolito con Sesiones)
- Autenticación basada en `express-session`
- Sesiones almacenadas en memoria o Redis
- Timeout de sesión fijo
- Toda la lógica en un solo proyecto

### Después (Microservicios con JWT)
- **Auth Service**: Microservicio independiente para autenticación
- **Access Tokens**: JWT de corta duración (15 minutos)
- **Refresh Tokens**: JWT de larga duración con rotación automática (7 días)
- **Sliding Session**: Sensación de "auth infinita" sin comprometer seguridad
- **Retrocompatibilidad**: El frontend sigue funcionando igual

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                   Adelante Sumercé                       │
│                    (Frontend + API)                      │
│                    Puerto: 3030                          │
└───────────────────────┬─────────────────────────────────┘
                        │
                        │ HTTP Requests
                        │ (login, register, refresh)
                        ▼
┌─────────────────────────────────────────────────────────┐
│                   Auth Service                           │
│            (Microservicio de Autenticación)              │
│                    Puerto: 3001                          │
│                                                          │
│  ┌──────────────────────────────────────────────┐      │
│  │  • Login/Register                             │      │
│  │  • Access Token (15min)                       │      │
│  │  • Refresh Token (7 días, rotativo)           │      │
│  │  • Verificación de tokens                     │      │
│  │  • Gestión de roles                           │      │
│  └──────────────────────────────────────────────┘      │
└───────────────────────┬─────────────────────────────────┘
                        │
                        │ Database Queries
                        ▼
┌─────────────────────────────────────────────────────────┐
│                   MySQL Database                         │
│                 adelante_sumerce                         │
│                                                          │
│  • usuarios                                              │
│  • refresh_tokens (nueva)                                │
│  • emprendimientos                                       │
│  • ...otras tablas                                       │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Instalación y Configuración

### 1. Auth Service

```bash
# Navegar al directorio del auth service
cd auth_service

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# Ejecutar migraciones de base de datos
mysql -u root -p adelante_sumerce < migrations/001_add_refresh_tokens.sql

# Iniciar el servicio
npm run dev
```

### 2. Proyecto Principal (Adelante Sumercé)

```bash
# Navegar al directorio principal
cd adelante_sumerce

# Instalar dependencias (incluye cookie-parser y axios)
npm install

# Configurar variables de entorno
cp .env.jwt .env
# Editar .env con tus configuraciones

# Iniciar con JWT
npm run dev:jwt
```

## 💾 Migración de Base de Datos

### Nuevas Tablas

#### `refresh_tokens`
Almacena los refresh tokens emitidos:

```sql
CREATE TABLE refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    token VARCHAR(500) NOT NULL UNIQUE,
    expira_en DATETIME NOT NULL,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    revocado_en DATETIME NULL,
    reemplazado_por_token VARCHAR(500) NULL,
    ip_address VARCHAR(50) NULL,
    user_agent VARCHAR(500) NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
```

### Ejecutar Migraciones

```bash
# Desde el directorio auth_service
mysql -u root -p adelante_sumerce < migrations/001_add_refresh_tokens.sql
```

### Limpieza Periódica

Se recomienda ejecutar el script de limpieza periódicamente:

```bash
# Limpiar tokens expirados
mysql -u root -p adelante_sumerce < migrations/cleanup_tokens.sql
```

O configurar un cron job:

```cron
# Ejecutar todos los días a las 3 AM
0 3 * * * mysql -u root -p adelante_sumerce < /ruta/auth_service/migrations/cleanup_tokens.sql
```

## 🔐 Cómo Funciona

### Flujo de Autenticación

```
1. Usuario → Login (email + password)
   ↓
2. Auth Service → Valida credenciales
   ↓
3. Auth Service → Genera access token (15min) + refresh token (7 días)
   ↓
4. Adelante Sumercé → Guarda tokens en cookies httpOnly
   ↓
5. Usuario hace request → Adelante Sumercé adjunta access token
   ↓
6. Auth Service → Verifica access token
   ↓
7. ¿Access token expiró?
   │
   ├─ NO → Continuar con request
   │
   └─ SÍ → Usar refresh token para obtener nuevos tokens
       ↓
       Revocar refresh token viejo (rotación)
       ↓
       Emitir nuevos access + refresh tokens
       ↓
       Continuar con request
```

### Middleware de Autenticación

El middleware `ensureAuthenticated` en `authMiddlewareJWT.js`:

1. Verifica si hay access token
2. Si es válido → continúa
3. Si expiró → intenta refrescar automáticamente
4. Si el refresh falla → redirige a login

**Resultado**: El usuario nunca nota la expiración del access token. La sesión se siente "infinita" mientras el refresh token sea válido.

### Seguridad

#### Access Tokens
- ✅ Corta duración (15 minutos)
- ✅ No se almacenan en BD
- ✅ Contienen: userId, email, role
- ✅ Firmados con secreto JWT

#### Refresh Tokens
- ✅ Larga duración (7 días)
- ✅ Almacenados en BD (pueden ser revocados)
- ✅ Rotación automática (sliding session)
- ✅ Un refresh token solo se usa una vez
- ✅ Incluyen IP y User-Agent para auditoría

#### Cookies
- ✅ `httpOnly`: No accesibles desde JavaScript
- ✅ `sameSite: 'lax'`: Protección contra CSRF
- ✅ Diferentes expiraciones según tipo de token

## 🔄 Retrocompatibilidad

### Archivos Originales (Intactos)
- `src/index.js` - Versión original con sesiones
- `src/controllers/authController.js` - Original
- `src/middlewares/authMiddleware.js` - Original
- `src/routes/*Routes.js` - Originales

### Nuevos Archivos (JWT)
- `src/indexJWT.js` - Versión con JWT
- `src/controllers/authControllerJWT.js` - Con JWT
- `src/middlewares/authMiddlewareJWT.js` - Con JWT
- `src/routes/*RoutesJWT.js` - Con JWT
- `src/services/authServiceClient.js` - Cliente del microservicio

### Ejecutar Versión Original
```bash
npm run dev
```

### Ejecutar Versión JWT
```bash
npm run dev:jwt
```

## 🧪 Testing

### Probar Auth Service

```bash
# Health check
curl http://localhost:3001/api/health

# Registro
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

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Verificar token
curl http://localhost:3001/api/auth/verify \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Refresh token
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

### Probar Frontend

1. Iniciar auth service: `cd auth_service && npm run dev`
2. Iniciar frontend: `cd adelante_sumerce && npm run dev:jwt`
3. Abrir navegador: `http://localhost:3030`
4. Registrar usuario
5. Iniciar sesión
6. Navegar por la aplicación
7. Esperar 15 minutos (o cambiar `JWT_ACCESS_EXPIRATION` a `1m` para testing)
8. Hacer otra acción → debería refrescar automáticamente

## 📦 Deployment

### Opción 1: Servidores Separados

```bash
# Servidor 1: Auth Service
cd auth_service
npm install --production
NODE_ENV=production npm start

# Servidor 2: Frontend
cd adelante_sumerce
npm install --production
AUTH_SERVICE_URL=http://auth-server:3001/api/auth npm run start:jwt
```

### Opción 2: Docker Compose

Crear `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: adelante_sumerce
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  auth_service:
    build: ./auth_service
    ports:
      - "3001:3001"
    environment:
      DB_HOST: mysql
      DB_USER: root
      DB_PASSWORD: rootpassword
      JWT_ACCESS_SECRET: your-secret-here
      JWT_REFRESH_SECRET: your-refresh-secret-here
    depends_on:
      - mysql

  frontend:
    build: ./adelante_sumerce
    ports:
      - "3030:3030"
    environment:
      AUTH_SERVICE_URL: http://auth_service:3001/api/auth
      DB_HOST: mysql
      DB_USER: root
      DB_PASSWORD: rootpassword
    depends_on:
      - mysql
      - auth_service

volumes:
  mysql_data:
```

```bash
docker-compose up -d
```

## 🔧 Mantenimiento

### Monitoreo de Tokens

```sql
-- Ver tokens activos por usuario
SELECT 
    u.email,
    COUNT(rt.id) as active_tokens,
    MAX(rt.creado_en) as last_login
FROM usuarios u
LEFT JOIN refresh_tokens rt ON u.id = rt.usuario_id
WHERE rt.revocado_en IS NULL AND rt.expira_en > NOW()
GROUP BY u.id;

-- Ver tokens que expiran pronto
SELECT 
    u.email,
    rt.expira_en,
    rt.ip_address
FROM refresh_tokens rt
JOIN usuarios u ON rt.usuario_id = u.id
WHERE rt.revocado_en IS NULL 
  AND rt.expira_en BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 1 DAY);
```

### Revocar Tokens de Usuario

```bash
# Cerrar todas las sesiones de un usuario específico
curl -X POST http://localhost:3001/api/auth/logout-all \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

## 📝 Variables de Entorno

### Auth Service

| Variable | Descripción | Default |
|----------|-------------|---------|
| PORT | Puerto del servidor | 3001 |
| JWT_ACCESS_SECRET | Secreto para access tokens | (requerido) |
| JWT_REFRESH_SECRET | Secreto para refresh tokens | (requerido) |
| JWT_ACCESS_EXPIRATION | Duración access token | 15m |
| JWT_REFRESH_EXPIRATION | Duración refresh token | 7d |
| DB_HOST | Host de MySQL | localhost |
| DB_NAME | Nombre de la BD | adelante_sumerce |

### Adelante Sumercé

| Variable | Descripción | Default |
|----------|-------------|---------|
| PORT | Puerto del servidor | 3030 |
| AUTH_SERVICE_URL | URL del auth service | http://localhost:3001/api/auth |
| DB_HOST | Host de MySQL | localhost |
| DB_NAME | Nombre de la BD | adelante_sumerce |
| SESSION_SECRET | Secreto de sesión | (requerido) |

## 🎓 Mejores Prácticas

1. **Secretos JWT**: Usar secretos fuertes y diferentes para access y refresh tokens
2. **HTTPS**: En producción, siempre usar HTTPS
3. **Rotación de Secretos**: Rotar secretos JWT periódicamente
4. **Rate Limiting**: El auth service ya incluye rate limiting
5. **Logging**: Implementar logging adecuado para auditoría
6. **Monitoring**: Monitorear el health del auth service
7. **Backup**: Hacer backup regular de la tabla `refresh_tokens`

## 🆘 Troubleshooting

### Error: "El servicio de autenticación no está disponible"
- Verificar que el auth service esté corriendo
- Verificar la variable `AUTH_SERVICE_URL`
- Verificar firewall/puertos

### Tokens no se refrescan automáticamente
- Verificar que las cookies se estén enviando
- Verificar que `cookie-parser` esté configurado
- Verificar que el refresh token no haya expirado

### Usuario tiene que hacer login constantemente
- Verificar que las cookies tengan `httpOnly` y `sameSite` correctos
- Verificar que el dominio de las cookies sea correcto
- Verificar que el navegador acepte cookies

## 📚 Recursos

- [JWT.io](https://jwt.io/) - Información sobre JWT
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Refresh Token Best Practices](https://auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them/)

---

¿Preguntas? Consulta el README de cada servicio o contacta al equipo de desarrollo.
