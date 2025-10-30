const authService = require('../services/authServices');

class AuthController {
  /**
   * Show login form
   */
  showLoginForm(req, res) {
    try {
      // If already logged in, redirect directly
      if (req.session.user) {
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
   * Process login form
   */
  async processLogin(req, res) {
    try {
      const { email, password } = req.body;

      // DEMO login (sin BD): acepta credenciales quemadas cuando DEMO_MODE está activo
      if (process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true') {
        const ok = (email === 'user' || email === 'user@demo.com') && password === '123';
        if (ok) {
          req.session.user = {
            id: 1,
            email: 'user@demo.com',
            firstName: 'Usuario',
            lastName: 'Demo',
            isAuthenticated: true
          };
          return res.redirect('/home');
        }
        // En modo demo permitimos cualquier correo con pass 123 para facilitar pruebas
        if (password === '123') {
          req.session.user = {
            id: 1,
            email: email,
            firstName: 'Usuario',
            lastName: 'Demo',
            isAuthenticated: true
          };
          return res.redirect('/home');
        }
        return res.render('auth/login', {
          title: 'Iniciar Sesión - Adelante Sumercé',
          error: 'Use user@demo.com o user con contraseña 123 (DEMO)'
        });
      }

      // Basic validation
      if (!email || !password) {
        return res.render('auth/login', {
          title: 'Iniciar Sesión - Adelante Sumercé',
          error: 'Por favor ingrese su correo electrónico y contraseña'
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.render('auth/login', {
          title: 'Iniciar Sesión - Adelante Sumercé',
          error: 'Por favor ingrese un correo electrónico válido'
        });
      }

      // Authenticate user
      const user = await authService.authenticate(email, password);

      if (user) {
        // Create session
        req.session.user = {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isAuthenticated: true
        };

        return res.redirect('/home');
      }

      // If authentication fails
      return res.render('auth/login', {
        title: 'Iniciar Sesión - Adelante Sumercé',
        error: 'Correo electrónico o contraseña incorrectos'
      });

    } catch (error) {
      console.error('Error processing login:', error);
      res.render('auth/login', {
        title: 'Iniciar Sesión - Adelante Sumercé',
        error: 'Error processing request'
      });
    }
  }

  /**
   * Cierra la sesión y redirige al login
   */
  logout(req, res) {
    req.session.destroy(err => {
      if (err) {
        console.error('Error al cerrar sesión:', err);
        return res.status(500).send('Error al cerrar sesión');
      }
      res.redirect('/login');
    });
  }

   /**
   * Show registration form
   */
  showRegisterForm(req, res) {
    try {
      res.render('auth/register', {
        title: 'Registro - Adelante Sumercé',
        error: null,
        formData: {} // For repopulating form on error
      });
    } catch (error) {
      console.error('Error showing registration form:', error);
      res.status(500).send('Error interno del servidor');
    }
  }

  /**
   * Process registration form
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

      // Basic validation
      if (!email || !password || !confirmPassword || !celular || !nombres || !apellidos) {
        return res.render('auth/register', {
          title: 'Registro - Adelante Sumercé',
          error: 'Por favor complete todos los campos requeridos',
          formData: req.body
        });
      }

      // Register user
      const user = await authService.register({
        email,
        password,
        confirmPassword,
        celular,
        nombres,
        apellidos
      });

      // Create session
      req.session.user = {
        id: user.id,
        email: user.email,
        isAuthenticated: true
      };

      return res.redirect('/login');

    } catch (error) {
      console.error('Error in registration:', error);
      res.render('auth/register', {
        title: 'Registro - Adelante Sumercé',
        error: error.message || 'Error al procesar el registro',
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
