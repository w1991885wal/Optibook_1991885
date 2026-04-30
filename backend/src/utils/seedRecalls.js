// One-shot script: patches existing patients with split recall dates.
// Run with: node src/utils/seedRecalls.js
// Safe to re-run — skips patients that already have both typed fields set.

const mongoose = require('mongoose');
require('dotenv').config();
const Patient = require('../models/Patient');

function addDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.');

  const patients = await Patient.find({}).limit(60);
  const today = new Date();
  let updated = 0;

  const patterns = [
    // overdue eye test, no CL
    { eye: -90,  cl: null },
    // overdue both
    { eye: -60,  cl: -30  },
    // eye test overdue, CL upcoming
    { eye: -14,  cl: 45   },
    // both due soon (within 30 days)
    { eye: 10,   cl: 20   },
    // eye test upcoming, no CL
    { eye: 25,   cl: null },
    // both upcoming
    { eye: 40,   cl: 60   },
    // far future
    { eye: 120,  cl: 180  },
    // overdue CL only
    { eye: null, cl: -45  },
  ];

  for (let i = 0; i < patients.length; i++) {
    const p = patients[i];
    if (p.eyeTestRecallDate && p.contactLensRecallDate) { continue; }

    const pat = patterns[i % patterns.length];
    const eyeDate  = pat.eye  != null ? addDays(today, pat.eye)  : undefined;
    const clDate   = pat.cl   != null ? addDays(today, pat.cl)   : undefined;
    const legacyDate = eyeDate || clDate;

    await Patient.findByIdAndUpdate(p._id, {
      ...(eyeDate  && { eyeTestRecallDate: eyeDate }),
      ...(clDate   && { contactLensRecallDate: clDate }),
      ...(legacyDate && { nextRecallDate: legacyDate }),
    });
    updated++;
  }

  console.log(`✓ Patched ${updated} patients with recall dates.`);
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
