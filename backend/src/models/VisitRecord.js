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
  nextRecallDate: Date,
  visitDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('VisitRecord', visitRecordSchema);
