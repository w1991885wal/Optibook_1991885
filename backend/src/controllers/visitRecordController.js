const moment = require('moment');
const VisitRecord = require('../models/VisitRecord');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Optometrist = require('../models/Optometrist');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// Recall interval whitelist — months from today.
const RECALL_MONTHS = new Set([3, 6, 12, 24]);

// Only the optometrist the appointment is assigned to (or an admin) may
// manage the visit record for that appointment.
const assertCanManage = async (user, appointment) => {
  if (user.role === 'admin') return;
  if (user.role !== 'optometrist') {
    throw new ApiError(403, 'Not authorized for this role');
  }
  const optom = await Optometrist.findOne({ user: user._id });
  if (!optom || !appointment.optometrist.equals(optom._id)) {
    throw new ApiError(403, 'Not authorized for this appointment');
  }
};

const loadAppointmentOr404 = async (id) => {
  const appt = await Appointment.findById(id);
  if (!appt) throw new ApiError(404, 'Appointment not found');
  return appt;
};

// GET /api/visit-records/patient/:patientId
// Phase D2a: list all visit records for a patient (newest first). Used by the
// optometrist patient-history page. Read-only — no mutation.
exports.getByPatient = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const records = await VisitRecord.find({ patient: patientId })
    .populate('appointment optometrist')
    .sort({ visitDate: -1, createdAt: -1 });
  res.json({ success: true, count: records.length, data: records });
});

// GET /api/visit-records/appointment/:appointmentId
// Returns the visit record for the given appointment (or data:null if none yet).
exports.getByAppointment = asyncHandler(async (req, res) => {
  const appointment = await loadAppointmentOr404(req.params.appointmentId);
  await assertCanManage(req.user, appointment);

  const record = await VisitRecord.findOne({ appointment: appointment._id });
  res.json({ success: true, data: record || null });
});

// PUT /api/visit-records/appointment/:appointmentId
// Create or update a visit record. Lightweight fields: diagnosis, notes, prescription.
exports.upsertForAppointment = asyncHandler(async (req, res) => {
  const appointment = await loadAppointmentOr404(req.params.appointmentId);
  await assertCanManage(req.user, appointment);

  const { diagnosis, notes, prescription } = req.body || {};

  const record = await VisitRecord.findOneAndUpdate(
    { appointment: appointment._id },
    {
      appointment: appointment._id,
      patient: appointment.patient,
      optometrist: appointment.optometrist,
      ...(diagnosis !== undefined && { diagnosis }),
      ...(notes !== undefined && { notes }),
      ...(prescription !== undefined && { prescription }),
    },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
  );

  // Link the record back onto the appointment (idempotent).
  if (!appointment.visitRecord || !appointment.visitRecord.equals(record._id)) {
    appointment.visitRecord = record._id;
    await appointment.save();
  }

  res.json({ success: true, data: record });
});

// Compute a Date `months` months from now if `months` is a valid whitelisted
// value, otherwise return undefined.
const monthsFromNowOrNull = (months) => {
  const n = Number(months);
  if (!RECALL_MONTHS.has(n)) return undefined;
  return moment().add(n, 'months').toDate();
};

