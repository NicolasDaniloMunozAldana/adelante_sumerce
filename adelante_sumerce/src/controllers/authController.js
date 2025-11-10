const authServiceClient = require('../services/authServiceClient');

class AuthController {
  /**
   * Muestra el formulario de login
   */
  showLoginForm(req, res) {
    try {
      // Si ya tiene un accessToken válido en las cookies, redirigir
      const accessToken = req.cookies?.accessToken;
      if (accessToken) {
        // Opcionalmente verificar si es válido antes de redirigir
        return res.redirect('/');
      }

      res.render('auth/login', {
        title: 'Iniciar Sesión - Adelante Sumercé',
        error: null
      });
    } catch (error) {
      console.error('Error showing login form:', error);
      res.status(500).send('Internal Server Error');
    }
  }

  /**
   * Procesa el login del usuario
   */
  async processLogin(req, res) {
    try {
      const { email, password } = req.body;

      // Validación básica
      if (!email || !password) {
        return res.render('auth/login', {
          title: 'Iniciar Sesión - Adelante Sumercé',
          error: 'Por favor ingrese su correo electrónico y contraseña'
        });
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.render('auth/login', {
          title: 'Iniciar Sesión - Adelante Sumercé',
          error: 'Por favor ingrese un correo electrónico válido'
        });
      }

      // Obtener IP y User Agent
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent') || 'unknown';

      // Llamar al servicio de autenticación
      const result = await authServiceClient.login(email, password, ipAddress, userAgent);

      if (result.success) {
        const { user, accessToken, refreshToken } = result.data;

        // Guardar SOLO tokens en cookies httpOnly (stateless)
        res.cookie('accessToken', accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 15 * 60 * 1000, // 15 minutos
          sameSite: 'strict'
        });
        res.cookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
          sameSite: 'strict'
        });

        // Redirigir según el rol (extraído del token, no de sesión)
        if (user.role === 'administrador') {
          return res.redirect('/admin/dashboard');
        } else {
          return res.redirect('/home');
        }
      }

      // Si falla la autenticación
      return res.render('auth/login', {
        title: 'Iniciar Sesión - Adelante Sumercé',
        error: 'Correo electrónico o contraseña incorrectos'
      });

    } catch (error) {
      console.error('Error processing login:', error);
      
      let errorMessage = 'Error al procesar la solicitud';
      if (error.statusCode === 401) {
        errorMessage = 'Correo electrónico o contraseña incorrectos';
      } else if (error.statusCode === 503) {
        errorMessage = 'El servicio de autenticación no está disponible. Por favor, intente más tarde.';
      }

      res.render('auth/login', {
        title: 'Iniciar Sesión - Adelante Sumercé',
        error: errorMessage
      });
    }
  }

  /**
   * Cierra la sesión del usuario (stateless - solo revoca tokens)
   */
  async logout(req, res) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      
      if (refreshToken) {
        try {
          await authServiceClient.logout(refreshToken);
        } catch (error) {
          console.error('Error al cerrar sesión en auth service:', error);
        }
      }

      // Limpiar SOLO cookies de tokens (no hay sesión)
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');

      // Redirigir al login (completamente stateless)
      res.redirect('/login');
    } catch (error) {
      console.error('Error en logout:', error);
      res.redirect('/login');
    }
  }

  /**
   * Muestra el formulario de registro
   */
  showRegisterForm(req, res) {
    try {
      res.render('auth/register', {
        title: 'Registro - Adelante Sumercé',
        error: null,
        formData: {}
      });
    } catch (error) {
      console.error('Error showing registration form:', error);
      res.status(500).send('Error interno del servidor');
    }
  }

  /**
   * Procesa el registro de un nuevo usuario
   */
  async processRegister(req, res) {
    try {
      const { 
        email, 
        password, 
        confirmPassword, 
        celular,
        nombres,
        apellidos
      } = req.body;

      // Validación básica
      if (!email || !password || !confirmPassword || !celular || !nombres || !apellidos) {
        return res.render('auth/register', {
          title: 'Registro - Adelante Sumercé',
          error: 'Por favor complete todos los campos requeridos',
          formData: req.body
        });
      }

      // Obtener IP y User Agent
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent') || 'unknown';

      // Llamar al servicio de autenticación
      const result = await authServiceClient.register({
        email,
        password,
        confirmPassword,
        celular,
        nombres,
        apellidos
      }, ipAddress, userAgent);

      if (result.success) {
        const { user, accessToken, refreshToken } = result.data;

        // Guardar SOLO tokens en cookies (stateless)
        res.cookie('accessToken', accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 15 * 60 * 1000,
          sameSite: 'strict'
        });
        res.cookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          sameSite: 'strict'
        });

        // Redirigir al home (sin sesión, solo JWT)
        return res.redirect('/home');
      }

    } catch (error) {
      console.error('Error in registration:', error);
      
      let errorMessage = error.data?.message || error.message || 'Error al procesar el registro';
      
      res.render('auth/register', {
        title: 'Registro - Adelante Sumercé',
        error: errorMessage,
        formData: req.body
      });
    }
  }

  /**
   * Muestra el formulario de recuperación de contraseña
   */
  showForgotPassword(req, res) {
    try {
      res.render('auth/forgot-password', {
        title: 'Recuperar Contraseña - Adelante Sumercé',
        error: null
      });
    } catch (error) {
      console.error('Error al mostrar formulario de recuperación:', error);
      res.status(500).send('Error interno del servidor');
    }
  }
}

module.exports = new AuthController();
