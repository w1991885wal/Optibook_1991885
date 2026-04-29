const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const {
  getByAppointment,
  getByPatient,
  upsertForAppointment,
  completeAppointment,
} = require('../controllers/visitRecordController');

// All visit-record endpoints are optometrist/admin only.
router.use(protect);
router.use(authorize('optometrist', 'admin'));

const appointmentIdRule = validate([
  param('appointmentId').isMongoId().withMessage('Valid appointmentId required'),
]);

const patientIdRule = validate([
  param('patientId').isMongoId().withMessage('Valid patientId required'),
]);

const bodyTextRules = validate([
  body('diagnosis').optional().isString(),
  body('notes').optional().isString(),
  body('prescription').optional().isString(),
]);

// Phase R1: dual-shape validator. Legacy `recallMonths` and the two new typed
// fields are all optional individually, but at least one must be present so an
// optom cannot complete an appointment without setting a recall.
const completeRules = validate([
  body('diagnosis').optional().isString(),
  body('notes').optional().isString(),
  body('prescription').optional().isString(),
  body('recallMonths')
    .optional()
    .isIn([3, 6, 12, 24])
    .withMessage('recallMonths must be one of 3, 6, 12 or 24'),
  body('eyeTestRecallMonths')
    .optional()
    .isIn([3, 6, 12, 24])
    .withMessage('eyeTestRecallMonths must be one of 3, 6, 12 or 24'),
  body('contactLensRecallMonths')
    .optional()
    .isIn([3, 6, 12, 24])
    .withMessage('contactLensRecallMonths must be one of 3, 6, 12 or 24'),
  body().custom((value) => {
    const provided =
      value &&
      (value.recallMonths !== undefined ||
        value.eyeTestRecallMonths !== undefined ||
        value.contactLensRecallMonths !== undefined);
    if (!provided) {
      throw new Error(
        'At least one of recallMonths, eyeTestRecallMonths or contactLensRecallMonths is required',
      );
    }
    return true;
  }),
]);

router.get('/patient/:patientId', patientIdRule, getByPatient);

router
  .route('/appointment/:appointmentId')
  .get(appointmentIdRule, getByAppointment)
  .put(appointmentIdRule, bodyTextRules, upsertForAppointment);

router.post(
  '/appointment/:appointmentId/complete',
  appointmentIdRule,
  completeRules,
  completeAppointment,
);

module.exports = router;
