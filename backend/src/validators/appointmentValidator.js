const { body } = require('express-validator');
const validate = require('../middleware/validate');
const Appointment = require('../models/Appointment');

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const STATUSES = [
  'scheduled',
  'confirmed',
  'in-progress',
  'completed',
  'cancelled',
  'no-show',
];

// Full enum (pulled from schema) — used by updateRules so historical records
// with legacy types can still be edited without triggering validation errors.
const APPOINTMENT_TYPES_ALL = Appointment.schema.path('appointmentType').enumValues;

// Tightened whitelist for NEW bookings. Patients and admins alike are limited
// to this 5-entry list going forward. Old appointments are untouched.
exports.ALLOWED_NEW_TYPES = [
  'Eye Test',
  'Contact Lens Fitting',
  'Contact Lens Follow-up',
  'PCO Test',
  'PCO Test + Eye Test',
];

exports.createRules = validate([
  // patientId optional — derived server-side for patient role.
  body('patientId').optional({ checkFalsy: true }).isMongoId().withMessage('Valid patientId required'),
  body('optometristId').isMongoId().withMessage('Valid optometristId required'),
  body('date').isISO8601().withMessage('Valid ISO date required'),
  body('startTime').matches(HHMM).withMessage('startTime must be HH:mm'),
  body('appointmentType')
    .trim()
    .notEmpty().withMessage('appointmentType required')
    .isIn(exports.ALLOWED_NEW_TYPES)
    .withMessage('Appointment type is no longer offered for new bookings'),
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
  // Edits may still reference the full historical list.
  body('appointmentType').optional().isIn(APPOINTMENT_TYPES_ALL).withMessage('Invalid appointmentType'),
]);

exports.rescheduleRules = validate([
  body('date').isISO8601().withMessage('Valid ISO date required'),
  body('startTime').matches(HHMM).withMessage('startTime must be HH:mm'),
]);
