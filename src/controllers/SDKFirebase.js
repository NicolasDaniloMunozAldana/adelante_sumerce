const admin = require("firebase-admin");
const path = require("path");

// Ruta absoluta hacia tu archivo de credenciales
const serviceAccountPath = path.join(__dirname, "../../config/firebase-service-account.json");

try {
  // Inicializa Firebase solo una vez
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(require(serviceAccountPath)),
    });
    console.log("✅ Firebase Admin inicializado correctamente");
  }
} catch (error) {
  console.error("❌ Error al inicializar Firebase Admin:", error);
}

module.exports = admin;
