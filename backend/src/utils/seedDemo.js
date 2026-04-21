// Rich demo seed — populates the DB with enough history for the analytics
// dashboard, diary and AI-insight charts to look populated during a demo.
//
// Run with:  npm run seed:demo
//
// Clears Users / Patients / Optometrists / Appointments / Waitlist.
// Leaves VisitRecord untouched.

const mongoose = require('mongoose');
const moment = require('moment');
require('dotenv').config();

const User = require('../models/User');
const Patient = require('../models/Patient');
const Optometrist = require('../models/Optometrist');
const Appointment = require('../models/Appointment');
const Waitlist = require('../models/Waitlist');

const APPOINTMENT_TYPES = [
  'Standard Eye Test',
  'Comprehensive Eye Exam',
  'Contact Lens Fitting',
  'Contact Lens Follow-up',
  'Follow-up Consultation',
  "Children's Eye Exam",
  'PCO Test',
  'PCO Test + Eye Test',
];

const STATUS_WEIGHTS_PAST = [
  // [status, weight]
  ['completed', 60],
  ['no-show', 10],
  ['cancelled', 12],
  ['confirmed', 8],
  ['scheduled', 10],
];

const pickWeighted = (pairs) => {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [v, w] of pairs) {
    r -= w;
    if (r <= 0) return v;
  }
  return pairs[0][0];
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.random() * (max - min) + min;
const round2 = (n) => Math.round(n * 100) / 100;

const connectURI = process.env.MONGODB_URI;
if (!connectURI) {
  console.error('MONGODB_URI missing from env.');
  process.exit(1);
}

