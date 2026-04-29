const mongoose = require('mongoose');

// Phase Reviews-Backend.
// Layer 1 of duplicate protection: schema unique index on `appointment`.
// Even if every line of controller code were skipped, MongoDB rejects
// duplicates here. The controller adds a pre-check and a dup-key catch
// for clean UX and race safety; the schema is the foundational guard.

const ALLOWED_RATINGS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

const reviewSchema = new mongoose.Schema(
  {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true,
      index: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    optometrist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Optometrist',
      required: true,
      index: true,
    },
    ratings: {
      type: [Number],
      required: true,
      validate: [
        {
          validator: (arr) => Array.isArray(arr) && arr.length === 5,
          message: 'ratings must contain exactly 5 values',
        },
        {
          validator: (arr) =>
            arr.every((v) => ALLOWED_RATINGS.includes(Number(v))),
          message:
            'each rating must be one of 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5',
        },
      ],
    },
    averageRating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      maxlength: 500,
    },
  },
  { timestamps: true },
);

const Review = mongoose.model('Review', reviewSchema);
Review.ALLOWED_RATINGS = ALLOWED_RATINGS;

module.exports = Review;
