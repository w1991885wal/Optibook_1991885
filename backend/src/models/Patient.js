const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Phase D2b: user-facing display number. Mongo _id remains the relational
    // key for every other collection; patientNumber is for human-readable IDs
    // and search only. Assigned on registration and by a one-shot startup
    // backfill in createdAt order. Not enforced unique at schema level so the
    // backfill cannot crash on legacy duplicates; uniqueness is enforced by
    // the assignment logic in utils/patientNumber.js.
    patientNumber: {
      type: Number,
      index: true,
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: [false, "Date of birth is required"],
    },
    phone: {
      type: String,
      required: [false, "Phone number is required"],
    },
    address: {
      type: String,
    },
    languagePreference: {
      type: String,
      enum: ["English", "Urdu", "Punjabi", "Arabic"],
      default: "English",
    },
    accessibilityNeeds: {
      type: String,
    },
    preferredTimes: {
      type: [String],
      default: [],
    },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      calendarSync: { type: Boolean, default: false },
    },
    visitCount: {
      type: Number,
      default: 0,
    },
    attendanceRate: {
      type: Number,
      default: 100,
    },
    // Legacy single recall field. Phase R1 keeps writing to this alongside
    // the two new typed fields below so existing UI keeps working unchanged.
    // Slated for removal in Phase R5 once all readers have migrated.
    nextRecallDate: {
      type: Date,
    },
    // Phase R1: split recall tracking. Each is independently optional.
    eyeTestRecallDate: {
      type: Date,
    },
    contactLensRecallDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Patient", patientSchema);
