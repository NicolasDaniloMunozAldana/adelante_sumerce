function ensureAuthenticated(req, res, next) {
  if (process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true') {
    if (!req.session.user) {
      req.session.user = { id: 1, name: 'Demo User', email: 'demo@example.com', isAuthenticated: true };
    }
    return next();
  }
  if (req.session.user && req.session.user.isAuthenticated) {
    return next();
  } else {
    return res.redirect('/login');
  }
}

module.exports = ensureAuthenticated;
