// src/controllers/homeController.js

class HomeController {
  showHome(req, res) {
    try {
      const user = req.session.user || null;
      // 🔧 antes decía "home/index", ahora apunta al archivo real "home/home"
      res.render("home/home", {
        title: "Inicio - Adelante Sumercé",
        user,
      });
    } catch (error) {
      console.error("Error en showHome:", error);
      res.status(500).send("Error interno del servidor");
    }
  }

  showCaracterizacion(req, res) {
    try {
      res.render("home/caracterizacion", {
        title: "Caracterización - Adelante Sumercé",
        user: req.session.user,
      });
    } catch (error) {
      console.error("Error en showCaracterizacion:", error);
      res.status(500).send("Error interno del servidor");
    }
  }

  showDashboard(req, res) {
    try {
      res.render("home/dashboard", {
        title: "Dashboard - Adelante Sumercé",
        user: req.session.user,
      });
    } catch (error) {
      console.error("Error en showDashboard:", error);
      res.status(500).send("Error interno del servidor");
    }
  }

  showSoporte(req, res) {
    try {
      res.render("home/soporte", {
        title: "Soporte - Adelante Sumercé",
        user: req.session.user,
      });
    } catch (error) {
      console.error("Error en showSoporte:", error);
      res.status(500).send("Error interno del servidor");
    }
  }

  showContacto(req, res) {
    try {
      res.render("home/contacto", {
        title: "Contacto - Adelante Sumercé",
        user: req.session.user,
      });
    } catch (error) {
      console.error("Error en showContacto:", error);
      res.status(500).send("Error interno del servidor");
    }
  }
}

module.exports = new HomeController();
