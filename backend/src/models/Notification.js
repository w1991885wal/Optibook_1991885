const mongoose = require('mongoose');

// Phase E: lightweight in-app notifications. Records are written fire-and-
// forget from the appointment/waitlist event points; never block the primary
// action on failure.
//
// recipientRole + optometrist together define the audience:
//   - optometrist-scope rows: recipientRole='optometrist' AND optometrist=<id>
//   - admin-scope rows:       recipientRole='admin'      (optometrist unset)
// An event that concerns a specific optom typically generates two rows: one
// optometrist-scope and one admin-scope mirror.

const NOTIFICATION_TYPES = [
  'booking-created',
  'booking-cancelled',
  'booking-rescheduled',
  'waitlist-confirmed',
  'system',
];

const notificationSchema = new mongoose.Schema(
  {
    recipientRole: {
      type: String,
      enum: ['optometrist', 'admin'],
      required: true,
    },
    optometrist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Optometrist',
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

notificationSchema.index({ recipientRole: 1, optometrist: 1, createdAt: -1 });
notificationSchema.index({ recipientRole: 1, read: 1 });

notificationSchema.statics.NOTIFICATION_TYPES = NOTIFICATION_TYPES;

module.exports = mongoose.model('Notification', notificationSchema);
