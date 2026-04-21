const OLDER_PATIENT_AGE_THRESHOLD = 60;

const calcAge = (dob) => {
  if (!dob) return null;
  const ms = Date.now() - new Date(dob).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / (365.25 * 24 * 3600 * 1000));
};

// Single source of truth for appointment duration.
// Frontend may display, but must not decide.
function computeDuration({ appointmentType, patient, optometrist }) {
  if (appointmentType === 'PCO Test + Eye Test') return 45;

  if (appointmentType === 'Standard Eye Test') {
    const age = calcAge(patient && patient.dateOfBirth);
    if (age !== null && age >= OLDER_PATIENT_AGE_THRESHOLD) return 30;
    return 15;
  }

  return (optometrist && optometrist.defaultAppointmentDuration) || 30;
}

module.exports = {
  computeDuration,
  calcAge,
  OLDER_PATIENT_AGE_THRESHOLD,
};
