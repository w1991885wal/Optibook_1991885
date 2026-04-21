const User = require('../models/User');
const Patient = require('../models/Patient');
const Optometrist = require('../models/Optometrist');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });

exports.register = asyncHandler(async (req, res) => {
  const { email, password, role, ...profileData } = req.body;

  // Defense in depth — validator already restricts role, but never trust input.
  if (role !== 'patient' && role !== 'optometrist') {
    throw new ApiError(403, 'Admin accounts cannot be self-registered');
  }

  const userExists = await User.findOne({ email });
  if (userExists) throw new ApiError(400, 'User already exists');

  const user = await User.create({ email, password, role });

  if (role === 'patient') {
    await Patient.create({ user: user._id, ...profileData });
  } else if (role === 'optometrist') {
    await Optometrist.create({ user: user._id, ...profileData });
  }

  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    token,
    user: { id: user._id, email: user.email, role: user.role },
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid credentials');
  }
  if (user.isActive === false) {
    throw new ApiError(403, 'Account is disabled');
  }

  const token = generateToken(user._id);

  res.json({
    success: true,
    token,
    user: { id: user._id, email: user.email, role: user.role },
  });
});

exports.getMe = asyncHandler(async (req, res) => {
  let profile;
  if (req.user.role === 'patient') {
    profile = await Patient.findOne({ user: req.user._id });
  } else if (req.user.role === 'optometrist') {
    profile = await Optometrist.findOne({ user: req.user._id });
  }

  res.json({
    success: true,
    user: req.user,
    profile,
  });
});

// Stateless — client discards token. Endpoint exists so future refresh-token
// rotation can invalidate server-side state here without a client contract change.
exports.logout = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Logged out' });
});
