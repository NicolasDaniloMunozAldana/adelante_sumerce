const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

// Ruta para la página de inicio
router.get('/home', homeController.showHome);

// Ruta para caracterización
router.get('/caracterizacion', homeController.showCaracterizacion);

// Ruta para dashboard
router.get('/dashboard', homeController.showDashboard);

// Ruta para soporte
router.get('/soporte', homeController.showSoporte);

// Ruta para contacto
router.get('/contacto', homeController.showContacto);

module.exports = router;
