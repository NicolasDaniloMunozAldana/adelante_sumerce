const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Ruta para mostrar el formulario de login
router.get('/login', authController.showLoginForm);

// Ruta para procesar el login
router.post('/login', authController.processLogin);

// Ruta para cerrar sesión
router.get('/logout', authController.logout);

// Ruta para registro (placeholder)
router.get('/register', authController.showRegisterForm);

// Ruta para recuperar contraseña
router.get('/forgot-password', authController.showForgotPassword);

module.exports = router;
