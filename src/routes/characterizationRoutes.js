const express = require('express');
const router = express.Router();
const characterizationController = require('../controllers/characterizationController');
const { ensureAuthenticated } = require('../middlewares/authMiddleware');


// Mostrar formulario de caracterización (solo para usuarios autenticados)
router.get('/', ensureAuthenticated, characterizationController.showCharacterizationForm);

// Guardar caracterización (solo para usuarios autenticados)
router.post('/save', ensureAuthenticated, characterizationController.saveCharacterization);

module.exports = router;
