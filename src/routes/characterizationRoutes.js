const express = require('express');
const router = express.Router();
const characterizationController = require('../controllers/characterizationController');
const authMiddleware = require('../middlewares/authMiddleware');


// Mostrar formulario de caracterización
router.get('/', characterizationController.showCharacterizationForm);

// Guardar caracterización
router.post('/guardar', characterizationController.saveCharacterization);

// Obtener resultados de caracterización
router.get('/resultados/:businessId', characterizationController.getCharacterizationResults);

module.exports = router;
