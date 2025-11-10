const jwtUtils = require('../utils/jwtUtils');
const userRepository = require('../repositories/UserRepository');
const ApiError = require('../utils/ApiError');

/**
 * Middleware para verificar que el usuario está autenticado
 */
const authenticate = async (req, res, next) => {
  try {
    // Obtener token del header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Token no proporcionado');
    }

    const token = authHeader.substring(7); // Remover 'Bearer '

    // Verificar el token
    const payload = jwtUtils.verifyAccessToken(token);

    // Buscar el usuario
    const user = await userRepository.findById(payload.userId);
    if (!user) {
      throw ApiError.unauthorized('Usuario no encontrado');
    }

    // Adjuntar usuario al request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    };

    next();
  } catch (error) {
    if (error.message === 'ACCESS_TOKEN_EXPIRED') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      });
    }
    if (error.message === 'INVALID_ACCESS_TOKEN') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido',
        code: 'INVALID_TOKEN'
      });
    }
    next(error);
  }
};

/**
 * Middleware para verificar que el usuario es administrador
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'No autenticado'
    });
  }

  if (req.user.role !== 'administrador') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Solo administradores pueden acceder a este recurso.'
    });
  }

  next();
};

/**
 * Middleware para verificar que el usuario es emprendedor
 */
const requireEmprendedor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'No autenticado'
    });
  }

  if (req.user.role !== 'emprendedor') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Solo emprendedores pueden acceder a este recurso.'
    });
  }

  next();
};

/**
 * Middleware para verificar roles específicos
 */
const requireRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. No tienes los permisos necesarios.'
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  requireAdmin,
  requireEmprendedor,
  requireRoles
};
