const express = require('express');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3030;

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

// Ruta por defecto - redirecciona al login (debe ir primero)
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const homeRoutes = require('./routes/homeRoutes');

// Usar rutas
app.use('/', authRoutes);
app.use('/', homeRoutes);

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).send('Página no encontrada');
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

module.exports = app;