async function run() {
  await mongoose.connect(connectURI);

  // --- clear ---
  await Promise.all([
    User.deleteMany({}),
    Patient.deleteMany({}),
    Optometrist.deleteMany({}),
    Appointment.deleteMany({}),
    Waitlist.deleteMany({}),
  ]);
  console.log('✓ Cleared collections');

  // --- users ---
  const admin = await User.create({
    email: 'admin@optibook.com',
    password: 'password123',
    role: 'admin',
  });

  const optomUsers = await User.create([
    { email: 'emma.wilson@optibook.com', password: 'password123', role: 'optometrist' },
    { email: 'james.chen@optibook.com', password: 'password123', role: 'optometrist' },
    { email: 'sarah.miller@optibook.com', password: 'password123', role: 'optometrist' },
  ]);

  const patientUsers = await User.create([
    { email: 'sarah.j@email.com', password: 'password123', role: 'patient' },
    { email: 'david.k@email.com', password: 'password123', role: 'patient' },
    { email: 'ayesha.r@email.com', password: 'password123', role: 'patient' },
    { email: 'liam.t@email.com', password: 'password123', role: 'patient' },
  ]);
  console.log('✓ Users created');

  // --- optometrists ---
  const workingWeek = {
    monday: { start: '09:00', end: '17:00', working: true },
    tuesday: { start: '09:00', end: '17:00', working: true },
    wednesday: { start: '09:00', end: '17:00', working: true },
    thursday: { start: '09:00', end: '17:00', working: true },
    friday: { start: '09:00', end: '17:00', working: true },
    saturday: { start: '09:00', end: '13:00', working: true },
    sunday: { start: '09:00', end: '13:00', working: false },
  };

  const optoms = await Optometrist.create([
    {
      user: optomUsers[0]._id,
      firstName: 'Emma',
      lastName: 'Wilson',
      specialty: 'General',
      languages: ['English'],
      roomNumber: 'Room 1',
      yearsExperience: 6,
      workingHours: workingWeek,
      maxAppointmentsPerDay: 14,
    },
    {
      user: optomUsers[1]._id,
      firstName: 'James',
      lastName: 'Chen',
      specialty: 'Contact Lens',
      languages: ['English'],
      roomNumber: 'Room 2',
      yearsExperience: 9,
      workingHours: workingWeek,
      maxAppointmentsPerDay: 12,
    },
    {
      user: optomUsers[2]._id,
      firstName: 'Sarah',
      lastName: 'Miller',
      specialty: 'Pediatric',
      languages: ['English', 'Urdu'],
      roomNumber: 'Room 3',
      yearsExperience: 4,
      workingHours: workingWeek,
      maxAppointmentsPerDay: 10,
    },
  ]);
  console.log('✓ Optometrists created');

  // --- patients ---
  const patients = await Patient.create([
    {
      user: patientUsers[0]._id,
      firstName: 'Sarah',
      lastName: 'Johnson',
      dateOfBirth: new Date('1988-05-15'),
      phone: '+44 7700 900123',
      address: '12 High Street, London',
      languagePreference: 'English',
      visitCount: 8,
      attendanceRate: 95,
    },
    {
      user: patientUsers[1]._id,
      firstName: 'David',
      lastName: 'Kumar',
      dateOfBirth: new Date('1955-02-10'),
      phone: '+44 7700 900456',
      address: '5 Park Avenue, Manchester',
      languagePreference: 'English',
      visitCount: 14,
      attendanceRate: 88,
    },
    {
      user: patientUsers[2]._id,
      firstName: 'Ayesha',
      lastName: 'Rahman',
      dateOfBirth: new Date('1992-11-03'),
      phone: '+44 7700 900789',
      address: '88 Oak Road, Birmingham',
      languagePreference: 'Urdu',
      visitCount: 5,
      attendanceRate: 70,
    },
    {
      user: patientUsers[3]._id,
      firstName: 'Liam',
      lastName: 'Taylor',
      dateOfBirth: new Date('2017-07-22'),
      phone: '+44 7700 900321',
      address: '22 Elm Close, Leeds',
      languagePreference: 'English',
      visitCount: 2,
      attendanceRate: 100,
    },
  ]);
  console.log('✓ Patients created');

  // --- appointments ---
  // Generate ~70 past appointments over the last 60 days plus today + upcoming.
  const appts = [];
  const hours = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
                 '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'];

  const PAST_DAYS = 55;
  const PAST_TARGET = 60;

  for (let i = 0; i < PAST_TARGET; i++) {
    const daysAgo = Math.floor(Math.random() * PAST_DAYS) + 1;
    const d = moment().subtract(daysAgo, 'days').startOf('day');
    // Skip Sundays entirely.
    if (d.day() === 0) continue;

    const optom = pick(optoms);
    const patient = pick(patients);
    const type = pick(APPOINTMENT_TYPES);
    const status = pickWeighted(STATUS_WEIGHTS_PAST);
    const startTime = pick(hours);
    const smart = Math.random() < 0.5;

    // Scores: push no-show rows towards higher risk so predicted-vs-actual is meaningful.
    const baseRisk = status === 'no-show' ? rand(0.55, 0.9) : rand(0.05, 0.45);
    const baseCompat = smart ? rand(72, 95) : rand(55, 85);

    appts.push({
      patient: patient._id,
      optometrist: optom._id,
      appointmentType: type,
      date: d.toDate(),
      startTime,
      endTime: moment(startTime, 'HH:mm').add(30, 'minutes').format('HH:mm'),
      duration: 30,
      status,
      roomNumber: optom.roomNumber,
      createdBy: patient.user,
      createdViaSmartBooking: smart,
      noShowRiskScore: round2(baseRisk),
      compatibilityScore: Math.round(baseCompat),
    });
  }

  // Today: put one appointment per optometrist so the dashboard "today" KPIs are non-zero.
  const todayHours = ['10:00', '11:30', '14:30'];
  optoms.forEach((o, idx) => {
    const patient = patients[idx % patients.length];
    const type = idx === 2 ? "Children's Eye Exam"
               : idx === 1 ? 'Contact Lens Fitting'
               : 'Standard Eye Test';
    appts.push({
      patient: patient._id,
      optometrist: o._id,
      appointmentType: type,
      date: moment().startOf('day').toDate(),
      startTime: todayHours[idx],
      endTime: moment(todayHours[idx], 'HH:mm').add(30, 'minutes').format('HH:mm'),
      duration: 30,
      status: 'scheduled',
      roomNumber: o.roomNumber,
      createdBy: patient.user,
      createdViaSmartBooking: true,
      noShowRiskScore: round2(rand(0.1, 0.3)),
      compatibilityScore: Math.round(rand(80, 95)),
    });
  });

  // Upcoming: a few future appointments across the next 7 days for the diary.
  for (let i = 0; i < 8; i++) {
    const dayAhead = Math.floor(Math.random() * 7) + 1;
    const d = moment().add(dayAhead, 'days').startOf('day');
    if (d.day() === 0) continue;
    const optom = pick(optoms);
    const patient = pick(patients);
    const startTime = pick(hours);
    appts.push({
      patient: patient._id,
      optometrist: optom._id,
      appointmentType: pick(APPOINTMENT_TYPES),
      date: d.toDate(),
      startTime,
      endTime: moment(startTime, 'HH:mm').add(30, 'minutes').format('HH:mm'),
      duration: 30,
      status: 'scheduled',
      roomNumber: optom.roomNumber,
      createdBy: patient.user,
      createdViaSmartBooking: Math.random() < 0.5,
      noShowRiskScore: round2(rand(0.1, 0.4)),
      compatibilityScore: Math.round(rand(70, 95)),
    });
  }

  // De-dupe collisions on (optometrist, date, startTime) — crude but effective.
  const seen = new Set();
  const unique = appts.filter((a) => {
    const k = `${a.optometrist}|${moment(a.date).format('YYYY-MM-DD')}|${a.startTime}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  await Appointment.insertMany(unique);
  console.log(`✓ ${unique.length} appointments created`);

  // --- waitlist ---
  await Waitlist.create([
    {
      patient: patients[2]._id,
      optometrist: optoms[1]._id,
      appointmentType: 'Contact Lens Fitting',
      priority: 'high',
      status: 'active',
      preferredDates: [moment().add(2, 'days').toDate()],
    },
    {
      patient: patients[0]._id,
      optometrist: optoms[0]._id,
      appointmentType: 'Standard Eye Test',
      priority: 'medium',
      status: 'active',
    },
  ]);
  console.log('✓ Waitlist seeded');

  console.log('\n✅ Demo seed complete.');
  console.log('\nLogin credentials (all password: password123):');
  console.log('  Admin         admin@optibook.com');
  console.log('  Optometrist   emma.wilson@optibook.com   (General)');
  console.log('  Optometrist   james.chen@optibook.com    (Contact Lens)');
  console.log('  Optometrist   sarah.miller@optibook.com  (Pediatric)');
  console.log('  Patient       sarah.j@email.com');
  console.log('  Patient       david.k@email.com          (senior)');
  console.log('  Patient       ayesha.r@email.com         (Urdu preference)');
  console.log('  Patient       liam.t@email.com           (child)');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
