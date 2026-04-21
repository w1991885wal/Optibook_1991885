const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    optometrist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Optometrist",
      required: true,
    },
    appointmentType: {
      type: String,
      enum: [
        "Comprehensive Eye Exam",
        "Contact Lens Fitting",
        "Follow-up Consultation",
        "Prescription Update",
        "Eye Emergency",
        "Children's Eye Exam",
        "Standard Eye Test",
        "Contact Lens Fitting",
        "Contact Lens Follow-up",
        "PCO Test",
        "PCO Test + Eye Test",
        "Other",
      ],
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
    },
    duration: {
      type: Number,
      default: 30,
    },
    status: {
      type: String,
      enum: ["scheduled", "confirmed", "completed", "cancelled", "no-show"],
      default: "scheduled",
    },
    notes: {
      type: String,
    },
    specialRequirements: {
      type: String,
    },
    roomNumber: {
      type: String,
    },
    smartAllocated: {
      type: Boolean,
      default: false,
    },
    createdViaSmartBooking: {
      type: Boolean,
      default: false,
    },
    noShowRiskScore: {
      type: Number,
      default: null,
    },
    compatibilityScore: {
      type: Number,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    visitRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VisitRecord",
    },
  },
  {
    timestamps: true,
  },
);

// Query-performance indexes.
// Note: an older unique compound index {optometrist:1, date:1, startTime:1}
// may exist in Atlas from a previous schema. Double-booking is now enforced
// by the conflict-detection utility in the controller, not by a unique index.
appointmentSchema.index({ optometrist: 1, date: 1, status: 1 });
appointmentSchema.index({ patient: 1, date: 1 });

module.exports = mongoose.model("Appointment", appointmentSchema);
