const express = require('express');
const router = express.Router();
const {
  getOptometrists,
  getOptometrist,
  getMe,
  updateMe,
} = require('../controllers/optometristController');
const { protect, authorize } = require('../middleware/auth');
const { idParam } = require('../validators/idParamValidator');

router.use(protect);

// Phase E — the caller's own record, for the schedule settings page.
router.get('/me', authorize('optometrist'), getMe);
router.put('/me', authorize('optometrist'), updateMe);

router.get('/', getOptometrists);
router.get('/:id', idParam, getOptometrist);

module.exports = router;
