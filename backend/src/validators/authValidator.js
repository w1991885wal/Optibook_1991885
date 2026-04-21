const { body } = require('express-validator');
const validate = require('../middleware/validate');

const STRONG_PASSWORD = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

exports.registerRules = validate([
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password')
    .matches(STRONG_PASSWORD)
    .withMessage(
      'Password must be at least 8 characters and contain a letter and a number',
    ),
  body('role')
    .isIn(['patient', 'optometrist'])
    .withMessage('Role must be patient or optometrist'),
]);

exports.loginRules = validate([
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password required'),
]);
