const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { testConnection } = require('./config/database');
const redisClient = require('./config/redis');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

const app = express();

// Configuración de seguridad
app.use(helmet());

// CORS
app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (como apps móviles o Postman)
    if (!origin) return callback(null, true);
    
    if (config.cors.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Demasiadas peticiones desde esta IP, por favor intente de nuevo más tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (simple)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rutas
routes(app);

// Manejo de rutas no encontradas
app.use(notFoundHandler);

// Manejo de errores
app.use(errorHandler);

// Iniciar servidor
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Conectar a Redis (no bloqueante)
    console.log('🔄 Iniciando conexión a Redis...');
    await redisClient.connect().catch(err => {
      console.warn('⚠️  Redis no disponible, continuando sin caché:', err.message);
    });

    // Sincronizar modelos (solo en desarrollo)
    if (config.server.env === 'development') {
      const { sequelize } = require('./config/database');
      // No usar sync({ force: true }) en producción
      // await sequelize.sync({ alter: true });
      console.log('✅ Base de datos sincronizada');
    }

    // Start server
    const PORT = config.server.port;
    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════╗
║   🚀 Auth Service Running            ║
║   Port: ${PORT}                      ║
║   Environment: ${config.server.env.padEnd(19)}║
║   Redis: ${redisClient.isReady() ? '✅ Conectado' : '❌ Desconectado'}         ║
║   Health: http://localhost:${PORT}/api/health
╚══════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
};

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err);
  redisClient.disconnect().finally(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err);
  redisClient.disconnect().finally(() => process.exit(1));
});

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  redisClient.disconnect().finally(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received. Shutting down gracefully...');
  redisClient.disconnect().finally(() => process.exit(0));
});

// Iniciar
startServer();

module.exports = app;
