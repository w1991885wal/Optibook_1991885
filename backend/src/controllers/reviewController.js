const mongoose = require('mongoose');
const Review = require('../models/Review');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Optometrist = require('../models/Optometrist');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// Resolve the signed-in patient's profile from req.user.
const resolveOwnPatient = async (req) => {
  const own = await Patient.findOne({ user: req.user._id });
  if (!own) throw new ApiError(404, 'Patient profile not found');
  return own;
};

const round2 = (n) => Math.round(n * 100) / 100;

// Phase Reviews-Backend — POST /api/reviews
// Patient creates a review for one of their own completed appointments.
// Three layers of duplicate protection apply here:
//   Layer 1 — schema `unique: true` on `appointment` (database-enforced)
//   Layer 2 — controller pre-check (clean UX, returns 409 explicitly)
//   Layer 3 — race-safe E11000 catch (handles concurrent requests)
exports.createReview = asyncHandler(async (req, res) => {
  const { appointmentId, ratings, comment } = req.body;

  // Layer 2 — appointment exists.
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) throw new ApiError(404, 'Appointment not found');

  // Layer 2 — signed-in patient owns the appointment.
  // Ownership check runs before state check so an attacker can't
  // distinguish "this appointment exists but isn't yours" from
  // "this appointment exists, is yours, but isn't completed".
  const own = await resolveOwnPatient(req);
  if (!appointment.patient || !appointment.patient.equals(own._id)) {
    throw new ApiError(403, 'You can only review your own appointments');
  }

  // Layer 2 — appointment is completed.
  if (appointment.status !== 'completed') {
    throw new ApiError(400, 'Only completed appointments can be reviewed');
  }

  // Layer 2 — duplicate pre-check.
  const existing = await Review.findOne({ appointment: appointment._id });
  if (existing) {
    throw new ApiError(409, 'This appointment has already been reviewed');
  }

  // Server-side average. Any client-supplied average is ignored.
  const numericRatings = ratings.map((v) => Number(v));
  const averageRating = round2(
    numericRatings.reduce((a, b) => a + b, 0) / numericRatings.length,
  );

  try {
    const review = await Review.create({
      appointment: appointment._id,
      patient: own._id,
      optometrist: appointment.optometrist,
      ratings: numericRatings,
      averageRating,
      comment: comment || undefined,
    });
    return res.status(201).json({ success: true, data: review });
  } catch (err) {
    // Layer 3 — race-safe duplicate catch.
    if (err && err.code === 11000) {
      throw new ApiError(409, 'This appointment has already been reviewed');
    }
    throw err;
  }
});

// GET /api/reviews/appointment/:appointmentId
// Patient checks their own review for this appointment (or null).
exports.getMyReviewForAppointment = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) throw new ApiError(404, 'Appointment not found');

  const own = await resolveOwnPatient(req);
  if (!appointment.patient || !appointment.patient.equals(own._id)) {
    throw new ApiError(403, 'You can only view your own reviews');
  }

  const review = await Review.findOne({ appointment: appointment._id });
  return res.json({ success: true, data: review || null });
});

// Internal helper — aggregate satisfaction summary for one optometrist.
const buildSummary = async (optometristId) => {
  const agg = await Review.aggregate([
    { $match: { optometrist: new mongoose.Types.ObjectId(optometristId) } },
    {
      $group: {
        _id: null,
        avg: { $avg: '$averageRating' },
        count: { $sum: 1 },
      },
    },
  ]);
  const row = agg[0];
  return {
    averageRating: row && row.count > 0 ? round2(row.avg) : null,
    count: row ? row.count : 0,
  };
};

// GET /api/reviews/optometrist/:optometristId/summary
// Admin or optometrist can read any optom's satisfaction summary.
exports.getOptometristSummary = asyncHandler(async (req, res) => {
  const { optometristId } = req.params;
  const data = await buildSummary(optometristId);
  return res.json({ success: true, data });
});

// GET /api/reviews/optometrist/me/summary
// Optometrist self-view.
exports.getMyOptometristSummary = asyncHandler(async (req, res) => {
  const optom = await Optometrist.findOne({ user: req.user._id });
  if (!optom) throw new ApiError(404, 'Optometrist profile not found');
  const data = await buildSummary(optom._id);
  return res.json({ success: true, data });
});
