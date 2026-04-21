const express = require('express');
const router = express.Router();
const {
  addToWaitlist,
  getWaitlist,
  removeFromWaitlist,
} = require('../controllers/waitlistController');
const { protect, authorize } = require('../middleware/auth');
const { addRules } = require('../validators/waitlistValidator');
const { idParam } = require('../validators/idParamValidator');

router.use(protect);
router.get('/', authorize('admin', 'optometrist'), getWaitlist);
router.post('/', addRules, addToWaitlist);
router.delete('/:id', idParam, authorize('admin', 'optometrist'), removeFromWaitlist);

module.exports = router;
