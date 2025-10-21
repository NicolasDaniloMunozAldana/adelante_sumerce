const bcrypt = require('bcryptjs'); // Si usas contraseñas encriptadas

class AuthController {
  /**
   * Muestra el formulario de inicio de sesión
   */
  showLoginForm(req, res) {
    try {
      // Si ya está logueado, redirigir directamente
      if (req.session.user) {
        return res.redirect('/home');
      }

      res.render('auth/login', {
        title: 'Iniciar Sesión - Adelante Sumercé',
        error: null
      });
    } catch (error) {
      console.error('Error al mostrar formulario de login:', error);
      res.status(500).send('Error interno del servidor');
    }
  }

  /**
   * Procesa el formulario de inicio de sesión
   */
  async processLogin(req, res) {
    try {
      const { username, password } = req.body;

      // Validación básica
      if (!username || !password) {
        return res.render('auth/login', {
          title: 'Iniciar Sesión - Adelante Sumercé',
          error: 'Por favor, ingrese usuario y contraseña'
        });
      }

      // TODO: Aquí se debe consultar el usuario real en la base de datos
      // Ejemplo temporal:
      const fakeUser = { username: 'user', password: '123' };

      // Validación de credenciales
      if (username === fakeUser.username && password === fakeUser.password) {
        // Crear sesión
        req.session.user = {
          username: fakeUser.username,
          isAuthenticated: true
        };

        return res.redirect('/home');
      }

      // Si no coincide
      return res.render('auth/login', {
        title: 'Iniciar Sesión - Adelante Sumercé',
        error: 'Usuario o contraseña incorrectos'
      });

    } catch (error) {
      console.error('Error al procesar login:', error);
      res.render('auth/login', {
        title: 'Iniciar Sesión - Adelante Sumercé',
        error: 'Error al procesar la solicitud'
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
   * Muestra el formulario de registro
   */
  showRegisterForm(req, res) {
    try {
      res.render('auth/register', {
        title: 'Registro - Adelante Sumercé',
        error: null
      });
    } catch (error) {
      console.error('Error al mostrar formulario de registro:', error);
      res.status(500).send('Error interno del servidor');
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
