const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getOptometristStats,
  getNoShowTrends,
  getBusyHours,
  getClinicianWorkload,
  getAiInsights,
} = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/dashboard', authorize('admin', 'optometrist'), getDashboardStats);
router.get('/optometrists', authorize('admin'), getOptometristStats);

// Phase 7 — additive analytics endpoints
router.get('/no-show-trends', authorize('admin'), getNoShowTrends);
router.get('/busy-hours', authorize('admin', 'optometrist'), getBusyHours);
router.get('/clinician-workload', authorize('admin'), getClinicianWorkload);
router.get('/ai-insights', authorize('admin'), getAiInsights);

module.exports = router;
