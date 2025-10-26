// ================================
// 🚀 Importaciones base
// ================================
const express = require("express");
const path = require("path");
const session = require("express-session");
require("dotenv").config();

// ================================
// 🔥 Configuración de Firebase Admin
// (para autenticar usuarios y manejar Firestore, si lo necesitas)
// ================================
const admin = require("firebase-admin");
const serviceAccount = require(path.join(__dirname, "../config/firebase-service-account.json"));

// Inicializa Firebase Admin SDK
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("✅ Firebase Admin inicializado correctamente");
} catch (error) {
  console.error("❌ Error al inicializar Firebase Admin:", error);
}

// ================================
// ⚙️ Configuración de la app Express
// ================================
const app = express();
const PORT = process.env.PORT || 3030;

// Motor de plantillas
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));

// 🧠 Configuración de sesiones
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecurepassword",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60, // 1 hora
    },
  })
);

// ================================
// 🛣️ Importar rutas
// ================================
const authRoutes = require("./routes/authRoutes");
const homeRoutes = require("./routes/homeRoutes");

// Redirigir raíz al login
app.get("/", (req, res) => res.redirect("/login"));

// Usar rutas
app.use("/", authRoutes);
app.use("/", homeRoutes);

// ================================
// 🚧 Manejo de errores 404
// ================================
app.use((req, res) => {
  res.status(404).render("partials/404", { title: "Página no encontrada" });
});

// ================================
// 🚀 Iniciar servidor
// ================================
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});

// Exportar app (útil para testing)
module.exports = app;
