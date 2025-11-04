const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middlewares/authMiddleware');

// Aplica el middleware de autenticación
router.use(ensureAuthenticated);

// Ruta raíz: redirige según el rol del usuario autenticado
router.get('/', (req, res) => {
  const { rol } = req.session.user;

  if (rol === 'administrador') {
    return res.redirect('/admin/dashboard');
  } else if (rol === 'emprendedor') {
    return res.redirect('/home');
  } else {
    // En caso de que haya otro rol o un error
    return res.redirect('/login');
  }
});

module.exports = router;
