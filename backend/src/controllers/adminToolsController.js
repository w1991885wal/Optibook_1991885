const User = require('../models/User');
const Patient = require('../models/Patient');
const Optometrist = require('../models/Optometrist');
const Appointment = require('../models/Appointment');
const VisitRecord = require('../models/VisitRecord');
const Waitlist = require('../models/Waitlist');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const { toCsv } = require('../utils/csv');

// Admin-only read-only endpoints. Router-level middleware guarantees
// `protect + authorize('admin')`, so these handlers do not need to
// re-check role. Every query is read-only — no writes, no deletes.

const isoStamp = () => new Date().toISOString().replace(/[:.]/g, '-');
const ymd = () => new Date().toISOString().slice(0, 10);

const setAttachment = (res, contentType, filename) => {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
};

const fmtDateOnly = (d) =>
  d ? new Date(d).toISOString().slice(0, 10) : '';

const fullName = (p) =>
  p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : '';

// ---------- Export All Data ----------
// Domain bundle. Excludes Users + Notifications because they carry
// sensitive auth / messaging data the spec asked us to keep out of the
// general export.
exports.exportAllJson = asyncHandler(async (req, res) => {
  const [patients, optometrists, appointments, visitRecords, waitlist] =
    await Promise.all([
      Patient.find().lean(),
      Optometrist.find().lean(),
      Appointment.find().populate('patient optometrist').lean(),
      VisitRecord.find().populate('appointment patient optometrist').lean(),
      Waitlist.find().populate('patient optometrist').lean(),
    ]);

  const payload = {
    generatedAt: new Date().toISOString(),
    type: 'optibook-export',
    counts: {
      patients: patients.length,
      optometrists: optometrists.length,
      appointments: appointments.length,
      visitRecords: visitRecords.length,
      waitlist: waitlist.length,
    },
    patients,
    optometrists,
    appointments,
    visitRecords,
    waitlist,
  };

  setAttachment(
    res,
    'application/json',
    `optibook-export-${isoStamp()}.json`,
  );
  res.send(JSON.stringify(payload, null, 2));
});

// ---------- Backup Database ----------
// Full snapshot. Includes Users with `password` stripped via
// `.select('-password')`. Notifications are included so a backup can
// restore message history. Still read-only.
exports.backupJson = asyncHandler(async (req, res) => {
  const [
    users,
    patients,
    optometrists,
    appointments,
    visitRecords,
    waitlist,
    notifications,
  ] = await Promise.all([
    User.find().select('-password').lean(),
    Patient.find().lean(),
    Optometrist.find().lean(),
    Appointment.find().lean(),
    VisitRecord.find().lean(),
    Waitlist.find().lean(),
    Notification.find().lean(),
  ]);

  const payload = {
    generatedAt: new Date().toISOString(),
    type: 'optibook-backup',
    counts: {
      users: users.length,
      patients: patients.length,
      optometrists: optometrists.length,
      appointments: appointments.length,
      visitRecords: visitRecords.length,
      waitlist: waitlist.length,
      notifications: notifications.length,
    },
    users,
    patients,
    optometrists,
    appointments,
    visitRecords,
    waitlist,
    notifications,
  };

  setAttachment(
    res,
    'application/json',
    `optibook-backup-${isoStamp()}.json`,
  );
  res.send(JSON.stringify(payload, null, 2));
});

// ---------- Reports (CSV) ----------
const APPOINTMENT_COLUMNS = [
  { header: 'Date', get: (a) => fmtDateOnly(a.date) },
  { header: 'Start time', get: (a) => a.startTime || '' },
  { header: 'End time', get: (a) => a.endTime || '' },
  { header: 'Duration (min)', get: (a) => a.duration || '' },
  { header: 'Status', get: (a) => a.status || '' },
  { header: 'Type', get: (a) => a.appointmentType || '' },
  {
    header: 'Patient #',
    get: (a) => (a.patient && a.patient.patientNumber) || '',
  },
  { header: 'Patient', get: (a) => fullName(a.patient) },
  { header: 'Optometrist', get: (a) => fullName(a.optometrist) },
  { header: 'Room', get: (a) => a.roomNumber || '' },
];

