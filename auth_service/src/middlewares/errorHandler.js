const ApiError = require('../utils/ApiError');

/**
 * Maneja errores de la aplicación
 */
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Si no es un ApiError, convertirlo en uno
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Error interno del servidor';
    error = new ApiError(statusCode, message);
  }

  // Log del error (en producción usar un logger apropiado)
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      statusCode: error.statusCode,
      message: error.message,
      stack: error.stack,
      errors: error.errors
    });
  }

  // Enviar respuesta de error
  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    errors: error.errors,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

/**
 * Maneja rutas no encontradas
 */
const notFoundHandler = (req, res, next) => {
  const error = ApiError.notFound(`Ruta no encontrada: ${req.originalUrl}`);
  next(error);
};

module.exports = {
  errorHandler,
  notFoundHandler
};
