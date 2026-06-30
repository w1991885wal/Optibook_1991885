// seedReviews.js — seeds reviews for completed appointments
// Run with: node src/utils/seedReviews.js

const mongoose = require('mongoose');
require('dotenv').config();

require('../models/User');
require('../models/Patient');
require('../models/Optometrist');
const Appointment = require('../models/Appointment');
const Review = require('../models/Review');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.');

  const appts = await Appointment.find({ status: 'completed' }).limit(30);
  console.log(`Found ${appts.length} completed appointments.`);

  let created = 0;
  for (const appt of appts) {
    const exists = await Review.findOne({ appointment: appt._id });
    if (exists) continue;

    const ratings = Array.from({ length: 5 }, () => {
      const raw = 3.5 + Math.random() * 1.5;
      return Math.round(raw * 2) / 2;
    });
    const avg = Math.round((ratings.reduce((a, b) => a + b, 0) / 5) * 2) / 2;

    await Review.create({
      appointment: appt._id,
      patient:     appt.patient,
      optometrist: appt.optometrist,
      ratings,
      averageRating: avg,
    });
    created++;
  }

  console.log(`✓ Created ${created} reviews.`);
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
