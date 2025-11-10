const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { ensureAuthenticated, ensureAdmin } = require('../middlewares/authMiddlewareJWT');

// Todas las rutas de administrador requieren autenticación y rol de administrador
router.use(ensureAuthenticated, ensureAdmin);

// Dashboard del administrador
router.get('/dashboard', adminController.showAdminDashboard);

// Página de emprendimientos
router.get('/emprendimientos', adminController.showEmprendimientos);

// Dashboard detallado de un emprendimiento específico
router.get('/emprendimientos/:id', adminController.showBusinessDashboard);

// API: Obtener todos los emprendimientos
router.get('/api/businesses', adminController.getAllBusinesses);

// API: Obtener un emprendimiento específico
router.get('/api/businesses/:id', adminController.getBusinessById);

// API: Obtener estadísticas generales
router.get('/api/statistics', adminController.getStatistics);

// API: Obtener todos los usuarios emprendedores
router.get('/api/users', adminController.getAllUsers);

// Rutas para reportes comparativos
router.get('/reportes/generar-pdf', adminController.generateComparativePDF);
router.get('/reportes/generar-excel', adminController.generateComparativeExcel);

// Ruta para generar reporte individual de un emprendimiento
router.get('/emprendimientos/:id/generar-pdf', adminController.generateBusinessPDF);

module.exports = router;
