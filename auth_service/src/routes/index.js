const authRoutes = require('./authRoutes');
const healthRoutes = require('./healthRoutes');

module.exports = (app) => {
  // Rutas de autenticación
  app.use('/api/auth', authRoutes);

  // Rutas de health check
  app.use('/api', healthRoutes);

  // Ruta raíz
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'Auth Service API',
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        auth: '/api/auth'
      }
    });
  });
};
