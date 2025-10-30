const express = require('express');
const path = require('path');
const session = require('express-session');
const sequelize = require('./config/database');
require('dotenv').config();

// Auto DEMO fallback if DB env vars are missing
if (!process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD) {
  process.env.DEMO_MODE = '1';
  console.log('🟡 DEMO fallback: variables de BD faltantes. Ejecutando en modo DEMO sin MySQL.');
}

const app = express();
const PORT = process.env.PORT || 3030;

// Test database connection (skip in demo mode)
if (process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'false') {
  console.log('🟡 DEMO_MODE activo: omitiendo conexión a la base de datos.');
} else {
  sequelize.authenticate()
    .then(() => {
      console.log('Conexión a la base de datos establecida correctamente.');
    })
    .catch(err => {
      console.error('No se pudo conectar a la base de datos:', err);
    });
}

// Configuración del motor de plantillas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// 🧠 Configuración de sesiones
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecurepassword',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 // 1 hora
  }
}));

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const homeRoutes = require('./routes/homeRoutes');
const characterizationRoutes = require('./routes/characterizationRoutes');

// Usar rutas
app.use('/', authRoutes); // Rutas de autenticación bajo
app.use('/', homeRoutes); // Rutas principales en la raíz
app.use('/caracterizacion', characterizationRoutes); // Rutas de caracterización

// Ruta por defecto - redirecciona al login si no está autenticado
app.get('/', (req, res) => {
  if (!req.session.user) {
    res.redirect('/login');
  } else {
    res.redirect('/home');
  }
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).send('Página no encontrada');
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

module.exports = app;
