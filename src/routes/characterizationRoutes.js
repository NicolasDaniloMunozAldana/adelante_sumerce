const express = require('express');
const router = express.Router();
const characterizationController = require('../controllers/characterizationController');
const ensureAuthenticated = require('../middlewares/authMiddleware');


// Mostrar formulario de caracterización
router.get('/', ensureAuthenticated ,characterizationController.showCharacterizationForm);

// Guardar caracterización
router.post('/save', ensureAuthenticated, characterizationController.saveCharacterization);

// Resultados de caracterización
router.get('/resultados/:businessId', ensureAuthenticated, characterizationController.getCharacterizationResults);

module.exports = router;
