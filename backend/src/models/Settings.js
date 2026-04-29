const mongoose = require('mongoose');

// Generic single-document settings store — keyed for extensibility.
// Each settings group lives at a deterministic `key` so future groups
// (e.g. clinic-info, notification-defaults) can coexist without schema
// changes. This phase only seeds the `reminder-templates` group.
//
// Field shapes are intentionally permissive (plain strings) so individual
// groups can carry whatever they need under a single subdoc.
const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    reminderSmsTemplate: { type: String, default: '' },
    reminderEmailSubject: { type: String, default: '' },
    reminderEmailBody: { type: String, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Settings', settingsSchema);
