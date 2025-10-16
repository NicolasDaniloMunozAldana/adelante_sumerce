/**
 * Controlador de Autenticación
 * Maneja las operaciones relacionadas con login, registro y recuperación de contraseña
 */

class AuthController {
  /**
   * Muestra el formulario de inicio de sesión
   */
  showLoginForm(req, res) {
    try {
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

      // TODO: Aquí irá la lógica de autenticación con la base de datos
      // Por ahora, solo como ejemplo:
      console.log('Intento de login:', { username });

      // Redirigir al dashboard (cuando esté implementado)
      res.redirect('/dashboard');
    } catch (error) {
      console.error('Error al procesar login:', error);
      res.render('auth/login', {
        title: 'Iniciar Sesión - Adelante Sumercé',
        error: 'Error al procesar la solicitud'
      });
    }
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
