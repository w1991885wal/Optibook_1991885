const express = require('express');
const router = express.Router();
const {
  getOptometrists,
  getOptometrist,
  getMe,
  updateMe,
  createOptometrist,
} = require('../controllers/optometristController');
const { protect, authorize } = require('../middleware/auth');
const { idParam } = require('../validators/idParamValidator');
const {
  createOptometristRules,
} = require('../validators/optometristValidator');

router.use(protect);

// Phase E — the caller's own record, for the schedule settings page.
router.get('/me', authorize('optometrist'), getMe);
router.put('/me', authorize('optometrist'), updateMe);

// Admin-only: create a new optometrist account (User + profile).
router.post(
  '/',
  authorize('admin'),
  createOptometristRules,
  createOptometrist,
);

router.get('/', getOptometrists);
router.get('/:id', idParam, getOptometrist);

module.exports = router;
