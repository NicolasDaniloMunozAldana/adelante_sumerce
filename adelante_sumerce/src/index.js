const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const sequelize = require('./config/database');
const { connectRedis } = require('./config/redis');
const kafkaWriteConsumer = require('./kafka/kafkaWriteConsumer');
const metricsMiddleware = require('./middlewares/metricsMiddleware');
const { metrics } = require('./monitoring/metrics');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3030;

app.set('trust proxy', 1);

// Test database connection
sequelize.authenticate()
  .then(() => {
    console.log('✅ Conexión a la base de datos establecida correctamente.');
    metrics.dbAvailable.set(1);
  })
  .catch(err => {
    console.error('❌ No se pudo conectar a la base de datos:', err);
    metrics.dbAvailable.set(0);
    metrics.dbConnectionErrors.inc();
  });

// Connect to Redis
connectRedis()
  .then(() => {
    console.log('✅ Redis conectado correctamente.');
    metrics.redisAvailable.set(1);
  })
  .catch(err => {
    console.error('⚠️  No se pudo conectar a Redis (caché deshabilitado):', err.message);
    metrics.redisAvailable.set(0);
  });

// Start Kafka Write Consumer (para sincronizar escrituras con BD)
kafkaWriteConsumer.start()
  .then(() => {
    console.log('✅ Kafka Write Consumer iniciado correctamente.');
    metrics.kafkaAvailable.set(1);
  })
  .catch(err => {
    console.error('⚠️  No se pudo iniciar Kafka Write Consumer:', err.message);
    metrics.kafkaAvailable.set(0);
  });

// Configuración del motor de plantillas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(metricsMiddleware); // Monitoring middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(cookieParser()); // SOLO cookies para JWT (stateless)

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const homeRoutes = require('./routes/homeRoutes');
const characterizationRoutes = require('./routes/characterizationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const adminRoutes = require('./routes/adminRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const monitoringRoutes = require('./routes/monitoringRoutes');

// Usar rutas
app.use('/', monitoringRoutes); // Monitoring routes (health, metrics)
app.use('/', authRoutes); // Rutas de autenticación
app.use('/', homeRoutes); // Rutas principales en la raíz
app.use('/caracterizacion', characterizationRoutes); // Rutas de caracterización
app.use('/reportes', reportRoutes); // Rutas de reportes
app.use('/admin', adminRoutes); // Rutas de administrador
app.use('/api/chatbot', chatbotRoutes); // Rutas del chatbot

// Ruta por defecto - redirecciona al login si no tiene token
app.get('/', (req, res) => {
  const accessToken = req.cookies?.accessToken;
  if (!accessToken) {
    res.redirect('/login');
  } else {
    // Redirigir a home, el middleware se encarga de verificar roles
    res.redirect('/home');
  }
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).send('Página no encontrada');
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║   Adelante Sumercé Running        ║
║   Port: ${PORT}                      ║
║   URL: http://localhost:${PORT}      ║
║   Auth: JWT + Refresh Tokens         ║
║   Cache: Redis Enabled                ║
╚══════════════════════════════════════╝
  `);
});

// Manejo de cierre graceful
const { disconnectRedis } = require('./config/redis');

process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando aplicación...');
  
  try {
    await kafkaWriteConsumer.disconnect();
    console.log('✅ Kafka Write Consumer desconectado correctamente.');
  } catch (err) {
    console.error('⚠️  Error al desconectar Kafka Write Consumer:', err.message);
  }
  
  try {
    await disconnectRedis();
    console.log('✅ Redis desconectado correctamente.');
  } catch (err) {
    console.error('⚠️  Error al desconectar Redis:', err.message);
  }
  
  try {
    await sequelize.close();
    console.log('✅ Base de datos desconectada correctamente.');
  } catch (err) {
    console.error('⚠️  Error al desconectar la base de datos:', err.message);
  }
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Cerrando aplicación...');
  
  try {
    await kafkaWriteConsumer.disconnect();
    console.log('✅ Kafka Write Consumer desconectado correctamente.');
  } catch (err) {
    console.error('⚠️  Error al desconectar Kafka Write Consumer:', err.message);
  }
  
  try {
    await disconnectRedis();
    console.log('✅ Redis desconectado correctamente.');
  } catch (err) {
    console.error('⚠️  Error al desconectar Redis:', err.message);
  }
  
  try {
    await sequelize.close();
    console.log('✅ Base de datos desconectada correctamente.');
  } catch (err) {
    console.error('⚠️  Error al desconectar la base de datos:', err.message);
  }
  
  process.exit(0);
});

module.exports = app;
