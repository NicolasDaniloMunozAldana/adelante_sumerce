const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rutas de autenticación
router.get('/', (req, res) => res.redirect('/login'));
router.get('/login', authController.showLoginForm);
router.post('/login', authController.processLogin);

// Rutas de registro
router.get('/register', authController.showRegisterForm);
router.post('/register', authController.processRegister);

// Ruta para cerrar sesión
router.get('/logout', authController.logout);

// Ruta para recuperar contraseña
router.get('/forgot-password', authController.showForgotPassword);

module.exports = router;
