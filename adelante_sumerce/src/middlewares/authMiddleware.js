// Middleware para verificar que el usuario está autenticado
function ensureAuthenticated(req, res, next) {
  if (req.session.user && req.session.user.isAuthenticated) {
    return next(); // hay sesión activa → continuar
  } else {
    return res.redirect('/login');
  }
}

// Middleware para verificar que el usuario es administrador
function ensureAdmin(req, res, next) {
  if (req.session.user && req.session.user.isAuthenticated) {
    if (req.session.user.rol === 'administrador') {
      return next(); // es administrador → continuar
    } else {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Solo administradores pueden acceder a este recurso.'
      });
    }
  } else {
    return res.redirect('/login');
  }
}

// Middleware para verificar que el usuario es emprendedor
function ensureEmprendedor(req, res, next) {
  if (req.session.user && req.session.user.isAuthenticated) {
    if (req.session.user.rol === 'emprendedor') {
      return next(); // es emprendedor → continuar
    } else {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Solo emprendedores pueden acceder a este recurso.'
      });
    }
  } else {
    return res.redirect('/login');
  }
}

module.exports = {
  ensureAuthenticated,
  ensureAdmin,
  ensureEmprendedor
};
