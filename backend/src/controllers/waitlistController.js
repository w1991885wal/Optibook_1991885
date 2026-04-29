const moment = require('moment');
const Waitlist = require('../models/Waitlist');
const Patient = require('../models/Patient');
const Optometrist = require('../models/Optometrist');
const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { computeDuration } = require('../utils/durationRules');
const { validateAppointmentSlot } = require('../utils/appointmentConflicts');
const { computeNoShowRisk, computeCompatibility } = require('../utils/aiScoring');

// Fire-and-forget emit — never blocks the waitlist booking on failure.
const emitNotifications = (rows) => {
  try {
    Notification.insertMany(rows, { ordered: false }).catch(() => {});
  } catch (_) {
    /* never throws */
  }
};

const computeEndTime = (startTime, duration) =>
  moment(startTime, 'HH:mm').add(duration, 'minutes').format('HH:mm');

exports.addToWaitlist = asyncHandler(async (req, res) => {
  let { patientId, optometristId, appointmentType, priority } = req.body;

  // Patients may only add themselves.
  if (req.user.role === 'patient') {
    const own = await Patient.findOne({ user: req.user._id });
    if (!own) throw new ApiError(404, 'Patient profile not found');
    patientId = own._id;
  }

  const waitlistEntry = await Waitlist.create({
    patient: patientId,
    optometrist: optometristId,
    appointmentType,
    priority,
  });

  await waitlistEntry.populate('patient optometrist');

  res.status(201).json({ success: true, data: waitlistEntry });
});

exports.getWaitlist = asyncHandler(async (req, res) => {
  const waitlist = await Waitlist.find({ status: 'active' })
    .populate('patient optometrist')
    .sort({ priority: -1, addedDate: 1 });

  res.json({ success: true, count: waitlist.length, data: waitlist });
});

// Soft-remove only — we flip status rather than deleting so history is
// preserved for analytics and audit.
exports.removeFromWaitlist = asyncHandler(async (req, res) => {
  const waitlistEntry = await Waitlist.findOneAndUpdate(
    { _id: req.params.id, status: { $ne: 'removed' } },
    { status: 'removed' },
    { new: true },
  );

  if (!waitlistEntry) {
    // Either never existed, or was already removed.
    const exists = await Waitlist.findById(req.params.id).select('_id status');
    if (!exists) throw new ApiError(404, 'Waitlist entry not found');
    throw new ApiError(409, 'Waitlist entry is already removed');
  }

  res.json({ success: true, data: waitlistEntry });
});

// Phase D4: convert a waitlist entry into a real appointment.
// Reuses the canonical booking path — same duration rule, same conflict
// checker, same AI scoring — so there is no parallel booking logic.
//
// Race-safety: the waitlist status flip from 'active' → 'booked' happens via
// an atomic findOneAndUpdate({status:'active'}) only AFTER Appointment.create
// succeeds. If two optometrists click Confirm on the same row concurrently,
// one wins and the second receives a clean 409 with no appointment created
// for them (they are rolled back below before the status flip could land).
exports.bookFromWaitlist = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { optometristId, date, startTime, usedAiRecommendation } = req.body;

  // Quick guard — we re-check atomically later.
  const entry = await Waitlist.findById(id);
  if (!entry) throw new ApiError(404, 'Waitlist entry not found');
  if (entry.status !== 'active') {
    throw new ApiError(409, `Waitlist entry is ${entry.status}`);
  }

  // Resolve the optometrist: client choice wins (covers both the pinned-optom
  // case and the AI-recommended case). If neither is supplied, fall back to
  // whatever was pinned on the entry.
  const finalOptometristId = optometristId || entry.optometrist;
  if (!finalOptometristId) {
    throw new ApiError(400, 'optometristId required to confirm booking');
  }

  const [patient, optometrist] = await Promise.all([
    Patient.findById(entry.patient),
    Optometrist.findById(finalOptometristId),
  ]);
  if (!patient) throw new ApiError(404, 'Patient not found');
  if (!optometrist) throw new ApiError(404, 'Optometrist not found');

  // Server-side honesty guard for createdViaSmartBooking: it can only be true
  // if the client says AI was used AND the entry had no pinned optometrist
  // that matches the chosen one. Any other combination is forced to false.
  const pinnedMatches =
    entry.optometrist && entry.optometrist.equals(optometrist._id);
  const smartBooking = !!usedAiRecommendation && !pinnedMatches;

  // Canonical booking rules (same utilities the appointment controller uses).
  const duration = computeDuration({
    appointmentType: entry.appointmentType,
    patient,
    optometrist,
  });
  const endTime = computeEndTime(startTime, duration);

  await validateAppointmentSlot({
    optometrist,
    date,
    startTime,
    duration,
  });

  // Best-effort AI scoring — never blocks the booking.
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
        appointmentType: entry.appointmentType,
        date,
        visitsWithOptometrist: visits,
        bookedOnDate: bookedCount,
      }).score;
    }
  } catch (_) {
    /* best-effort */
  }

  const appointment = await Appointment.create({
    patient: patient._id,
    optometrist: optometrist._id,
    date,
    startTime,
    endTime,
    duration,
    appointmentType: entry.appointmentType,
    notes: entry.notes,
    roomNumber: optometrist.roomNumber,
    createdBy: req.user._id,
    noShowRiskScore,
    compatibilityScore,
    createdViaSmartBooking: smartBooking,
  });

  // Atomic flip: only one caller will see status:'active' and win.
  const booked = await Waitlist.findOneAndUpdate(
    { _id: entry._id, status: 'active' },
    { status: 'booked' },
    { new: true },
  );

  if (!booked) {
    // Lost the race: another caller already booked this entry. Roll back the
    // appointment we just created so there is no partial state.
    await Appointment.findByIdAndDelete(appointment._id);
    throw new ApiError(409, 'Waitlist entry was booked by someone else');
  }

  await appointment.populate('patient optometrist');
  await booked.populate('patient optometrist');

  // Fire-and-forget waitlist-confirmed notification (optom + admin).
  const who =
    `${appointment.patient.firstName || ''} ${appointment.patient.lastName || ''}`.trim() ||
    'a patient';
  const when = `${moment(appointment.date).format('ddd D MMM')} at ${appointment.startTime}`;
  emitNotifications([
    {
      recipientRole: 'optometrist',
      optometrist: appointment.optometrist._id,
      type: 'waitlist-confirmed',
      title: 'Waitlist booking confirmed',
      message: `${who} booked from the waitlist — ${appointment.appointmentType} on ${when}.`,
      appointment: appointment._id,
    },
    {
      recipientRole: 'admin',
      type: 'waitlist-confirmed',
      title: 'Waitlist booking confirmed',
      message: `${who} booked from the waitlist — ${appointment.appointmentType} on ${when}.`,
      appointment: appointment._id,
    },
  ]);

  res.status(201).json({
    success: true,
    data: { appointment, waitlistEntry: booked },
  });
});
