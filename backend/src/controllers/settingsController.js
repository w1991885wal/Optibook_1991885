const Settings = require('../models/Settings');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// Stable group key for the reminder-templates settings document. Extensible:
// future groups can use other keys ('clinic-info', 'notification-defaults', etc.).
const REMINDER_KEY = 'reminder-templates';

const DEFAULTS = {
  reminderSmsTemplate:
    'Hi {{patientName}}, this is a reminder of your appointment with ' +
    '{{optometristName}} on {{appointmentDate}} at {{appointmentTime}}. ' +
    'Reply STOP to opt out.',
  reminderEmailSubject: 'Appointment reminder · {{appointmentDate}}',
  reminderEmailBody:
    'Hello {{patientName}},\n\n' +
    'This is a reminder of your appointment with {{optometristName}} on ' +
    '{{appointmentDate}} at {{appointmentTime}}.\n\n' +
    'If you need to reschedule, please contact us in advance.\n\n' +
    'Thank you,\nOptiBook',
};

const MAX_SMS = 320;
const MAX_SUBJECT = 200;
const MAX_BODY = 4000;

const pickPublic = (doc) => ({
  reminderSmsTemplate: doc.reminderSmsTemplate || '',
  reminderEmailSubject: doc.reminderEmailSubject || '',
  reminderEmailBody: doc.reminderEmailBody || '',
});

// GET /api/settings/reminder-templates
// Read-or-seed: if no document exists yet, persist DEFAULTS so the editor
// always loads concrete values. Subsequent reads return whatever's stored.
exports.getReminderTemplates = asyncHandler(async (req, res) => {
  let doc = await Settings.findOne({ key: REMINDER_KEY });
  if (!doc) {
    doc = await Settings.create({ key: REMINDER_KEY, ...DEFAULTS });
  }
  res.json({ success: true, data: pickPublic(doc) });
});

// PUT /api/settings/reminder-templates
// Whitelisted partial update. Missing fields preserve their stored value.
// SMS + subject are trimmed (incidental whitespace serves no purpose).
// Body whitespace/newlines are preserved as-is so multi-line emails render
// the way the admin wrote them.
exports.updateReminderTemplates = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const patch = {};

  if (typeof body.reminderSmsTemplate === 'string') {
    const v = body.reminderSmsTemplate.trim();
    if (v.length > MAX_SMS) {
      throw new ApiError(400, `SMS template must be ${MAX_SMS} characters or fewer`);
    }
    patch.reminderSmsTemplate = v;
  }

  if (typeof body.reminderEmailSubject === 'string') {
    const v = body.reminderEmailSubject.trim();
    if (v.length > MAX_SUBJECT) {
      throw new ApiError(400, `Email subject must be ${MAX_SUBJECT} characters or fewer`);
    }
    patch.reminderEmailSubject = v;
  }

  if (typeof body.reminderEmailBody === 'string') {
    // Body kept untrimmed to preserve intentional formatting / blank lines.
    const v = body.reminderEmailBody;
    if (v.length > MAX_BODY) {
      throw new ApiError(400, `Email body must be ${MAX_BODY} characters or fewer`);
    }
    patch.reminderEmailBody = v;
  }

  const doc = await Settings.findOneAndUpdate(
    { key: REMINDER_KEY },
    { $set: patch, $setOnInsert: { key: REMINDER_KEY, ...DEFAULTS } },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
  );

  res.json({ success: true, data: pickPublic(doc) });
});
