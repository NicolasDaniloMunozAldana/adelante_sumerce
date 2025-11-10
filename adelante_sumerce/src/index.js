const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const sequelize = require('./config/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3030;

// Test database connection
sequelize.authenticate()
  .then(() => {
    console.log('Conexión a la base de datos establecida correctamente.');
  })
  .catch(err => {
    console.error('No se pudo conectar a la base de datos:', err);
  });

// Configuración del motor de plantillas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(cookieParser());

// Configuración de sesiones (mantenemos para retrocompatibilidad)
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecurepassword',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 días
  }
}));

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

// Ruta por defecto - redirecciona al login si no está autenticado
app.get('/', (req, res) => {
  if (!req.session?.user?.isAuthenticated) {
    res.redirect('/login');
  } else {
    if (req.session.user.rol === 'administrador') {
      res.redirect('/admin/dashboard');
    } else {
      res.redirect('/home');
    }
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
╚══════════════════════════════════════╝
  `);
});

module.exports = app;
