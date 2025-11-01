exports.showDashboard = async (req, res) => {
  try {
    // Ejemplo de datos que podrías traer desde BD
    const caracterizacion = {
      nombre: "Café Tunja",
      puntajeTotal: 12,
      porcentaje: Math.round((12 / 17) * 100),
      estado: "En desarrollo",
      secciones: [
        { nombre: "Datos Generales", puntaje: 3, porcentaje: 100 },
        { nombre: "Modelo de Negocio", puntaje: 2, porcentaje: 67 },
        { nombre: "Finanzas", puntaje: 3, porcentaje: 100 },
        { nombre: "Equipo de Trabajo", puntaje: 2, porcentaje: 67 },
        { nombre: "Impacto Social y Ambiental", puntaje: 2, porcentaje: 67 }
      ]
    };
    res.render('dashboard/dashboard', { caracterizacion });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error al cargar el dashboard");
  }
};
