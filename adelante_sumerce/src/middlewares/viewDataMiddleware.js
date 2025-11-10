/**
 * Middleware para pasar datos del usuario a las vistas EJS
 * Los datos vienen del JWT decodificado en req.user (no de sesión)
 * Este middleware debe ejecutarse DESPUÉS de ensureAuthenticated
 */
function injectUserToViews(req, res, next) {
  // Si existe req.user (inyectado por el middleware de autenticación)
  // lo hacemos disponible para todas las vistas EJS
  res.locals.user = req.user || null;
  
  // También podemos inyectar helpers
  res.locals.isAuthenticated = !!req.user;
  res.locals.isAdmin = req.user?.role === 'administrador';
  res.locals.isEmprendedor = req.user?.role === 'emprendedor';
  
  next();
}

module.exports = {
  injectUserToViews
};
