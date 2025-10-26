// src/middlewares/authMiddleware.js

function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user && req.session.user.isAuthenticated) {
    return next();
  }
  // si petición XHR o API, podrías devolver 401; aquí redirigimos a login
  return res.redirect("/login");
}

module.exports = ensureAuthenticated;
