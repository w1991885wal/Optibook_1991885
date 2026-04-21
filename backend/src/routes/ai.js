const express = require('express');
const router = express.Router();
const {
  recommendOptometrist,
  recommendSlots,
  noShowPrediction,
  compatibility,
} = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/recommend-optometrist', recommendOptometrist);
router.post('/recommend-slots', recommendSlots);
router.post('/no-show-prediction', noShowPrediction);
router.get('/compatibility/:patientId/:optometristId', compatibility);

module.exports = router;
