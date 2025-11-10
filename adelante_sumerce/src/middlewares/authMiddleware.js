const authServiceClient = require('../services/authServiceClient');

/**
 * Middleware para manejar la autenticación con JWT (100% stateless)
 * Verifica el access token y lo refresca automáticamente si expiró
 */
async function ensureAuthenticated(req, res, next) {
  try {
    // Obtener tokens SOLO de las cookies (stateless)
    let accessToken = req.cookies?.accessToken;
    let refreshToken = req.cookies?.refreshToken;

    if (!accessToken) {
      return res.redirect('/login');
    }

    try {
      // Verificar el access token
      const result = await authServiceClient.verifyToken(accessToken);
      
      // Adjuntar información del usuario al request (extraída del JWT)
      req.user = result.data.user;
      
      return next();
    } catch (error) {
      // Si el access token expiró, intentar refrescarlo
      if (error.statusCode === 401 && refreshToken) {
        try {
          const ipAddress = req.ip || req.connection.remoteAddress;
          const userAgent = req.get('user-agent') || 'unknown';
          
          const refreshResult = await authServiceClient.refreshToken(refreshToken, ipAddress, userAgent);
          
          // Actualizar tokens en cookies (stateless)
          const newAccessToken = refreshResult.data.accessToken;
          const newRefreshToken = refreshResult.data.refreshToken;
          
          res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 15 * 60 * 1000, // 15 minutos
            sameSite: 'strict'
          });
          res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
            sameSite: 'strict'
          });
          
          // Adjuntar información del usuario al request (desde JWT)
          req.user = refreshResult.data.user;
          
          return next();
        } catch (refreshError) {
          // Si no se pudo refrescar, limpiar cookies y redirigir al login
          res.clearCookie('accessToken');
          res.clearCookie('refreshToken');
          return res.redirect('/login');
        }
      }
      
      // Si hay cualquier otro error, redirigir al login
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      return res.redirect('/login');
    }
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return res.redirect('/login');
  }
}

/**
 * Middleware para verificar que el usuario es administrador (stateless)
 */
function ensureAdmin(req, res, next) {
  // El usuario debe estar disponible desde req.user (no desde sesión)
  if (!req.user) {
    return res.redirect('/login');
  }

  if (req.user.role !== 'administrador') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Solo administradores pueden acceder a este recurso.'
    });
  }

  next();
}

/**
 * Middleware para verificar que el usuario es emprendedor (stateless)
 */
function ensureEmprendedor(req, res, next) {
  // El usuario debe estar disponible desde req.user (no desde sesión)
  if (!req.user) {
    return res.redirect('/login');
  }

  if (req.user.role !== 'emprendedor') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Solo emprendedores pueden acceder a este recurso.'
    });
  }

  next();
}

module.exports = {
  ensureAuthenticated,
  ensureAdmin,
  ensureEmprendedor
};
