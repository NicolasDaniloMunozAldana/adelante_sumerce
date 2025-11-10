const { body, validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Valida los resultados de express-validator
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg
    }));
    throw ApiError.badRequest('Error de validación', extractedErrors);
  }
  next();
};

/**
 * Reglas de validación para login
 */
const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('El email es requerido')
    .isEmail().withMessage('Debe ser un email válido'),
  body('password')
    .notEmpty().withMessage('La contraseña es requerida'),
  validate
];

/**
 * Reglas de validación para registro
 */
const registerValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('El email es requerido')
    .isEmail().withMessage('Debe ser un email válido'),
  body('password')
    .notEmpty().withMessage('La contraseña es requerida')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
  body('confirmPassword')
    .notEmpty().withMessage('La confirmación de contraseña es requerida')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Las contraseñas no coinciden'),
  body('celular')
    .trim()
    .notEmpty().withMessage('El celular es requerido')
    .isMobilePhone('es-CO').withMessage('Debe ser un número de celular válido'),
  body('nombres')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ min: 2 }).withMessage('El nombre debe tener al menos 2 caracteres'),
  body('apellidos')
    .trim()
    .notEmpty().withMessage('Los apellidos son requeridos')
    .isLength({ min: 2 }).withMessage('Los apellidos deben tener al menos 2 caracteres'),
  validate
];

/**
 * Reglas de validación para refresh token
 */
const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty().withMessage('El refresh token es requerido'),
  validate
];

module.exports = {
  loginValidation,
  registerValidation,
  refreshTokenValidation
};
