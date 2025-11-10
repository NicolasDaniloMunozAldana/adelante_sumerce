const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');
const { 
  loginValidation, 
  registerValidation, 
  refreshTokenValidation 
} = require('../middlewares/validation');

/**
 * @route POST /api/auth/login
 * @desc Login de usuario
 * @access Public
 */
router.post('/login', loginValidation, authController.login);

/**
 * @route POST /api/auth/register
 * @desc Registro de nuevo usuario
 * @access Public
 */
router.post('/register', registerValidation, authController.register);

/**
 * @route POST /api/auth/refresh
 * @desc Refrescar access token usando refresh token
 * @access Public
 */
router.post('/refresh', refreshTokenValidation, authController.refreshToken);

/**
 * @route POST /api/auth/logout
 * @desc Cerrar sesión (revocar refresh token)
 * @access Public
 */
router.post('/logout', authController.logout);

/**
 * @route POST /api/auth/logout-all
 * @desc Cerrar todas las sesiones del usuario
 * @access Private
 */
router.post('/logout-all', authenticate, authController.logoutAll);

/**
 * @route GET /api/auth/verify
 * @desc Verificar access token
 * @access Public
 */
router.get('/verify', authController.verifyToken);

/**
 * @route GET /api/auth/me
 * @desc Obtener información del usuario autenticado
 * @access Private
 */
router.get('/me', authenticate, authController.me);

module.exports = router;
