const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { STRONG_PASSWORD } = require('./authValidator');

const SPECIALTIES = ['General', 'Contact Lens', 'Pediatric', 'Senior'];

exports.createOptometristRules = validate([
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password')
    .matches(STRONG_PASSWORD)
    .withMessage(
      'Password must be at least 8 characters and contain a letter and a number',
    ),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('specialty')
    .isIn(SPECIALTIES)
    .withMessage(`Specialty must be one of: ${SPECIALTIES.join(', ')}`),
  body('languages')
    .isArray({ min: 1 })
    .withMessage('languages must be a non-empty array')
    .bail()
    .custom((arr) => arr.every((s) => typeof s === 'string' && s.trim().length))
    .withMessage('languages must contain non-empty strings'),
  body('roomNumber').trim().notEmpty().withMessage('Room number is required'),
  body('yearsExperience')
    .optional()
    .isInt({ min: 0, max: 60 })
    .withMessage('yearsExperience must be an integer 0..60')
    .toInt(),
]);
