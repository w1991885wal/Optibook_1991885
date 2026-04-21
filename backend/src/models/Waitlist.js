const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  optometrist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Optometrist'
  },
  appointmentType: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  addedDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'booked', 'removed'],
    default: 'active'
  },
  preferredDates: [Date],
  notes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Waitlist', waitlistSchema);
