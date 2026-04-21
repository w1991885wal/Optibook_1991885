const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  logout,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { registerRules, loginRules } = require('../validators/authValidator');
const { authLimiter } = require('../middleware/rateLimit');

router.post('/register', authLimiter, registerRules, register);
router.post('/login', authLimiter, loginRules, login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

module.exports = router;
