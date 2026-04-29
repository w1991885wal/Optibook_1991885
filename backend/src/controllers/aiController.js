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

  // Phase AI-3: pre-compute lead days + past no-shows once. Both are
  // patient-and-date scoped, not optom-specific.
  const leadDays = leadDaysFrom(date);
  const pastNoShows = await countPastNoShows(patient._id);

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

    // Phase AI-3: ML-informed re-rank.
    // computeNoShowRisk goes through the trained model (rules fallback if
    // unavailable). startTime is intentionally omitted — the recommendation
    // step happens before slot selection, so this represents an "average
    // slot on this date" estimate. The actual booking flow recomputes risk
    // with the chosen slot in appointmentController.createAppointment.
    let predictedNoShowRisk = null;
    let predictedAttendance = null;
    let riskLevel = null;
    let riskFactors = [];
    let finalScore = recommendationScore;
    try {
      const risk = computeNoShowRisk({
        patient,
        optometrist: o,
        date,
        leadDays,
        pastNoShows,
        appointmentType,
      });
      if (risk && typeof risk.riskScore === 'number') {
        predictedNoShowRisk = Number(risk.riskScore.toFixed(2));
        predictedAttendance = Number((1 - risk.riskScore).toFixed(2));
        riskLevel = risk.riskLevel || null;
        riskFactors = Array.isArray(risk.factors) ? risk.factors.slice(0, 3) : [];
        // Weighted re-rank: 70% existing rules-based recommendation,
        // 30% predicted attendance scaled to a 0-100 range.
        finalScore = Math.round(
          0.7 * recommendationScore + 0.3 * predictedAttendance * 100,
        );
      }
    } catch (_err) {
      // Row-local failure: keep the existing recommendationScore as the
      // finalScore, leave predicted fields null. The rest of the row is
      // unaffected.
    }

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
      // Phase AI-3 additions (backward-compatible — purely additive fields):
      predictedNoShowRisk,
      predictedAttendance,
      riskLevel,
      riskFactors,
      finalScore,
    });
  }

  // Phase AI-3: sort by finalScore (= ML-reranked) instead of the raw
  // recommendationScore. recommendationScore stays on each row as the
  // un-reranked baseline for inspection/dissertation comparisons.
  ranked.sort((a, b) => b.finalScore - a.finalScore);
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
