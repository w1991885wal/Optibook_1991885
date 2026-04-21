const express = require('express');
const router = express.Router();
const {
  getOptometrists,
  getOptometrist,
} = require('../controllers/optometristController');
const { protect } = require('../middleware/auth');
const { idParam } = require('../validators/idParamValidator');

router.use(protect);
router.get('/', getOptometrists);
router.get('/:id', idParam, getOptometrist);

module.exports = router;
