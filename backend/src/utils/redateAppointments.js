// redateAppointments.js — shifts synthetic appointment dates so the demo
// diary looks current, without deleting anything (reviews and visit records
// keep their appointment references).
//
//   past bucket   (completed / no-show / cancelled) -> weekdays PAST_START..yesterday
//   future bucket (scheduled / confirmed)           -> weekdays FUTURE_START..FUTURE_END,
//                                                      weighted toward the first two weeks
//   in-progress                                     -> today
//
// Then guarantees every patient has at least one completed appointment with
// no review yet (creates one in the recent past if missing) so the patient
// review flow can be demonstrated from any account.
//
// Slot uniqueness per (optometrist, date, startTime) is guaranteed by a
// taken-set; startTime/endTime are reassigned from the standard slot grid.
// Run with: node src/utils/redateAppointments.js

const mongoose = require('mongoose');
require('dotenv').config();
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Optometrist = require('../models/Optometrist');
const Review = require('../models/Review');

const PAST_START = new Date(2025, 11, 1); // 1 Dec 2025
const FUTURE_START = new Date(2026, 6, 3); // 3 Jul 2026
const FUTURE_END = new Date(2026, 7, 15); // 15 Aug 2026

const SLOTS = ['09:00','09:30','10:00','10:30','11:00','11:30',
               '13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30'];

const TYPES = [
  'Standard Eye Test', 'Contact Lens Fitting', 'Follow-up Consultation',
  'Prescription Update', "Children's Eye Exam", 'Contact Lens Follow-up',
  'Comprehensive Eye Exam', 'Eye Test',
];

const endFor = (slot) => {
  const i = SLOTS.indexOf(slot);
  return i >= 0 && SLOTS[i + 1] ? SLOTS[i + 1] : '17:00';
};

function weekdaysBetween(start, end) {
  const days = [];
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  const stop = new Date(end);
  stop.setHours(0, 0, 0, 0);
  while (d <= stop) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

// Pick a free (day, slot) for this optometrist. Random with a dedupe set;
// falls back to a linear scan if random keeps colliding.
function assignSlot(taken, optomId, days, weightEarly) {
  for (let tries = 0; tries < 200; tries++) {
    let day;
    if (weightEarly && days.length > 10 && Math.random() < 0.7) {
      day = days[Math.floor(Math.random() * 10)];
    } else {
      day = days[Math.floor(Math.random() * days.length)];
    }
    const slot = SLOTS[Math.floor(Math.random() * SLOTS.length)];
    const key = `${optomId}|${day.toISOString()}|${slot}`;
    if (!taken.has(key)) {
      taken.add(key);
      return { day, slot };
    }
  }
  for (const day of days) {
    for (const slot of SLOTS) {
      const key = `${optomId}|${day.toISOString()}|${slot}`;
      if (!taken.has(key)) {
        taken.add(key);
        return { day, slot };
      }
    }
  }
  throw new Error('No free slot left — date range too small for appointment count');
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const pastDays = weekdaysBetween(PAST_START, yesterday);
  const futureDays = weekdaysBetween(FUTURE_START, FUTURE_END);

  // ---- Phase 1: redate every existing appointment ----
  const appts = await Appointment.find({}).select('_id optometrist status');
  const taken = new Set();
  const ops = [];
  let past = 0, future = 0, inProgress = 0;

  for (const appt of appts) {
    const optomId = String(appt.optometrist);
    let day, slot;

    if (appt.status === 'in-progress') {
      ({ day, slot } = assignSlot(taken, optomId, [today], false));
      inProgress++;
    } else if (['completed', 'no-show', 'cancelled'].includes(appt.status)) {
      ({ day, slot } = assignSlot(taken, optomId, pastDays, false));
      past++;
    } else {
      ({ day, slot } = assignSlot(taken, optomId, futureDays, true));
      future++;
    }

    ops.push({
      updateOne: {
        filter: { _id: appt._id },
        update: { $set: { date: day, startTime: slot, endTime: endFor(slot) } },
      },
    });
  }

  const res = await Appointment.bulkWrite(ops);
  console.log(`✓ Redated ${res.modifiedCount} appointments`);
  console.log(`  past   (${PAST_START.toDateString()} → ${yesterday.toDateString()}): ${past}`);
  console.log(`  future (${FUTURE_START.toDateString()} → ${FUTURE_END.toDateString()}): ${future}`);
  console.log(`  in-progress (today): ${inProgress}`);

  // ---- Phase 2: one review-pending completed appointment per patient ----
  const patients = await Patient.find({}).select('_id');
  const optoms = await Optometrist.find({}).select('_id');
  const reviewedIds = new Set(
    (await Review.find({}).select('appointment')).map((r) => String(r.appointment)),
  );
  const completed = await Appointment.find({ status: 'completed' }).select(
    '_id patient',
  );

  const patientsCovered = new Set();
  for (const a of completed) {
    if (!reviewedIds.has(String(a._id))) patientsCovered.add(String(a.patient));
  }

  // Recent past (last ~45 weekdays) so "leave a review" looks timely.
  const recentDays = pastDays.slice(-45);
  let created = 0;

  for (const p of patients) {
    if (patientsCovered.has(String(p._id))) continue;
    const optom = optoms[Math.floor(Math.random() * optoms.length)];
    const { day, slot } = assignSlot(taken, String(optom._id), recentDays, false);
    await Appointment.create({
      patient: p._id,
      optometrist: optom._id,
      appointmentType: TYPES[Math.floor(Math.random() * TYPES.length)],
      date: day,
      startTime: slot,
      endTime: endFor(slot),
      duration: 30,
      status: 'completed',
      noShowRiskScore: Math.round((0.1 + Math.random() * 0.5) * 100) / 100,
      compatibilityScore: Math.round(55 + Math.random() * 45),
      smartAllocated: true,
      createdViaSmartBooking: true,
      roomNumber: `Room ${Math.floor(Math.random() * 3) + 1}`,
    });
    created++;
  }

  console.log(`✓ Review-pending coverage: ${patientsCovered.size} patients already covered, ${created} completed appointments created`);
  console.log(`  total patients: ${patients.length}`);

  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
