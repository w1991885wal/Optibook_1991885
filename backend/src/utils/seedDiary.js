// seedDiary.js — fills the diary for the current week + next week
// with appointments spread across all 3 optometrists.
// Idempotent: skips slots that already have an appointment.
// Run with: node src/utils/seedDiary.js

const mongoose = require('mongoose');
require('dotenv').config();
const Optometrist = require('../models/Optometrist');
const Patient     = require('../models/Patient');
const Appointment = require('../models/Appointment');

const TYPES = [
  'Standard Eye Test', 'Contact Lens Fitting', 'Follow-up Consultation',
  'Prescription Update', 'Children\'s Eye Exam', 'Contact Lens Follow-up',
  'Comprehensive Eye Exam', 'Eye Test',
];
const SLOTS = ['09:00','09:30','10:00','10:30','11:00','11:30',
               '13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30'];
const STATUSES = ['scheduled','scheduled','scheduled','confirmed','confirmed','completed','no-show'];
const RISK_SCORES = [0.12, 0.18, 0.25, 0.38, 0.45, 0.55, 0.62, 0.71, 0.78, 0.85];

function getWeekDays(offsetWeeks = 0) {
  const days = [];
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + offsetWeeks * 7);
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

function pick(arr, i) { return arr[i % arr.length]; }

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.');

  const optoms   = await Optometrist.find({});
  const patients = await Patient.find({}).limit(80);

  if (!optoms.length || !patients.length) {
    console.error('No optometrists or patients found. Run seed:demo first.');
    process.exit(1);
  }

  const days = [...getWeekDays(0), ...getWeekDays(1), ...getWeekDays(-1)];
  let created = 0, skipped = 0, pidx = 0;

  for (const day of days) {
    for (const optom of optoms) {
      for (let s = 0; s < SLOTS.length; s++) {
        const startTime = SLOTS[s];
        // Skip lunch
        if (startTime === '12:00' || startTime === '12:30') continue;

        // Check if slot taken
        const exists = await Appointment.findOne({
          optometrist: optom._id,
          date: day,
          startTime,
        });
        if (exists) { skipped++; continue; }

        // Leave ~20% slots free so diary isn't 100% packed
        if (Math.random() < 0.2) continue;

        const patient = patients[pidx % patients.length];
        pidx++;

        const riskScore = RISK_SCORES[Math.floor(Math.random() * RISK_SCORES.length)];
        const status = pick(STATUSES, Math.floor(Math.random() * STATUSES.length));

        // Past days get completed/no-show; future days get scheduled/confirmed
        const isPast = day < new Date();
        const finalStatus = isPast
          ? (Math.random() < 0.85 ? 'completed' : 'no-show')
          : (Math.random() < 0.6 ? 'scheduled' : 'confirmed');

        await Appointment.create({
          patient:     patient._id,
          optometrist: optom._id,
          appointmentType: pick(TYPES, s + optoms.indexOf(optom)),
          date:        day,
          startTime,
          endTime:     SLOTS[s + 1] || '17:00',
          duration:    30,
          status:      finalStatus,
          noShowRiskScore:    riskScore,
          compatibilityScore: Math.round(55 + Math.random() * 45),
          smartAllocated:     Math.random() < 0.7,
          createdViaSmartBooking: Math.random() < 0.7,
          roomNumber:  `Room ${(optoms.indexOf(optom) % 3) + 1}`,
        });
        created++;
      }
    }
  }

  console.log(`✓ Created ${created} appointments, skipped ${skipped} existing slots.`);
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
