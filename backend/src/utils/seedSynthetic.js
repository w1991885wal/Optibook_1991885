// OptiBook — additive synthetic patient seed.
//
// Adds 50 patients to the database without clearing any collection.
// Idempotent: re-running skips emails that already exist. Deterministic
// via Mulberry32 (seed = 2026; distinct from the AI seed = 42).
//
// Run with:  npm run seed:synthetic
//
// Touches only Users + Patients. Does NOT create appointments or reviews.

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Patient = require('../models/Patient');
const { getNextPatientNumber } = require('./patientNumber');

const SEED = 2026;
const COUNT = 50;
const PASSWORD = 'password123';

const FIRST_NAMES_M = [
  'James', 'Oliver', 'Harry', 'George', 'Noah', 'Jack', 'Leo', 'Oscar',
  'Charlie', 'Muhammad', 'Arthur', 'Henry', 'Theodore', 'Freddie', 'Alfie',
  'Liam', 'Theo', 'Jacob', 'Edward', 'Daniel',
];
const FIRST_NAMES_F = [
  'Olivia', 'Amelia', 'Isla', 'Ava', 'Mia', 'Lily', 'Sophia', 'Emily',
  'Grace', 'Ella', 'Charlotte', 'Florence', 'Evie', 'Isabella', 'Willow',
  'Aisha', 'Layla', 'Maryam', 'Hannah', 'Chloe',
];
const LAST_NAMES = [
  'Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson',
  'Davies', 'Robinson', 'Wright', 'Thompson', 'Evans', 'Walker', 'White',
  'Roberts', 'Green', 'Hall', 'Wood', 'Jackson', 'Clarke', 'Patel', 'Khan',
  'Hussain', 'Ahmed', 'Begum',
];
const LANGUAGES = ['English', 'Urdu', 'Punjabi', 'Arabic'];
// Skewed toward English so most patients match the optoms' default language.
const LANGUAGE_WEIGHTS = [70, 14, 8, 8];
const STREETS = [
  'High Street', 'Church Lane', 'Park Road', 'Manor Way', 'Victoria Road',
  'Queens Avenue', 'Mill Lane', 'Station Road', 'The Crescent', 'Oak Avenue',
];
const CITIES = ['London', 'Manchester', 'Birmingham', 'Leeds', 'Bristol'];

// --- Mulberry32 PRNG (matches the AI synthetic-data generator pattern) ---
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function pickWeighted(rng, items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i += 1) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function ageBucket(rng) {
  const r = rng();
  if (r < 0.18) return 'child';   // 18% children
  if (r < 0.80) return 'adult';   // 62% adults
  return 'senior';                // 20% seniors
}
function dobFor(rng, bucket) {
  const today = new Date();
  let years;
  if (bucket === 'child') years = 4 + Math.floor(rng() * 14);   // 4-17
  else if (bucket === 'senior') years = 65 + Math.floor(rng() * 25); // 65-89
  else years = 18 + Math.floor(rng() * 47);                     // 18-64
  const days = Math.floor(rng() * 365);
  const d = new Date(today);
  d.setFullYear(today.getFullYear() - years);
  d.setDate(d.getDate() - days);
  return d;
}
function ukMobile(rng) {
  let n = '07';
  for (let i = 0; i < 9; i += 1) n += Math.floor(rng() * 10);
  return `${n.slice(0, 5)} ${n.slice(5)}`;
}
function preferredTimes(rng, bucket) {
  // Children typically prefer after-school slots; adults the early/late edges;
  // seniors the mid-day window. Stored as HH:mm strings matching the
  // appointment slot format used elsewhere.
  if (bucket === 'child') return rng() < 0.5 ? ['15:30', '16:00'] : [];
  if (bucket === 'senior') return rng() < 0.4 ? ['10:00', '11:00'] : [];
  return rng() < 0.3 ? ['09:00', '17:00'] : [];
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI missing from environment.');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log(`Connected. Adding ${COUNT} synthetic patients (seed=${SEED}).`);

  const rng = mulberry32(SEED);
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < COUNT; i += 1) {
    // Critical: drain the RNG identically every iteration regardless of
    // whether we end up skipping. Generating all fields BEFORE the
    // existence check keeps the seed deterministic across re-runs.
    const isMale = rng() < 0.5;
    const first = pick(rng, isMale ? FIRST_NAMES_M : FIRST_NAMES_F);
    const last = pick(rng, LAST_NAMES);
    const bucket = ageBucket(rng);
    const dob = dobFor(rng, bucket);
    const phone = ukMobile(rng);
    const language = pickWeighted(rng, LANGUAGES, LANGUAGE_WEIGHTS);
    const houseNo = 1 + Math.floor(rng() * 200);
    const address = `${houseNo} ${pick(rng, STREETS)}, ${pick(rng, CITIES)}, UK`;
    const prefs = preferredTimes(rng, bucket);
    const ordinal = String(i + 1).padStart(3, '0');
    const email = `${first.toLowerCase()}.${last.toLowerCase()}.${ordinal}@example.com`;

    const existing = await User.findOne({ email });
    if (existing) {
      skipped += 1;
      continue;
    }

    const user = await User.create({ email, password: PASSWORD, role: 'patient' });
    const patientNumber = await getNextPatientNumber();
    await Patient.create({
      user: user._id,
      patientNumber,
      firstName: first,
      lastName: last,
      dateOfBirth: dob,
      phone,
      address,
      languagePreference: language,
      preferredTimes: prefs,
    });
    created += 1;
  }

  console.log(`✓ Done — created ${created}, skipped ${skipped} (already existed).`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('seed:synthetic failed:', err);
  process.exit(1);
});
