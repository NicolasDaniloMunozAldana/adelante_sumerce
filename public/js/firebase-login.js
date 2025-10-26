// Importa Firebase (ESM)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDUmLb42mxZq82Tlp2j5NvUkU92x3Qi4SU",
  authDomain: "salga-adelante-sumerce.firebaseapp.com",
  projectId: "salga-adelante-sumerce",
  storageBucket: "salga-adelante-sumerce.firebasestorage.app",
  messagingSenderId: "356110885523",
  appId: "1:356110885523:web:f40f9e21bdc3a62d112366",
  measurementId: "G-ZP9WL3HCGM"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Botón de login con Google
const googleLoginBtn = document.getElementById("googleLoginBtn");

googleLoginBtn.addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    alert(`Bienvenido, ${user.displayName}`);
    window.location.href = "/home";
  } catch (error) {
    console.error("Error en Google Login:", error);
    alert("Error al iniciar sesión con Google.");
  }
});
