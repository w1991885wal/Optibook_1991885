const moment = require('moment');
const Patient = require('../models/Patient');
const Optometrist = require('../models/Optometrist');
const Appointment = require('../models/Appointment');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { computeDuration } = require('../utils/durationRules');
const {
  computeCompatibility,
  computeRecommendationScore,
  computeNoShowRisk,
  rankSlots,
} = require('../utils/aiScoring');

// --- shared helpers ---

async function resolvePatient(req, patientIdFromBody) {
  if (req.user.role === 'patient') {
    const own = await Patient.findOne({ user: req.user._id });
    if (!own) throw new ApiError(404, 'Patient profile not found');
    return own;
  }
  if (!patientIdFromBody) throw new ApiError(400, 'patientId is required');
  const p = await Patient.findById(patientIdFromBody);
  if (!p) throw new ApiError(404, 'Patient not found');
  return p;
}

async function countVisitsWithOptometrist(patientId, optometristId) {
  return Appointment.countDocuments({
    patient: patientId,
    optometrist: optometristId,
    status: { $in: ['completed', 'confirmed', 'scheduled'] },
  });
}

async function countBookedOnDate(optometristId, date) {
  const dayStart = moment(date).startOf('day').toDate();
  const dayEnd = moment(date).endOf('day').toDate();
  return Appointment.countDocuments({
    optometrist: optometristId,
    date: { $gte: dayStart, $lte: dayEnd },
    status: { $ne: 'cancelled' },
  });
}

async function countPastNoShows(patientId) {
  const cutoff = moment().subtract(180, 'days').toDate();
  return Appointment.countDocuments({
    patient: patientId,
    status: 'no-show',
    date: { $gte: cutoff },
  });
}

const leadDaysFrom = (date) =>
  Math.max(0, moment(date).startOf('day').diff(moment().startOf('day'), 'days'));

// --- controllers ---

exports.recommendOptometrist = asyncHandler(async (req, res) => {
  const { patientId, appointmentType, date } = req.body;
  if (!appointmentType || !date) {
    throw new ApiError(400, 'appointmentType and date are required');
  }

  const patient = await resolvePatient(req, patientId);
  const optometrists = await Optometrist.find({ isActive: { $ne: false } });

  const ranked = [];
  for (const o of optometrists) {
    const [bookedOnDate, visitsWithOptometrist] = await Promise.all([
      countBookedOnDate(o._id, date),
      countVisitsWithOptometrist(patient._id, o._id),
    ]);
    const compat = computeCompatibility({
      patient,
      optometrist: o,
      appointmentType,
      date,
      visitsWithOptometrist,
      bookedOnDate,
    });
    const recommendationScore = computeRecommendationScore({
      compatibilityScore: compat.score,
      bookedOnDate,
      maxPerDay: o.maxAppointmentsPerDay,
    });
    const explanation = compat.breakdown
      .filter((b) => b.score === b.max)
      .map((b) => b.factor);
    ranked.push({
      optometristId: o._id,
      firstName: o.firstName,
      lastName: o.lastName,
      specialty: o.specialty,
      roomNumber: o.roomNumber,
      recommendationScore,
      compatibilityScore: compat.score,
      breakdown: compat.breakdown,
      explanation,
    });
  }

  ranked.sort((a, b) => b.recommendationScore - a.recommendationScore);
  res.json({ success: true, data: ranked.slice(0, 3) });
});

