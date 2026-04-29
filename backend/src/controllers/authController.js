const User = require('../models/User');
const Patient = require('../models/Patient');
const Optometrist = require('../models/Optometrist');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { getNextPatientNumber } = require('../utils/patientNumber');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });

exports.register = asyncHandler(async (req, res) => {
  // Public registration is patient-only. Staff accounts are created via seed/admin flows.
  const {
    email,
    password,
    role,
    firstName,
    lastName,
    dateOfBirth,
    address,
    phone,
    languagePreference,
  } = req.body;

  // Defense in depth — validator already restricts role, but never trust input.
  if (role !== 'patient') {
    throw new ApiError(403, 'Only patient self-registration is supported');
  }

  const userExists = await User.findOne({ email });
  if (userExists) throw new ApiError(400, 'User already exists');

  const user = await User.create({ email, password, role });

  // Phase D2b: assign the next user-facing patientNumber. Failure here would
  // leave a patient with patientNumber=null; the boot backfill will fix it
  // on the next start so registration is not blocked by a transient error.
  let patientNumber;
  try {
    patientNumber = await getNextPatientNumber();
  } catch {
    patientNumber = undefined;
  }

  await Patient.create({
    user: user._id,
    patientNumber,
    firstName,
    lastName,
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
    address,
    phone,
    languagePreference,
  });

  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    token,
    user: { id: user._id, email: user.email, role: user.role },
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password, staffGateUser, staffGatePass } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid credentials');
  }
  if (user.isActive === false) {
    throw new ApiError(403, 'Account is disabled');
  }

  // Staff accounts (optometrist/admin) must also present the clinic-level gate
  // credentials configured in STAFF_GATE_USER / STAFF_GATE_PASS. A generic
  // "Invalid credentials" response is used on gate failure so the UI cannot
  // distinguish a wrong gate password from a wrong login password.
  if (user.role === 'optometrist' || user.role === 'admin') {
    const expectedUser = process.env.STAFF_GATE_USER;
    const expectedPass = process.env.STAFF_GATE_PASS;
    if (!expectedUser || !expectedPass) {
      throw new ApiError(500, 'Staff gate not configured');
    }
    if (staffGateUser !== expectedUser || staffGatePass !== expectedPass) {
      throw new ApiError(401, 'Invalid credentials');
    }
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
