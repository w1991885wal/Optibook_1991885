const mongoose = require('mongoose');

const optometristSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  specialty: {
    type: String,
    enum: ['General', 'Contact Lens', 'Pediatric', 'Senior'],
    default: 'General'
  },
  languages: {
    type: [String],
    default: ['English']
  },
  roomNumber: {
    type: String,
    required: true
  },
  yearsExperience: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  workingHours: {
    monday: { start: String, end: String, working: { type: Boolean, default: true } },
    tuesday: { start: String, end: String, working: { type: Boolean, default: true } },
    wednesday: { start: String, end: String, working: { type: Boolean, default: true } },
    thursday: { start: String, end: String, working: { type: Boolean, default: true } },
    friday: { start: String, end: String, working: { type: Boolean, default: true } },
    saturday: { start: String, end: String, working: { type: Boolean, default: false } },
    sunday: { start: String, end: String, working: { type: Boolean, default: false } }
  },
  lunchBreak: {
    start: { type: String, default: '12:00' },
    end: { type: String, default: '13:00' }
  },
  defaultAppointmentDuration: {
    type: Number,
    default: 30
  },
  bufferTime: {
    type: Number,
    default: 10
  },
  maxAppointmentsPerDay: {
    type: Number,
    default: 16
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Optometrist', optometristSchema);