exports.recommendSlots = asyncHandler(async (req, res) => {
  const { patientId, optometristId, date, appointmentType } = req.body;
  if (!optometristId || !date || !appointmentType) {
    throw new ApiError(400, 'optometristId, date and appointmentType are required');
  }
  const patient = await resolvePatient(req, patientId);
  const optometrist = await Optometrist.findById(optometristId);
  if (!optometrist) throw new ApiError(404, 'Optometrist not found');

  const duration = computeDuration({ appointmentType, patient, optometrist });

  const dayKey = moment(date).format('dddd').toLowerCase();
  const wh = optometrist.workingHours[dayKey];
  if (!wh || !wh.working) return res.json({ success: true, data: [] });

  const dayStart = moment(date).startOf('day').toDate();
  const dayEnd = moment(date).endOf('day').toDate();
  const booked = await Appointment.find({
    optometrist: optometristId,
    date: { $gte: dayStart, $lte: dayEnd },
    status: { $ne: 'cancelled' },
  }).select('startTime duration');

  const step = optometrist.defaultAppointmentDuration || 30;
  const buffer = optometrist.bufferTime || 0;
  const lunchStart = moment(optometrist.lunchBreak.start, 'HH:mm');
  const lunchEnd = moment(optometrist.lunchBreak.end, 'HH:mm');
  const workEnd = moment(wh.end, 'HH:mm');

  const candidates = [];
  let cursor = moment(wh.start, 'HH:mm');
  while (cursor.isBefore(workEnd)) {
    if (cursor.isBetween(lunchStart, lunchEnd, null, '[)')) {
      cursor = lunchEnd.clone();
      continue;
    }
    candidates.push(cursor.format('HH:mm'));
    cursor.add(step, 'minutes');
  }

  const free = candidates.filter((slot) => {
    const s = moment(slot, 'HH:mm');
    const e = s.clone().add(duration, 'minutes');
    if (e.isAfter(workEnd)) return false;
    if (s.isBefore(lunchEnd) && e.isAfter(lunchStart)) return false;
    for (const b of booked) {
      const bs = moment(b.startTime, 'HH:mm');
      const be = bs.clone().add(b.duration || 30, 'minutes');
      const blockStart = bs.clone().subtract(buffer, 'minutes');
      const blockEnd = be.clone().add(buffer, 'minutes');
      if (s.isBefore(blockEnd) && e.isAfter(blockStart)) return false;
    }
    return true;
  });

  const [pastNoShows, visitsWithOptometrist] = await Promise.all([
    countPastNoShows(patient._id),
    countVisitsWithOptometrist(patient._id, optometristId),
  ]);

  const ranked = rankSlots({
    slots: free,
    patient,
    optometrist,
    appointmentType,
    date,
    visitsWithOptometrist,
    bookedOnDate: booked.length,
    pastNoShows,
    leadDaysFn: (d) => leadDaysFrom(d),
  });

  res.json({ success: true, data: ranked });
});

exports.noShowPrediction = asyncHandler(async (req, res) => {
  const { patientId, optometristId, date, startTime, appointmentType } = req.body;
  if (!date || !startTime) throw new ApiError(400, 'date and startTime are required');

  const patient = await resolvePatient(req, patientId);
  const optometrist = optometristId ? await Optometrist.findById(optometristId) : null;

  const pastNoShows = await countPastNoShows(patient._id);
  const leadDays = leadDaysFrom(date);

  const result = computeNoShowRisk({
    patient,
    optometrist,
    date,
    startTime,
    pastNoShows,
    leadDays,
  });
  res.json({
    success: true,
    data: { ...result, appointmentType: appointmentType || null },
  });
});

exports.compatibility = asyncHandler(async (req, res) => {
  const { patientId, optometristId } = req.params;
  const appointmentType = req.query.appointmentType || 'Standard Eye Test';
  const date = req.query.date || new Date().toISOString();

  if (req.user.role === 'patient') {
    const own = await Patient.findOne({ user: req.user._id });
    if (!own || String(own._id) !== String(patientId)) {
      throw new ApiError(403, 'Not authorized');
    }
  }

  const patient = await Patient.findById(patientId);
  if (!patient) throw new ApiError(404, 'Patient not found');
  const optometrist = await Optometrist.findById(optometristId);
  if (!optometrist) throw new ApiError(404, 'Optometrist not found');

  const [bookedOnDate, visitsWithOptometrist] = await Promise.all([
    countBookedOnDate(optometristId, date),
    countVisitsWithOptometrist(patientId, optometristId),
  ]);

  const compat = computeCompatibility({
    patient,
    optometrist,
    appointmentType,
    date,
    visitsWithOptometrist,
    bookedOnDate,
  });

  res.json({ success: true, data: compat });
});
