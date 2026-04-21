const { body } = require('express-validator');
const validate = require('../middleware/validate');
const Appointment = require('../models/Appointment');

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const STATUSES = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'];
// Pulled from the model so the validator stays in sync with the schema enum.
const APPOINTMENT_TYPES = Appointment.schema.path('appointmentType').enumValues;

exports.createRules = validate([
  // patientId optional — derived server-side for patient role.
  body('patientId').optional({ checkFalsy: true }).isMongoId().withMessage('Valid patientId required'),
  body('optometristId').isMongoId().withMessage('Valid optometristId required'),
  body('date').isISO8601().withMessage('Valid ISO date required'),
  body('startTime').matches(HHMM).withMessage('startTime must be HH:mm'),
  body('appointmentType')
    .trim()
    .notEmpty().withMessage('appointmentType required')
    .isIn(APPOINTMENT_TYPES).withMessage('Invalid appointmentType'),
  body('notes').optional().isString(),
  body('specialRequirements').optional().isString(),
  // duration is computed server-side; ignore if sent.
  body('duration').optional().isInt({ min: 1 }),
  body('roomNumber').optional().isString(),
]);

exports.updateRules = validate([
  body('status').optional().isIn(STATUSES).withMessage('Invalid status'),
  body('date').optional().isISO8601().withMessage('Valid ISO date required'),
  body('startTime').optional().matches(HHMM).withMessage('startTime must be HH:mm'),
]);

exports.rescheduleRules = validate([
  body('date').isISO8601().withMessage('Valid ISO date required'),
  body('startTime').matches(HHMM).withMessage('startTime must be HH:mm'),
]);
