const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Optometrist = require('../models/Optometrist');
const Notification = require('../models/Notification');
const moment = require('moment');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { computeDuration } = require('../utils/durationRules');
const { validateAppointmentSlot } = require('../utils/appointmentConflicts');
const { computeNoShowRisk, computeCompatibility } = require('../utils/aiScoring');

// Phase E: fire-and-forget notification emission. NEVER await in the request
// path — any DB failure here must not surface to the caller or block the
// primary action. We catch and swallow; logging stays silent in prod.
const emitNotifications = (rows) => {
  // rows = array of notification-shaped plain objects
  try {
    Notification.insertMany(rows, { ordered: false }).catch(() => {});
  } catch (_) {
    /* never throws */
  }
};

const patientName = (p) =>
  p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'a patient' : 'a patient';

const fmtWhen = (date, startTime) =>
  `${moment(date).format('ddd D MMM')} at ${startTime}`;

const notifyBooking = (appointment, patient) => {
  const who = patientName(patient);
  const when = fmtWhen(appointment.date, appointment.startTime);
  emitNotifications([
    {
      recipientRole: 'optometrist',
      optometrist: appointment.optometrist,
      type: 'booking-created',
      title: 'New booking',
      message: `${who} booked a ${appointment.appointmentType} on ${when}.`,
      appointment: appointment._id,
    },
    {
      recipientRole: 'admin',
      type: 'booking-created',
      title: 'New booking',
      message: `${who} booked a ${appointment.appointmentType} on ${when}.`,
      appointment: appointment._id,
    },
  ]);
};

const notifyReschedule = (appointment, patient) => {
  const who = patientName(patient);
  const when = fmtWhen(appointment.date, appointment.startTime);
  emitNotifications([
    {
      recipientRole: 'optometrist',
      optometrist: appointment.optometrist,
      type: 'booking-rescheduled',
      title: 'Appointment rescheduled',
      message: `${who}'s appointment moved to ${when}.`,
      appointment: appointment._id,
    },
    {
      recipientRole: 'admin',
      type: 'booking-rescheduled',
      title: 'Appointment rescheduled',
      message: `${who}'s appointment moved to ${when}.`,
      appointment: appointment._id,
    },
  ]);
};

const notifyCancel = (appointment, patient) => {
  const who = patientName(patient);
  const when = fmtWhen(appointment.date, appointment.startTime);
  emitNotifications([
    {
      recipientRole: 'optometrist',
      optometrist: appointment.optometrist,
      type: 'booking-cancelled',
      title: 'Appointment cancelled',
      message: `${who}'s appointment on ${when} was cancelled.`,
      appointment: appointment._id,
    },
    {
      recipientRole: 'admin',
      type: 'booking-cancelled',
      title: 'Appointment cancelled',
      message: `${who}'s appointment on ${when} was cancelled.`,
      appointment: appointment._id,
    },
  ]);
};

const computeEndTime = (startTime, duration) =>
  moment(startTime, 'HH:mm').add(duration, 'minutes').format('HH:mm');

// Returns true if the user may modify this appointment:
// - admin
// - the user who created it
// - the optometrist the appointment is assigned to
const canModifyAppointment = async (user, appointment) => {
  if (user.role === 'admin') return true;
  if (appointment.createdBy && appointment.createdBy.equals(user._id)) return true;
  if (user.role === 'optometrist') {
    const optom = await Optometrist.findOne({ user: user._id });
    if (optom && appointment.optometrist.equals(optom._id)) return true;
  }
  return false;
};

