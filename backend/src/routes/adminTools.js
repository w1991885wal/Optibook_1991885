const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  exportAllJson,
  backupJson,
  reportAppointmentsCsv,
  reportCancellationsCsv,
  reportWorkloadCsv,
  reportPatientsCsv,
} = require('../controllers/adminToolsController');

// Admin-only: every route here is read-only (GET) and behind both
// `protect` and `authorize('admin')`. No destructive endpoints.
router.use(protect);
router.use(authorize('admin'));

router.get('/export', exportAllJson);
router.get('/backup', backupJson);
router.get('/report/appointments', reportAppointmentsCsv);
router.get('/report/cancellations', reportCancellationsCsv);
router.get('/report/workload', reportWorkloadCsv);
router.get('/report/patients', reportPatientsCsv);

module.exports = router;
