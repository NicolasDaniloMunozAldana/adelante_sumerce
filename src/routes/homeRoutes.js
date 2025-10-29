// src/routes/homeRoutes.js
const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const ensureAuthenticated = require('../middlewares/authMiddleware');

// Rutas protegidas
router.get('/', ensureAuthenticated, homeController.showHome);
router.get('/home', ensureAuthenticated, homeController.showHome);
router.get('/caracterizacion', ensureAuthenticated, homeController.showCaracterizacion);
router.post('/caracterizacion/guardar', ensureAuthenticated, homeController.saveCaracterizacion);
router.get('/dashboard', ensureAuthenticated, homeController.showDashboard);
router.get('/caracterizacion', ensureAuthenticated, homeController.showCaracterizacion);
router.get('/soporte', ensureAuthenticated, homeController.showSoporte);
router.get('/contacto', ensureAuthenticated, homeController.showContacto);

module.exports = router;
