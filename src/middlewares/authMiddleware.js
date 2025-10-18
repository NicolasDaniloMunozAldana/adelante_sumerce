function ensureAuthenticated(req, res, next) {
  if (req.session.user && req.session.user.isAuthenticated) {
    return next(); // hay sesión activa → continuar
  } else {
    return res.redirect('/login');
  }
}

module.exports = ensureAuthenticated;
