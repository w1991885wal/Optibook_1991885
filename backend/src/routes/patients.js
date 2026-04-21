const express = require('express');
const router = express.Router();
const {
  getPatients,
  getPatient,
  updatePatient,
} = require('../controllers/patientController');
const { protect, authorize } = require('../middleware/auth');
const { idParam } = require('../validators/idParamValidator');

router.use(protect);
router.get('/', authorize('admin', 'optometrist'), getPatients);
router.get('/:id', idParam, getPatient);
router.put('/:id', idParam, updatePatient);

module.exports = router;
