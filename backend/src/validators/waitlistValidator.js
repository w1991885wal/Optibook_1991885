const { body } = require('express-validator');
const validate = require('../middleware/validate');

exports.addRules = validate([
  body('patientId').isMongoId().withMessage('Valid patientId required'),
  body('optometristId').optional().isMongoId().withMessage('Valid optometristId required'),
  body('appointmentType').trim().notEmpty().withMessage('appointmentType required'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
]);
