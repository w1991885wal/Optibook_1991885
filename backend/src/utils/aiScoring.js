const moment = require('moment');
const { OLDER_PATIENT_AGE_THRESHOLD, calcAge } = require('./durationRules');

// Appointment-type → expected specialty. Unknown types fall through to age-based
// inference (Senior ≥ 60) or General.
const TYPE_TO_SPECIALTY = {
  "Children's Eye Exam": 'Pediatric',
  'Contact Lens Fitting': 'Contact Lens',
  'Contact Lens Follow-up': 'Contact Lens',
};

function expectedSpecialtyFor({ appointmentType, patient }) {
  if (TYPE_TO_SPECIALTY[appointmentType]) return TYPE_TO_SPECIALTY[appointmentType];
  const age = calcAge(patient && patient.dateOfBirth);
  if (age !== null && age >= OLDER_PATIENT_AGE_THRESHOLD) return 'Senior';
  return 'General';
}

function specialtyFit(appointmentType, patient, optometrist) {
  if (!optometrist || !optometrist.specialty) return 5;
  const expected = expectedSpecialtyFor({ appointmentType, patient });
  if (optometrist.specialty === expected) return 25;
  if (optometrist.specialty === 'General') return 15;
  return 5;
}

function languageFit(patient, optometrist) {
  const pref = patient && patient.languagePreference;
  const langs = (optometrist && optometrist.languages) || [];
  if (pref && langs.includes(pref)) return 15;
  if (langs.includes('English')) return 8;
  return 0;
}

function ageGroupFit(appointmentType, patient, optometrist) {
  if (!optometrist) return 5;
  if (appointmentType === "Children's Eye Exam" && optometrist.specialty === 'Pediatric') {
    return 10;
  }
  const age = calcAge(patient && patient.dateOfBirth);
  if (age !== null && age >= OLDER_PATIENT_AGE_THRESHOLD && optometrist.specialty === 'Senior') {
    return 10;
  }
  return 5;
}

function continuityFit(visitCount) {
  if (visitCount >= 3) return 20;
  if (visitCount >= 1) return 12;
  return 5;
}

function availabilityFit({ optometrist, date, bookedOnDate }) {
  if (!optometrist || !optometrist.workingHours) return 0;
  const dayKey = moment(date).format('dddd').toLowerCase();
  const wh = optometrist.workingHours[dayKey];
  if (!wh || !wh.working) return 0;
  const max = optometrist.maxAppointmentsPerDay || 16;
  const ratio = bookedOnDate / max;
  if (ratio < 0.75) return 15;
  if (ratio < 1) return 8;
  return 0;
}

function experienceFit(years) {
  if (years >= 5) return 15;
  if (years >= 3) return 10;
  if (years >= 1) return 6;
  return 3;
}

function computeCompatibility({
  patient,
  optometrist,
  appointmentType,
  date,
  visitsWithOptometrist = 0,
  bookedOnDate = 0,
}) {
  const parts = {
    specialty: specialtyFit(appointmentType, patient, optometrist),
    language: languageFit(patient, optometrist),
    ageGroup: ageGroupFit(appointmentType, patient, optometrist),
    continuity: continuityFit(visitsWithOptometrist),
    availability: availabilityFit({ optometrist, date, bookedOnDate }),
    experience: experienceFit((optometrist && optometrist.yearsExperience) || 0),
  };
  const total = Object.values(parts).reduce((a, b) => a + b, 0);
  const breakdown = [
    { factor: 'specialty-fit', score: parts.specialty, max: 25 },
    { factor: 'language-fit', score: parts.language, max: 15 },
    { factor: 'age-group-fit', score: parts.ageGroup, max: 10 },
    { factor: 'continuity', score: parts.continuity, max: 20 },
    { factor: 'availability', score: parts.availability, max: 15 },
    { factor: 'experience', score: parts.experience, max: 15 },
  ];
  return { score: Math.max(0, Math.min(100, total)), breakdown };
}

