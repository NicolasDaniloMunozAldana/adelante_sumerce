const express = require('express');
const router = express.Router();
const characterizationController = require('../controllers/characterizationController');
const { ensureAuthenticated } = require('../middlewares/authMiddleware');
const { injectUserToViews } = require('../middlewares/viewDataMiddleware');

// Mostrar formulario de caracterización (solo para usuarios autenticados)
router.get('/', ensureAuthenticated, injectUserToViews, characterizationController.showCharacterizationForm);

// Guardar caracterización (solo para usuarios autenticados)
router.post('/save', ensureAuthenticated, characterizationController.saveCharacterization);

module.exports = router;
