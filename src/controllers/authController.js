// src/controllers/authController.js
const bcrypt = require("bcryptjs"); // si no usas bcrypt, no importa

class AuthController {
  showLoginForm(req, res) {
    try {
      if (req.session && req.session.user && req.session.user.isAuthenticated) {
        return res.redirect("/home");
      }
      res.render("auth/login", {
        title: "Iniciar Sesión - Adelante Sumercé",
        error: null,
      });
    } catch (error) {
      console.error("Error al mostrar el formulario de login:", error);
      res.status(500).send("Error interno del servidor");
    }
  }

  async processLogin(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.render("auth/login", {
          title: "Iniciar Sesión - Adelante Sumercé",
          error: "Por favor, ingrese usuario y contraseña",
        });
      }

      // Simulación temporal
      const fakeUser = { username: "user", password: "123", displayName: "Usuario Demo" };

      if (username === fakeUser.username && password === fakeUser.password) {
        req.session.user = {
          username: fakeUser.username,
          displayName: fakeUser.displayName,
          isAuthenticated: true,
        };
        // redirigir a /home
        return res.redirect("/home");
      }

      return res.render("auth/login", {
        title: "Iniciar Sesión - Adelante Sumercé",
        error: "Usuario o contraseña incorrectos",
      });
    } catch (error) {
      console.error("Error al procesar login:", error);
      res.render("auth/login", {
        title: "Iniciar Sesión - Adelante Sumercé",
        error: "Error al procesar la solicitud",
      });
    }
  }

  logout(req, res) {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error al cerrar sesión:", err);
        return res.status(500).send("Error al cerrar sesión");
      }
      res.redirect("/login");
    });
  }

  showRegisterForm(req, res) {
    try {
      res.render("auth/register", {
        title: "Registro - Adelante Sumercé",
        error: null,
      });
    } catch (error) {
      console.error("Error al mostrar formulario de registro:", error);
      res.status(500).send("Error interno del servidor");
    }
  }

  showForgotPassword(req, res) {
    try {
      res.render("auth/forgot-password", {
        title: "Recuperar Contraseña - Adelante Sumercé",
        error: null,
      });
    } catch (error) {
      console.error("Error al mostrar formulario de recuperación:", error);
      res.status(500).send("Error interno del servidor");
    }
  }
}

module.exports = new AuthController();
