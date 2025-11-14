const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const sequelize = require('./config/database');
const { connectRedis } = require('./config/redis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3030;

// Test database connection
sequelize.authenticate()
  .then(() => {
    console.log('✅ Conexión a la base de datos establecida correctamente.');
  })
  .catch(err => {
    console.error('❌ No se pudo conectar a la base de datos:', err);
  });

// Connect to Redis
connectRedis()
  .then(() => {
    console.log('✅ Redis conectado correctamente.');
  })
  .catch(err => {
    console.error('⚠️  No se pudo conectar a Redis (caché deshabilitado):', err.message);
  });

// Configuración del motor de plantillas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
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

// Usar rutas
app.use('/', authRoutes); // Rutas de autenticación
app.use('/', homeRoutes); // Rutas principales en la raíz
app.use('/caracterizacion', characterizationRoutes); // Rutas de caracterización
app.use('/reportes', reportRoutes); // Rutas de reportes
app.use('/admin', adminRoutes); // Rutas de administrador

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
