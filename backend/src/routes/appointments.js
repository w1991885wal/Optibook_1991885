const express = require('express');
const router = express.Router();
const {
  createAppointment,
  getAppointments,
  getAvailableSlots,
  updateAppointment,
  rescheduleAppointment,
  cancelAppointment,
} = require('../controllers/appointmentController');
const { protect } = require('../middleware/auth');
const {
  createRules,
  updateRules,
  rescheduleRules,
} = require('../validators/appointmentValidator');
const { idParam } = require('../validators/idParamValidator');

router.use(protect);
router.route('/').get(getAppointments).post(createRules, createAppointment);
router.get('/available', getAvailableSlots);

// Readme-spec routes — explicit reschedule/cancel.
router.put('/:id/reschedule', idParam, rescheduleRules, rescheduleAppointment);
router.put('/:id/cancel', idParam, cancelAppointment);

// General update + legacy DELETE cancel kept for back-compat.
router
  .route('/:id')
  .put(idParam, updateRules, updateAppointment)
  .delete(idParam, cancelAppointment);

module.exports = router;
