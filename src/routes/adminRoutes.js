const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { ensureAdmin } = require('../middlewares/authMiddleware');

// Todas las rutas de administrador requieren autenticación y rol de administrador
router.use(ensureAdmin);

// Dashboard del administrador
router.get('/dashboard', adminController.showAdminDashboard);

// Página de emprendimientos
router.get('/emprendimientos', adminController.showEmprendimientos);

// API: Obtener todos los emprendimientos
router.get('/api/businesses', adminController.getAllBusinesses);

// API: Obtener un emprendimiento específico
router.get('/api/businesses/:id', adminController.getBusinessById);

// API: Obtener estadísticas generales
router.get('/api/statistics', adminController.getStatistics);

// API: Obtener todos los usuarios emprendedores
router.get('/api/users', adminController.getAllUsers);

module.exports = router;
