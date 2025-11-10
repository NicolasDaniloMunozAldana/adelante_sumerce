const authServiceClient = require('../services/authServiceClient');

/**
 * Middleware para manejar la autenticación con JWT
 * Verifica el access token y lo refresca automáticamente si expiró
 */
async function ensureAuthenticated(req, res, next) {
  try {
    // Intentar obtener tokens de las cookies o del body/query
    let accessToken = req.cookies?.accessToken;
    let refreshToken = req.cookies?.refreshToken;

    // Si no están en cookies, buscar en sesión (retrocompatibilidad)
    if (!accessToken && req.session?.accessToken) {
      accessToken = req.session.accessToken;
      refreshToken = req.session.refreshToken;
    }

    if (!accessToken) {
      return res.redirect('/login');
    }

    try {
      // Verificar el access token
      const result = await authServiceClient.verifyToken(accessToken);
      
      // Adjuntar información del usuario a la sesión/request
      req.user = result.data.user;
      req.session.user = {
        id: result.data.user.id,
        email: result.data.user.email,
        firstName: result.data.user.firstName,
        lastName: result.data.user.lastName,
        rol: result.data.user.role,
        isAuthenticated: true
      };
      
      return next();
    } catch (error) {
      // Si el access token expiró, intentar refrescarlo
      if (error.statusCode === 401 && refreshToken) {
        try {
          const ipAddress = req.ip || req.connection.remoteAddress;
          const userAgent = req.get('user-agent') || 'unknown';
          
          const refreshResult = await authServiceClient.refreshToken(refreshToken, ipAddress, userAgent);
          
          // Actualizar tokens
          const newAccessToken = refreshResult.data.accessToken;
          const newRefreshToken = refreshResult.data.refreshToken;
          
          // Guardar en cookies
          res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            maxAge: 15 * 60 * 1000 // 15 minutos
          });
          res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
          });
          
          // Guardar en sesión
          req.session.accessToken = newAccessToken;
          req.session.refreshToken = newRefreshToken;
          req.session.user = {
            id: refreshResult.data.user.id,
            email: refreshResult.data.user.email,
            firstName: refreshResult.data.user.firstName,
            lastName: refreshResult.data.user.lastName,
            rol: refreshResult.data.user.role,
            isAuthenticated: true
          };
          
          req.user = refreshResult.data.user;
          return next();
        } catch (refreshError) {
          // Si no se pudo refrescar, redirigir al login
          return res.redirect('/login');
        }
      }
      
      return res.redirect('/login');
    }
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    return res.redirect('/login');
  }
}

/**
 * Middleware para verificar que el usuario es administrador
 */
function ensureAdmin(req, res, next) {
  if (!req.session?.user?.isAuthenticated) {
    return res.redirect('/login');
  }

  if (req.session.user.rol !== 'administrador') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Solo administradores pueden acceder a este recurso.'
    });
  }

  next();
}

/**
 * Middleware para verificar que el usuario es emprendedor
 */
function ensureEmprendedor(req, res, next) {
  if (!req.session?.user?.isAuthenticated) {
    return res.redirect('/login');
  }

  if (req.session.user.rol !== 'emprendedor') {
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