// POST /api/visit-records/appointment/:appointmentId/complete
// Phase R5b: typed-only persistence.
//   New shape : { diagnosis?, notes?, prescription?,
//                 eyeTestRecallMonths?, contactLensRecallMonths? }
//   Legacy    : { diagnosis?, notes?, prescription?, recallMonths }
// At least one recall value must be present. Legacy `recallMonths` is still
// accepted (treated as eye-test recall) to preserve D1 semantics for any
// caller that hasn't migrated yet.
//
// Persistence: only the typed fields (`eyeTestRecallDate` and/or
// `contactLensRecallDate`) are written to Patient + VisitRecord. The legacy
// `nextRecallDate` schema field is no longer touched on writes; it remains
// on the schema as vestigial historical data.
//
// Response: a derived `nextRecallDate` (= soonest of the two typed dates) is
// still returned in the JSON payload for backward compatibility with any
// caller that still reads the legacy field from the response shape.
exports.completeAppointment = asyncHandler(async (req, res) => {
  const appointment = await loadAppointmentOr404(req.params.appointmentId);
  await assertCanManage(req.user, appointment);

  const {
    diagnosis,
    notes,
    prescription,
    recallMonths,
    eyeTestRecallMonths,
    contactLensRecallMonths,
  } = req.body || {};

  // Resolve the two typed recall dates. Legacy `recallMonths` falls into the
  // eye-test slot if no explicit eyeTestRecallMonths was provided.
  const eyeTestRecallDate =
    monthsFromNowOrNull(eyeTestRecallMonths) ||
    (eyeTestRecallMonths === undefined
      ? monthsFromNowOrNull(recallMonths)
      : undefined);
  const contactLensRecallDate = monthsFromNowOrNull(contactLensRecallMonths);

  if (!eyeTestRecallDate && !contactLensRecallDate) {
    throw new ApiError(
      400,
      'At least one recall must be set (recallMonths, eyeTestRecallMonths, or contactLensRecallMonths must be 3, 6, 12 or 24)',
    );
  }

  // R5b: derived for the response payload only — not persisted.
  const candidates = [eyeTestRecallDate, contactLensRecallDate].filter(Boolean);
  const derivedNextRecallDate = candidates.reduce(
    (earliest, d) => (!earliest || d < earliest ? d : earliest),
    null,
  );

  // recallType reflects which recall this visit emphasised. If both were set,
  // prefer eye-test as the dominant clinical signal.
  let recallType;
  if (eyeTestRecallDate) recallType = 'eye-test';
  else if (contactLensRecallDate) recallType = 'contact-lens';

  // R5b: typed fields only. Legacy `nextRecallDate` is no longer written
  // to the visit record. Pre-R1 historical visits keep their archival value
  // because the field is still defined on the schema and patientHistory.jsx
  // continues to render it via legacy fallback.
  const visitPatch = {
    appointment: appointment._id,
    patient: appointment.patient,
    optometrist: appointment.optometrist,
    ...(diagnosis !== undefined && { diagnosis }),
    ...(notes !== undefined && { notes }),
    ...(prescription !== undefined && { prescription }),
    ...(recallType && { recallType }),
    ...(eyeTestRecallDate && { eyeTestRecallDate }),
    ...(contactLensRecallDate && { contactLensRecallDate }),
  };

  const record = await VisitRecord.findOneAndUpdate(
    { appointment: appointment._id },
    visitPatch,
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
  );

  // First-time transition guard: only bump visitCount once, even if the
  // optometrist clicks Complete twice.
  const wasAlreadyCompleted = appointment.status === 'completed';

  appointment.status = 'completed';
  appointment.visitRecord = record._id;
  await appointment.save();

  // R5b: refresh only the typed fields that this visit set. Legacy
  // `nextRecallDate` is no longer written. visitCount bumps only on the
  // first transition into completed.
  const patientPatch = {};
  if (eyeTestRecallDate) patientPatch.eyeTestRecallDate = eyeTestRecallDate;
  if (contactLensRecallDate) {
    patientPatch.contactLensRecallDate = contactLensRecallDate;
  }
  const inc = wasAlreadyCompleted ? undefined : { visitCount: 1 };

  // Empty $set is invalid in Mongo; build the update conditionally so we
  // never send a no-op write.
  const update = {};
  if (Object.keys(patientPatch).length > 0) update.$set = patientPatch;
  if (inc) update.$inc = inc;
  if (Object.keys(update).length > 0) {
    await Patient.findByIdAndUpdate(appointment.patient, update, {
      new: true,
    });
  }

  res.json({
    success: true,
    data: {
      appointmentId: appointment._id,
      status: appointment.status,
      visitRecord: record,
      // R5b: derived for response-shape backward compatibility only —
      // not persisted. = soonest of the typed fields set this visit.
      nextRecallDate: derivedNextRecallDate,
      eyeTestRecallDate: eyeTestRecallDate || null,
      contactLensRecallDate: contactLensRecallDate || null,
      visitCountIncremented: !wasAlreadyCompleted,
    },
  });
});