exports.createAppointment = asyncHandler(async (req, res) => {
  let {
    patientId,
    optometristId,
    date,
    startTime,
    appointmentType,
    specialRequirements,
    notes,
    smartBooking,
  } = req.body;

  // Patients may only book for themselves.
  if (req.user.role === 'patient') {
    const ownPatient = await Patient.findOne({ user: req.user._id });
    if (!ownPatient) throw new ApiError(404, 'Patient profile not found');
    patientId = ownPatient._id;
  }

  const [patient, optometrist] = await Promise.all([
    Patient.findById(patientId),
    Optometrist.findById(optometristId),
  ]);
  if (!patient) throw new ApiError(404, 'Patient not found');
  if (!optometrist) throw new ApiError(404, 'Optometrist not found');

  // Duration is always computed server-side from type + patient age.
  const duration = computeDuration({ appointmentType, patient, optometrist });
  const endTime = computeEndTime(startTime, duration);

  await validateAppointmentSlot({
    optometrist,
    date,
    startTime,
    duration,
  });

  // Best-effort AI scoring. Never blocks a booking on failure.
  let noShowRiskScore = null;
  let compatibilityScore = null;
  try {
    const pastNoShows = await Appointment.countDocuments({
      patient: patient._id,
      status: 'no-show',
      date: { $gte: moment().subtract(180, 'days').toDate() },
    });
    const leadDays = Math.max(
      0,
      moment(date).startOf('day').diff(moment().startOf('day'), 'days'),
    );
    noShowRiskScore = computeNoShowRisk({
      patient,
      optometrist,
      date,
      startTime,
      pastNoShows,
      leadDays,
    }).riskScore;

    if (smartBooking) {
      const [visits, bookedCount] = await Promise.all([
        Appointment.countDocuments({
          patient: patient._id,
          optometrist: optometrist._id,
          status: { $in: ['completed', 'confirmed', 'scheduled'] },
        }),
        Appointment.countDocuments({
          optometrist: optometrist._id,
          date: {
            $gte: moment(date).startOf('day').toDate(),
            $lte: moment(date).endOf('day').toDate(),
          },
          status: { $ne: 'cancelled' },
        }),
      ]);
      compatibilityScore = computeCompatibility({
        patient,
        optometrist,
        appointmentType,
        date,
        visitsWithOptometrist: visits,
        bookedOnDate: bookedCount,
      }).score;
    }
  } catch (_) {
    // scoring is best-effort
  }

  const appointment = await Appointment.create({
    patient: patientId,
    optometrist: optometristId,
    date,
    startTime,
    endTime,
    duration,
    appointmentType,
    specialRequirements,
    notes,
    roomNumber: optometrist.roomNumber,
    createdBy: req.user._id,
    noShowRiskScore,
    compatibilityScore,
    createdViaSmartBooking: !!smartBooking,
  });

  await appointment.populate('patient optometrist');

  // Fire-and-forget — after the primary action has resolved.
  notifyBooking(appointment, appointment.patient);

  res.status(201).json({ success: true, data: appointment });
});

exports.getAppointments = asyncHandler(async (req, res) => {
  const query = {};

  if (req.user.role === 'patient') {
    query.createdBy = req.user._id;
  } else if (req.user.role === 'optometrist') {
    const optometrist = await Optometrist.findOne({ user: req.user._id });
    if (!optometrist) {
      return res.json({ success: true, count: 0, data: [] });
    }
    query.optometrist = optometrist._id;
  }

  // Diary filters — additive, safe to ignore when absent.
  const { startDate, endDate, optometristIds } = req.query;
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = moment(startDate).startOf('day').toDate();
    if (endDate) query.date.$lte = moment(endDate).endOf('day').toDate();
  }
  // optometristIds only respected for admin; other roles already scoped above.
  if (optometristIds && req.user.role === 'admin') {
    const ids = String(optometristIds)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length) query.optometrist = { $in: ids };
  }

  const appointments = await Appointment.find(query)
    .populate('patient optometrist')
    .sort({ date: 1, startTime: 1 });

  res.json({
    success: true,
    count: appointments.length,
    data: appointments,
  });
});

