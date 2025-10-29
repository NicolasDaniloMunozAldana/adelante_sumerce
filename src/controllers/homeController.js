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
      const caracterizacion = req.session.caracterizacion || null;
      res.render("home/dashboard", {
        title: "Dashboard - Adelante Sumercé",
        user: req.session.user,
        caracterizacion,
      });
    } catch (error) {
      console.error("Error en showDashboard:", error);
      res.status(500).send("Error interno del servidor");
    }
  }

  saveCaracterizacion(req, res) {
    try {
      const data = req.body || {};

      const mapOrdinal = (val, map) => map[val] ?? 0;

      // A) Datos Generales (0-3)
      const datosOk = [
        data.nombreEmprendimiento,
        data.anioCreacion,
        data.sectorEconomico,
        data.nombreEncargado,
        data.celularEncargado,
        data.correoEncargado,
        data.tiempoOperacion,
      ].every(v => typeof v === 'string' && v.trim().length > 0);
      const scoreA = datosOk ? 3 : 1;

      // B) Modelo de Negocio (0-3)
      const len = s => (s ? String(s).trim().length : 0);
      const totalLen = len(data.propuestaValor) + len(data.segmentoClientes) + len(data.canalesVenta) + len(data.fuentesIngreso);
      let scoreB = 1;
      if (totalLen > 600) scoreB = 3; else if (totalLen > 200) scoreB = 2; else if (totalLen === 0) scoreB = 0;

      // C) Finanzas (1..3)
      const ventasScore = mapOrdinal(data.ventasNetas, {
        menos_1_smmlv: 1,
        '1_3_smmlv': 2,
        '3_mas_smmlv': 3,
      });
      const rentaScore = mapOrdinal(data.rentabilidad, {
        menos_medio_smmlv: 1,
        medio_1_smmlv: 2,
        '2_mas_smmlv': 3,
      });
      const costosScore = mapOrdinal(data.costosFijos, {
        menos_medio_smmlv: 3,
        medio_1_smmlv: 2,
        '2_mas_smmlv': 1,
      });
      let scoreC = Math.round(((ventasScore + rentaScore + costosScore) / 3) * 10) / 10;
      if (!isFinite(scoreC)) scoreC = 0;

      // D) Equipo (cap 3)
      const formacionScore = mapOrdinal(data.formacionEmpresarial, {
        sin_formacion: 1,
        tecnica_profesional: 2,
        administracion_emprendimiento: 3,
      });
      const personalScore = data.personalCapacitado === 'si' ? 1 : 0;
      const rolesScore = data.rolesDefinidos === 'si' ? 1 : 0;
      let scoreD = formacionScore + personalScore + rolesScore;
      if (scoreD > 3) scoreD = 3;

      const secciones = [
        { nombre: 'Datos Generales', puntaje: Number(scoreA), porcentaje: Math.round((scoreA / 3) * 100) },
        { nombre: 'Modelo de Negocio', puntaje: Number(scoreB), porcentaje: Math.round((scoreB / 3) * 100) },
        { nombre: 'Finanzas', puntaje: Number(scoreC), porcentaje: Math.round((scoreC / 3) * 100) },
        { nombre: 'Equipo de Trabajo', puntaje: Number(scoreD), porcentaje: Math.round((scoreD / 3) * 100) },
      ];

      const puntajeTotal = Number(secciones.reduce((acc, s) => acc + Number(s.puntaje || 0), 0).toFixed(1));
      const maxTotal = secciones.length * 3; // 12
      const porcentaje = Math.round((puntajeTotal / maxTotal) * 100);

      let estado = 'Idea inicial';
      if (porcentaje >= 67) estado = 'Consolidado';
      else if (porcentaje >= 34) estado = 'En desarrollo';

      const caracterizacion = {
        nombre: data.nombreEmprendimiento || 'Emprendimiento',
        puntajeTotal,
        porcentaje,
        estado,
        secciones,
        maxTotal,
      };

      req.session.caracterizacion = caracterizacion;
      return res.redirect('/dashboard');
    } catch (error) {
      console.error('Error en saveCaracterizacion:', error);
      res.status(500).send('Error al procesar la caracterización');
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
