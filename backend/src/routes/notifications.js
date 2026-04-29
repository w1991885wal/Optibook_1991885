const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { idParam } = require('../validators/idParamValidator');
const {
  listMine,
  markRead,
  markAllRead,
} = require('../controllers/notificationController');

router.use(protect);
router.use(authorize('optometrist', 'admin'));

router.get('/', listMine);
router.post('/mark-all-read', markAllRead);
router.patch('/:id/read', idParam, markRead);

module.exports = router;
