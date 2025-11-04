const express = require('express');
const router = express.Router();
const characterizationController = require('../controllers/characterizationController');
const { ensureEmprendedor } = require('../middlewares/authMiddleware');

router.use(ensureEmprendedor);
// Mostrar formulario de caracterización (solo para usuarios autenticados)
router.get('/', characterizationController.showCharacterizationForm);

// Guardar caracterización (solo para usuarios autenticados)
router.post('/save', characterizationController.saveCharacterization);

module.exports = router;
