const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const { ensureAuthenticated } = require('../middlewares/authMiddleware');
const { injectUserToViews } = require('../middlewares/viewDataMiddleware');

// Rutas protegidas (para usuarios autenticados, cualquier rol)
// El middleware injectUserToViews pasa req.user a las vistas EJS
router.get('/', ensureAuthenticated, injectUserToViews, homeController.showHome);
router.get('/home', ensureAuthenticated, injectUserToViews, homeController.showHome);
router.get('/dashboard', ensureAuthenticated, injectUserToViews, homeController.showDashboard);
router.get('/caracterizacion', ensureAuthenticated, injectUserToViews, homeController.showCaracterizacion);
router.get('/soporte', ensureAuthenticated, injectUserToViews, homeController.showSoporte);
router.get('/contacto', ensureAuthenticated, injectUserToViews, homeController.showContacto);

module.exports = router;
