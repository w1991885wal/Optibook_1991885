const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getReminderTemplates,
  updateReminderTemplates,
} = require('../controllers/settingsController');

// Admin-only. Read-or-update for the reminder-templates settings group.
router.use(protect);
router.use(authorize('admin'));

router
  .route('/reminder-templates')
  .get(getReminderTemplates)
  .put(updateReminderTemplates);

module.exports = router;
