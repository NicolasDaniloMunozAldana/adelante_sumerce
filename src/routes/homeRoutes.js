const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const { ensureEmprendedor } = require('../middlewares/authMiddleware');

// Rutas protegidas (para usuarios autenticados, cualquier rol)
router.get('/home', ensureEmprendedor, homeController.showHome);
router.get('/dashboard', ensureEmprendedor, homeController.showDashboard);
router.get('/soporte', ensureEmprendedor, homeController.showSoporte);
router.get('/contacto', ensureEmprendedor, homeController.showContacto);

module.exports = router;