exports.getAvailableSlots = asyncHandler(async (req, res) => {
  const { optometristId, date, appointmentType } = req.query;

  const optometrist = await Optometrist.findById(optometristId);
  if (!optometrist) throw new ApiError(404, 'Optometrist not found');

  const dayOfWeek = moment(date).format('dddd').toLowerCase();
  const workingHours = optometrist.workingHours[dayOfWeek];

  if (!workingHours || !workingHours.working) {
    return res.json({ success: true, data: [] });
  }

  // Compute the real required duration so we only offer slots that fit.
  let duration = optometrist.defaultAppointmentDuration || 30;
  if (appointmentType) {
    let patient = null;
    if (req.user.role === 'patient') {
      patient = await Patient.findOne({ user: req.user._id });
    }
    duration = computeDuration({ appointmentType, patient, optometrist });
  }

  const dayStart = moment(date).startOf('day').toDate();
  const dayEnd = moment(date).endOf('day').toDate();
  const booked = await Appointment.find({
    optometrist: optometristId,
    date: { $gte: dayStart, $lte: dayEnd },
    status: { $ne: 'cancelled' },
  }).select('startTime duration');

  const step = optometrist.defaultAppointmentDuration || 30;
  const buffer = optometrist.bufferTime || 0;
  const candidateSlots = generateTimeSlots(
    workingHours.start,
    workingHours.end,
    step,
    optometrist.lunchBreak,
  );

  const lunchStart = moment(optometrist.lunchBreak.start, 'HH:mm');
  const lunchEnd = moment(optometrist.lunchBreak.end, 'HH:mm');
  const workEnd = moment(workingHours.end, 'HH:mm');

  const available = candidateSlots.filter((slot) => {
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

  res.json({ success: true, data: available });
});

function generateTimeSlots(start, end, duration, lunchBreak) {
  const slots = [];
  let current = moment(start, 'HH:mm');
  const endTime = moment(end, 'HH:mm');
  const lunchStart = moment(lunchBreak.start, 'HH:mm');
  const lunchEnd = moment(lunchBreak.end, 'HH:mm');

  while (current.isBefore(endTime)) {
    if (current.isBetween(lunchStart, lunchEnd, null, '[)')) {
      current = lunchEnd.clone();
      continue;
    }
    slots.push(current.format('HH:mm'));
    current.add(duration, 'minutes');
  }

  return slots;
}

exports.updateAppointment = asyncHandler(async (req, res) => {
  const existing = await Appointment.findById(req.params.id);
  if (!existing) throw new ApiError(404, 'Appointment not found');

  if (!(await canModifyAppointment(req.user, existing))) {
    throw new ApiError(403, 'Not authorized to modify this appointment');
  }

  const patch = { ...req.body };
  if (req.user.role === 'patient') {
    delete patch.patient;
    delete patch.optometrist;
    delete patch.createdBy;
  }
  // duration is derived; ignore client value
  delete patch.duration;
  delete patch.endTime;

  const appointment = await Appointment.findByIdAndUpdate(req.params.id, patch, {
    new: true,
    runValidators: true,
  }).populate('patient optometrist');

  res.json({ success: true, data: appointment });
});

exports.rescheduleAppointment = asyncHandler(async (req, res) => {
  const existing = await Appointment.findById(req.params.id);
  if (!existing) throw new ApiError(404, 'Appointment not found');

  if (!(await canModifyAppointment(req.user, existing))) {
    throw new ApiError(403, 'Not authorized to modify this appointment');
  }

  const { date, startTime } = req.body;

  const [patient, optometrist] = await Promise.all([
    Patient.findById(existing.patient),
    Optometrist.findById(existing.optometrist),
  ]);
  if (!patient) throw new ApiError(404, 'Patient not found');
  if (!optometrist) throw new ApiError(404, 'Optometrist not found');

  // Re-run duration rule and conflict check with the new date/time.
  const duration = computeDuration({
    appointmentType: existing.appointmentType,
    patient,
    optometrist,
  });
  const endTime = computeEndTime(startTime, duration);

  await validateAppointmentSlot({
    optometrist,
    date,
    startTime,
    duration,
    excludeId: existing._id,
  });

  existing.date = date;
  existing.startTime = startTime;
  existing.endTime = endTime;
  existing.duration = duration;

  // Best-effort no-show risk refresh on reschedule.
  try {
    const pastNoShows = await Appointment.countDocuments({
      patient: existing.patient,
      status: 'no-show',
      date: { $gte: moment().subtract(180, 'days').toDate() },
    });
    const leadDays = Math.max(
      0,
      moment(date).startOf('day').diff(moment().startOf('day'), 'days'),
    );
    existing.noShowRiskScore = computeNoShowRisk({
      patient,
      optometrist,
      date,
      startTime,
      pastNoShows,
      leadDays,
    }).riskScore;
  } catch (_) {
    /* best-effort */
  }

  await existing.save();
  await existing.populate('patient optometrist');

  notifyReschedule(existing, existing.patient);

  res.json({ success: true, data: existing });
});

exports.cancelAppointment = asyncHandler(async (req, res) => {
  const existing = await Appointment.findById(req.params.id);
  if (!existing) throw new ApiError(404, 'Appointment not found');

  if (!(await canModifyAppointment(req.user, existing))) {
    throw new ApiError(403, 'Not authorized to cancel this appointment');
  }

  const appointment = await Appointment.findByIdAndUpdate(
    req.params.id,
    { status: 'cancelled' },
    { new: true },
  ).populate('patient');

  // TODO (Phase 7): auto-promote next waitlist entry for this optometrist

  notifyCancel(appointment, appointment.patient);

  res.json({ success: true, data: appointment });
});
