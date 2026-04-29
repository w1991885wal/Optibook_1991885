const { body, param } = require('express-validator');
const validate = require('../middleware/validate');

// Phase Reviews-Backend — Layer 1 validation (route level).
// Layer 2 (controller business rules) and Layer 3 (schema validators) are
// applied after this. Each layer rejects malformed input independently.

const ALLOWED_RATINGS = new Set([1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]);

exports.ALLOWED_RATINGS = ALLOWED_RATINGS;

exports.createRules = validate([
  body('appointmentId')
    .isMongoId()
    .withMessage('Valid appointmentId required'),
  body('ratings')
    .isArray({ min: 5, max: 5 })
    .withMessage('ratings must contain exactly 5 values'),
  body('ratings.*').custom((v) => {
    const num = Number(v);
    if (!Number.isFinite(num) || !ALLOWED_RATINGS.has(num)) {
      throw new Error(
        'each rating must be one of 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5',
      );
    }
    return true;
  }),
  body('comment')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Comment must be 500 characters or fewer'),
]);

exports.appointmentIdParam = validate([
  param('appointmentId')
    .isMongoId()
    .withMessage('Valid appointmentId required'),
]);

exports.optometristIdParam = validate([
  param('optometristId')
    .isMongoId()
    .withMessage('Valid optometristId required'),
]);
