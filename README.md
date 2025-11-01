# adelante_sumerce

Para desactivar el modo demo: 
// Test database connection (skip in demo mode)
if (process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'False') { #Cambian false o true
  console.log('🟡 DEMO_MODE activo: omitiendo conexión a la base de datos.');
} else {
  sequelize.authenticate()
    .then(() => {
      console.log('Conexión a la base de datos establecida correctamente.');
    })
    .catch(err => {
      console.error('No se pudo conectar a la base de datos:', err);
    });
}