function computeRecommendationScore({ compatibilityScore, bookedOnDate, maxPerDay }) {
  const max = maxPerDay || 16;
  const bonus = Math.max(0, Math.min(1, 1 - bookedOnDate / max));
  return Math.round(0.7 * compatibilityScore + 0.3 * bonus * 100);
}

function computeNoShowRisk({
  patient,
  optometrist,
  date,
  startTime,
  pastNoShows = 0,
  leadDays = 0,
}) {
  let risk = 0;
  const factors = [];

  const attendance =
    patient && typeof patient.attendanceRate === 'number' ? patient.attendanceRate : 80;
  if (attendance < 80) {
    risk += 0.35;
    factors.push({
      factor: 'low-attendance',
      delta: 0.35,
      description: `Attendance rate ${attendance}%`,
    });
  }
  if (pastNoShows >= 2) {
    risk += 0.25;
    factors.push({
      factor: 'past-no-shows',
      delta: 0.25,
      description: `${pastNoShows} no-shows in last 180 days`,
    });
  }
  if (patient && (patient.visitCount || 0) === 0) {
    risk += 0.1;
    factors.push({
      factor: 'new-patient',
      delta: 0.1,
      description: 'First-time patient',
    });
  }
  if (leadDays > 21) {
    risk += 0.15;
    factors.push({
      factor: 'long-lead-time',
      delta: 0.15,
      description: `Booking ${leadDays} days in advance`,
    });
  }
  if (optometrist && optometrist.workingHours && date && startTime) {
    const dayKey = moment(date).format('dddd').toLowerCase();
    const wh = optometrist.workingHours[dayKey];
    if (wh && wh.working) {
      if (startTime === wh.start || startTime === wh.end) {
        risk += 0.05;
        factors.push({
          factor: 'edge-of-day',
          delta: 0.05,
          description: 'First or last slot of the day',
        });
      }
    }
  }
  if (patient && !patient.phone) {
    risk += 0.1;
    factors.push({
      factor: 'missing-phone',
      delta: 0.1,
      description: 'No phone number on file',
    });
  }

  const riskScore = Math.max(0, Math.min(1, risk));
  let riskLevel = 'low';
  if (riskScore >= 0.66) riskLevel = 'high';
  else if (riskScore >= 0.33) riskLevel = 'medium';

  return { riskScore: Number(riskScore.toFixed(2)), riskLevel, factors };
}

function rankSlots({
  slots,
  patient,
  optometrist,
  appointmentType,
  date,
  visitsWithOptometrist = 0,
  bookedOnDate = 0,
  pastNoShows = 0,
  leadDaysFn,
}) {
  if (!Array.isArray(slots) || slots.length === 0) return [];
  const compat = computeCompatibility({
    patient,
    optometrist,
    appointmentType,
    date,
    visitsWithOptometrist,
    bookedOnDate,
  });
  const preferred = (patient && patient.preferredTimes) || [];

  const ranked = slots.map((startTime) => {
    const leadDays = typeof leadDaysFn === 'function' ? leadDaysFn(date, startTime) : 0;
    const risk = computeNoShowRisk({
      patient,
      optometrist,
      date,
      startTime,
      pastNoShows,
      leadDays,
    });
    let score = 0.6 * (compat.score / 100) + 0.4 * (1 - risk.riskScore);
    const reasons = [];
    if (preferred.includes(startTime)) {
      score += 0.05;
      reasons.push('Matches patient preferred time');
    }
    if (compat.score >= 75) reasons.push('Strong compatibility');
    if (risk.riskLevel === 'low') reasons.push('Low no-show risk');
    return {
      startTime,
      score: Number(Math.max(0, Math.min(1, score)).toFixed(3)),
      compatibilityScore: compat.score,
      riskScore: risk.riskScore,
      riskLevel: risk.riskLevel,
      reasons,
    };
  });

  return ranked.sort((a, b) => b.score - a.score);
}

module.exports = {
  computeCompatibility,
  computeRecommendationScore,
  computeNoShowRisk,
  rankSlots,
  expectedSpecialtyFor,
};
