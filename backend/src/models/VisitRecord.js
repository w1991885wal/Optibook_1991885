const mongoose = require('mongoose');

const visitRecordSchema = new mongoose.Schema({
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  optometrist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Optometrist',
    required: true
  },
  diagnosis: String,
  prescription: String,
  notes: String,
  // Legacy single recall field — kept for Phase R1 backward compatibility.
  // Slated for removal in Phase R5.
  nextRecallDate: Date,
  // Phase R1: split recall tracking on the visit record itself so per-visit
  // history can show which type(s) were set. recallType is informational —
  // it reflects which recall the optom emphasised at this visit; the
  // dedicated date fields hold the truth.
  recallType: {
    type: String,
    enum: ['eye-test', 'contact-lens'],
  },
  eyeTestRecallDate: Date,
  contactLensRecallDate: Date,
  visitDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('VisitRecord', visitRecordSchema);
