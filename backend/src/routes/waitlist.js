const express = require('express');
const router = express.Router();
const {
  addToWaitlist,
  getWaitlist,
  removeFromWaitlist,
  bookFromWaitlist,
} = require('../controllers/waitlistController');
const { protect, authorize } = require('../middleware/auth');
const { addRules, bookRules } = require('../validators/waitlistValidator');
const { idParam } = require('../validators/idParamValidator');

router.use(protect);
router.get('/', authorize('admin', 'optometrist'), getWaitlist);
router.post('/', addRules, addToWaitlist);
router.delete('/:id', idParam, authorize('admin', 'optometrist'), removeFromWaitlist);

// Phase D4 — confirm booking: converts an active waitlist entry into a real
// appointment using the canonical booking rules.
router.post(
  '/:id/book',
  idParam,
  authorize('admin', 'optometrist'),
  bookRules,
  bookFromWaitlist,
);

module.exports = router;