exports.reportAppointmentsCsv = asyncHandler(async (req, res) => {
  const appointments = await Appointment.find()
    .populate('patient optometrist')
    .sort({ date: -1, startTime: -1 })
    .lean();

  const csv = toCsv(APPOINTMENT_COLUMNS, appointments);
  setAttachment(res, 'text/csv', `optibook-appointments-${ymd()}.csv`);
  res.send(csv);
});

exports.reportCancellationsCsv = asyncHandler(async (req, res) => {
  const appointments = await Appointment.find({
    status: { $in: ['cancelled', 'no-show'] },
  })
    .populate('patient optometrist')
    .sort({ date: -1, startTime: -1 })
    .lean();

  const csv = toCsv(APPOINTMENT_COLUMNS, appointments);
  setAttachment(
    res,
    'text/csv',
    `optibook-cancellations-${ymd()}.csv`,
  );
  res.send(csv);
});

exports.reportWorkloadCsv = asyncHandler(async (req, res) => {
  const optoms = await Optometrist.find().lean();
  const counts = await Appointment.aggregate([
    {
      $group: {
        _id: { optometrist: '$optometrist', status: '$status' },
        count: { $sum: 1 },
      },
    },
  ]);

  // Build optometristId -> { total, completed, cancelled, noShow, scheduled }
  const tally = new Map();
  for (const o of optoms) {
    tally.set(String(o._id), {
      total: 0,
      completed: 0,
      cancelled: 0,
      noShow: 0,
      scheduled: 0,
      inProgress: 0,
    });
  }
  for (const row of counts) {
    const key = String(row._id.optometrist);
    if (!tally.has(key)) continue;
    const t = tally.get(key);
    t.total += row.count;
    if (row._id.status === 'completed') t.completed = row.count;
    else if (row._id.status === 'cancelled') t.cancelled = row.count;
    else if (row._id.status === 'no-show') t.noShow = row.count;
    else if (row._id.status === 'scheduled') t.scheduled = row.count;
    else if (row._id.status === 'in-progress') t.inProgress = row.count;
  }

  const rows = optoms.map((o) => {
    const t = tally.get(String(o._id)) || {};
    return {
      name: fullName(o),
      specialty: o.specialty || '',
      room: o.roomNumber || '',
      total: t.total || 0,
      completed: t.completed || 0,
      scheduled: t.scheduled || 0,
      inProgress: t.inProgress || 0,
      cancelled: t.cancelled || 0,
      noShow: t.noShow || 0,
    };
  });

  const csv = toCsv(
    [
      { header: 'Optometrist', get: (r) => r.name },
      { header: 'Specialty', get: (r) => r.specialty },
      { header: 'Room', get: (r) => r.room },
      { header: 'Total appointments', get: (r) => r.total },
      { header: 'Completed', get: (r) => r.completed },
      { header: 'Scheduled', get: (r) => r.scheduled },
      { header: 'In progress', get: (r) => r.inProgress },
      { header: 'Cancelled', get: (r) => r.cancelled },
      { header: 'No-show', get: (r) => r.noShow },
    ],
    rows,
  );

  setAttachment(res, 'text/csv', `optibook-workload-${ymd()}.csv`);
  res.send(csv);
});

exports.reportPatientsCsv = asyncHandler(async (req, res) => {
  const patients = await Patient.find().sort({ patientNumber: 1 }).lean();

  const csv = toCsv(
    [
      { header: 'Patient #', get: (p) => p.patientNumber || '' },
      { header: 'First name', get: (p) => p.firstName || '' },
      { header: 'Last name', get: (p) => p.lastName || '' },
      { header: 'Date of birth', get: (p) => fmtDateOnly(p.dateOfBirth) },
      { header: 'Phone', get: (p) => p.phone || '' },
      { header: 'Language', get: (p) => p.languagePreference || '' },
      { header: 'Visit count', get: (p) => p.visitCount || 0 },
      // Phase R5b: split recall columns. Legacy `nextRecallDate` is no
      // longer surfaced in the report; the two typed columns are the
      // authoritative source going forward.
      {
        header: 'Eye test recall',
        get: (p) => fmtDateOnly(p.eyeTestRecallDate),
      },
      {
        header: 'Contact lens recall',
        get: (p) => fmtDateOnly(p.contactLensRecallDate),
      },
    ],
    patients,
  );

  setAttachment(res, 'text/csv', `optibook-patients-${ymd()}.csv`);
  res.send(csv);
});
