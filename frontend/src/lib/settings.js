import API from "./api";

// Admin-only. Reminder template editor uses these helpers.
export const getReminderTemplates = () =>
  API.get("/settings/reminder-templates");

export const updateReminderTemplates = (payload) =>
  API.put("/settings/reminder-templates", payload);

// Tokens supported by the reminder system. Stored verbatim today;
// substitution will happen at send time once a real provider is wired.
export const REMINDER_PLACEHOLDERS = [
  "{{patientName}}",
  "{{appointmentDate}}",
  "{{appointmentTime}}",
  "{{optometristName}}",
];
