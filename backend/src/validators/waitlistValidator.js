const { body } = require('express-validator');
const validate = require('../middleware/validate');

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

exports.addRules = validate([
  body('patientId').isMongoId().withMessage('Valid patientId required'),
  body('optometristId').optional().isMongoId().withMessage('Valid optometristId required'),
  body('appointmentType').trim().notEmpty().withMessage('appointmentType required'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
]);

// Phase D4 — confirm-booking rules for POST /waitlist/:id/book.
// appointmentType is sourced from the waitlist entry server-side, so we only
// need the slot coordinates + the AI-used flag here.
exports.bookRules = validate([
  body('optometristId').optional().isMongoId().withMessage('Valid optometristId required'),
  body('date').isISO8601().withMessage('Valid ISO date required'),
  body('startTime').matches(HHMM).withMessage('startTime must be HH:mm'),
  body('usedAiRecommendation').optional().isBoolean().withMessage('usedAiRecommendation must be boolean'),
]);
