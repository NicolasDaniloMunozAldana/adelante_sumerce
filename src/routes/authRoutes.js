// src/routes/authRoutes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Mostrar formularios
router.get("/login", (req, res) => authController.showLoginForm(req, res));
router.get("/register", (req, res) => authController.showRegisterForm(req, res));
router.get("/forgot-password", (req, res) => authController.showForgotPassword(req, res));

// Acciones
router.post("/login", (req, res) => authController.processLogin(req, res));
router.post("/register", (req, res) => {
  // si no tienes processRegister en controlador, redirige a login (temporal)
  if (typeof authController.processRegister === "function") {
    return authController.processRegister(req, res);
  }
  return res.redirect("/login");
});
router.post("/forgot-password", (req, res) => {
  if (typeof authController.processForgotPassword === "function") {
    return authController.processForgotPassword(req, res);
  }
  return res.redirect("/login");
});

router.get("/logout", (req, res) => authController.logout(req, res));

module.exports = router;
