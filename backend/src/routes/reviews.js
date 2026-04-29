const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createRules,
  appointmentIdParam,
  optometristIdParam,
} = require('../validators/reviewValidator');
const {
  createReview,
  getMyReviewForAppointment,
  getOptometristSummary,
  getMyOptometristSummary,
} = require('../controllers/reviewController');

router.use(protect);

// Patient creates a review for their own completed appointment.
router.post('/', authorize('patient'), createRules, createReview);

// Patient reads their own review for an appointment (or null).
router.get(
  '/appointment/:appointmentId',
  authorize('patient'),
  appointmentIdParam,
  getMyReviewForAppointment,
);

// Optometrist self-view satisfaction summary.
router.get(
  '/optometrist/me/summary',
  authorize('optometrist'),
  getMyOptometristSummary,
);

// Optometrist + admin can view any optometrist's summary by id.
router.get(
  '/optometrist/:optometristId/summary',
  authorize('optometrist', 'admin'),
  optometristIdParam,
  getOptometristSummary,
);

module.exports = router;
