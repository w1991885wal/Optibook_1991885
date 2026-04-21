const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
    nextRecallDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Patient", patientSchema);
