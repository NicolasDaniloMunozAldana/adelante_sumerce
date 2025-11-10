class ApiError extends Error {
  constructor(statusCode, message, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, errors = null) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'No autorizado') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Prohibido') {
    return new ApiError(403, message);
  }

  static notFound(message = 'No encontrado') {
    return new ApiError(404, message);
  }

  static internal(message = 'Error interno del servidor') {
    return new ApiError(500, message);
  }
}

module.exports = ApiError;
