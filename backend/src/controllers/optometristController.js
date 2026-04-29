const Optometrist = require('../models/Optometrist');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// Whitelist for Phase E self-update — only these five fields are ever written
// through PUT /optometrists/me, regardless of what the client sends.
const UPDATABLE_FIELDS = [
  'workingHours',
  'lunchBreak',
  'defaultAppointmentDuration',
  'bufferTime',
  'maxAppointmentsPerDay',
];

const DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

// Lightweight shape validator — used so a malformed workingHours payload gets
// a clean 400 instead of a Mongoose cast error.
const validateWorkingHours = (wh) => {
  if (!wh || typeof wh !== 'object') return 'workingHours must be an object';
  for (const day of DAY_KEYS) {
    const d = wh[day];
    if (!d) continue; // missing days are left untouched (merged in updateMe)
    if (typeof d !== 'object') return `workingHours.${day} must be an object`;
    if (typeof d.working !== 'boolean')
      return `workingHours.${day}.working must be boolean`;
    if (d.working) {
      if (!HHMM.test(d.start || ''))
        return `workingHours.${day}.start must be HH:mm`;
      if (!HHMM.test(d.end || ''))
        return `workingHours.${day}.end must be HH:mm`;
      if (d.start >= d.end)
        return `workingHours.${day}.start must be before end`;
    }
  }
  return null;
};

const validateLunch = (lb) => {
  if (lb === undefined) return null;
  if (!lb || typeof lb !== 'object') return 'lunchBreak must be an object';
  if (!HHMM.test(lb.start || '')) return 'lunchBreak.start must be HH:mm';
  if (!HHMM.test(lb.end || '')) return 'lunchBreak.end must be HH:mm';
  if (lb.start >= lb.end) return 'lunchBreak.start must be before end';
  return null;
};

exports.getOptometrists = asyncHandler(async (req, res) => {
  const optometrists = await Optometrist.find().populate('user');
  res.json({ success: true, data: optometrists });
});

exports.getOptometrist = asyncHandler(async (req, res) => {
  const optometrist = await Optometrist.findById(req.params.id).populate('user');
  if (!optometrist) throw new ApiError(404, 'Optometrist not found');
  res.json({ success: true, data: optometrist });
});

// Phase E: load the logged-in optometrist's own record for the Schedule page.
exports.getMe = asyncHandler(async (req, res) => {
  const optom = await Optometrist.findOne({ user: req.user._id });
  if (!optom) throw new ApiError(404, 'Optometrist profile not found');
  res.json({ success: true, data: optom });
});

// Phase E: save working hours + lunch + preferences. Tightly whitelisted —
// every other field in the payload is silently discarded.
exports.updateMe = asyncHandler(async (req, res) => {
  const optom = await Optometrist.findOne({ user: req.user._id });
  if (!optom) throw new ApiError(404, 'Optometrist profile not found');

  // Strip everything that isn't in the whitelist.
  const patch = {};
  for (const key of UPDATABLE_FIELDS) {
    if (req.body[key] !== undefined) patch[key] = req.body[key];
  }

  if (patch.workingHours !== undefined) {
    const err = validateWorkingHours(patch.workingHours);
    if (err) throw new ApiError(400, err);
    // Merge onto existing so the caller can send only the days they changed.
    patch.workingHours = {
      ...(optom.workingHours?.toObject?.() || optom.workingHours || {}),
      ...patch.workingHours,
    };
  }

  if (patch.lunchBreak !== undefined) {
    const err = validateLunch(patch.lunchBreak);
    if (err) throw new ApiError(400, err);
  }

  if (patch.defaultAppointmentDuration !== undefined) {
    const n = Number(patch.defaultAppointmentDuration);
    if (!Number.isInteger(n) || n < 5 || n > 240)
      throw new ApiError(400, 'defaultAppointmentDuration must be 5..240');
    patch.defaultAppointmentDuration = n;
  }
  if (patch.bufferTime !== undefined) {
    const n = Number(patch.bufferTime);
    if (!Number.isInteger(n) || n < 0 || n > 60)
      throw new ApiError(400, 'bufferTime must be 0..60');
    patch.bufferTime = n;
  }
  if (patch.maxAppointmentsPerDay !== undefined) {
    const n = Number(patch.maxAppointmentsPerDay);
    if (!Number.isInteger(n) || n < 1 || n > 64)
      throw new ApiError(400, 'maxAppointmentsPerDay must be 1..64');
    patch.maxAppointmentsPerDay = n;
  }

  const updated = await Optometrist.findByIdAndUpdate(optom._id, patch, {
    new: true,
    runValidators: true,
  });

  res.json({ success: true, data: updated });
});
