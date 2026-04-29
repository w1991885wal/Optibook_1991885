// Phase AI-1 — runtime inference for the no-show classifier.
//
// Loads the trained logistic-regression artifact at module load time.
// Pure JS — sigmoid + dot product. No dependencies.
//
// Public surface:
//   isModelLoaded()              -> boolean
//   predictNoShowRisk(input)     -> { riskScore, riskLevel, factors,
//                                      modelUsed: true }
// On any failure (file missing, JSON malformed, feature extraction throws)
// the caller — aiScoring.computeNoShowRisk — falls back to the rule-based
// path. predictNoShowRisk itself throws on failure rather than returning a
// degraded result so the fallback is unambiguous.

const path = require('path');
const moment = require('moment');

const { calcAge } = require('./durationRules');
const { FEATURE_NAMES } = require('./syntheticData');

const MODEL_PATH = path.join(__dirname, 'noShowModel.json');

let cachedModel = null;
let loadAttempted = false;
let loadError = null;

function tryLoad() {
  if (loadAttempted) return;
  loadAttempted = true;
  try {
    // require() handles JSON natively and caches the parsed object.
    // Wrapped in delete-from-cache to allow unit tests to reload after
    // retraining within the same process.
    delete require.cache[MODEL_PATH];
    // eslint-disable-next-line global-require, import/no-dynamic-require
    cachedModel = require(MODEL_PATH);
    if (
      !cachedModel ||
      !Array.isArray(cachedModel.coefficients) ||
      !Array.isArray(cachedModel.featureNames) ||
      cachedModel.coefficients.length !== cachedModel.featureNames.length
    ) {
      throw new Error('noShowModel.json shape invalid');
    }
  } catch (err) {
    loadError = err;
    cachedModel = null;
  }
}

function isModelLoaded() {
  tryLoad();
  return cachedModel !== null;
}

function getModelMeta() {
  tryLoad();
  if (!cachedModel) return null;
  // Public-safe slice; never expose the raw coefficients to untrusted callers.
  return {
    trainedAt: cachedModel.trainedAt,
    sampleSize: cachedModel.sampleSize,
    metrics: cachedModel.metrics,
    hyperparameters: cachedModel.hyperparameters,
  };
}

// Phase ML-Monitoring: admin-only accessor exposing the trained weights
// for the analytics dashboard's coefficient visualisation. Callers are
// expected to gate this behind admin authorisation.
function getModelWeights() {
  tryLoad();
  if (!cachedModel) return null;
  return {
    coefficients: [...cachedModel.coefficients],
    featureNames: [...cachedModel.featureNames],
    intercept: cachedModel.intercept,
    means: [...cachedModel.means],
    stds: [...cachedModel.stds],
  };
}

function sigmoid(z) {
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
}

// Build the model feature vector from the same `input` object that
// computeNoShowRisk receives. Throws on missing essentials so the caller
// triggers the rules fallback.
function extractFeatures({
  patient,
  optometrist,
  date,
  startTime,
  pastNoShows,
  leadDays,
  appointmentType,
}) {
  if (!patient) throw new Error('patient required for ML inference');

  const attendance =
    typeof patient.attendanceRate === 'number' ? patient.attendanceRate : 80;
  const visit_count =
    typeof patient.visitCount === 'number' ? patient.visitCount : 0;
  const age = calcAge(patient.dateOfBirth);

  let hour = 13;
  if (typeof startTime === 'string' && /^\d{1,2}:\d{2}$/.test(startTime)) {
    hour = parseInt(startTime.split(':')[0], 10);
  }

  let is_weekend = 0;
  if (date) {
    const d = new Date(date);
    if (!Number.isNaN(d.getTime())) {
      const dow = d.getDay();
      is_weekend = dow === 0 || dow === 6 ? 1 : 0;
    }
  }

  let is_first_or_last_slot = 0;
  if (
    optometrist &&
    optometrist.workingHours &&
    date &&
    typeof startTime === 'string'
  ) {
    const dayKey = moment(date).format('dddd').toLowerCase();
    const wh = optometrist.workingHours[dayKey];
    if (wh && wh.working) {
      if (startTime === wh.start || startTime === wh.end) {
        is_first_or_last_slot = 1;
      }
    }
  }
  // Fallback: 9am or 5pm slot counts as edge-of-day even without optom data.
  if (!is_first_or_last_slot && (hour === 9 || hour === 17)) {
    is_first_or_last_slot = 1;
  }

  const appt_type_eye_test = appointmentType === 'Eye Test' ? 1 : 0;
  const appt_type_cl =
    appointmentType === 'Contact Lens Fitting' ||
    appointmentType === 'Contact Lens Follow-up'
      ? 1
      : 0;

  return {
    attendance_rate: attendance,
    prior_no_shows_180d: typeof pastNoShows === 'number' ? pastNoShows : 0,
    lead_days: typeof leadDays === 'number' ? leadDays : 0,
    patient_age: age == null ? 40 : age,
    visit_count,
    has_phone: patient.phone ? 1 : 0,
    is_weekend,
    hour_of_day: hour,
    is_first_or_last_slot,
    appt_type_eye_test,
    appt_type_cl,
  };
}

// Pretty factor labels parallel to the rule-based path for consistency.
const FACTOR_LABELS = {
  attendance_rate: 'Attendance rate',
  prior_no_shows_180d: 'Recent no-shows (180d)',
  lead_days: 'Lead time',
  patient_age: 'Patient age',
  visit_count: 'Visit count',
  has_phone: 'Phone on file',
  is_weekend: 'Weekend appointment',
  hour_of_day: 'Time of day',
  is_first_or_last_slot: 'First or last slot of day',
  appt_type_eye_test: 'Appointment type: Eye Test',
  appt_type_cl: 'Appointment type: Contact Lens',
};

function predictNoShowRisk(input) {
  tryLoad();
  if (!cachedModel) {
    throw loadError || new Error('noShowModel not loaded');
  }

  const raw = extractFeatures(input);

  // Feature vector ordered to match cachedModel.featureNames.
  const x = cachedModel.featureNames.map((name) => {
    if (!(name in raw)) {
      throw new Error(`Missing feature for inference: ${name}`);
    }
    return raw[name];
  });

  // Standardise using the model's stored means / stds.
  const standardised = x.map((value, i) => {
    const std = cachedModel.stds[i] || 1;
    return (value - cachedModel.means[i]) / std;
  });

  // Logit = intercept + sum(coef_i * z_i).
  let z = cachedModel.intercept;
  const contributions = [];
  for (let i = 0; i < standardised.length; i += 1) {
    const c = cachedModel.coefficients[i] * standardised[i];
    z += c;
    contributions.push({
      feature: cachedModel.featureNames[i],
      rawValue: x[i],
      contribution: c,
    });
  }

  const riskScore = Number(sigmoid(z).toFixed(2));
  let riskLevel = 'low';
  if (riskScore >= 0.66) riskLevel = 'high';
  else if (riskScore >= 0.33) riskLevel = 'medium';

  // Top-3 absolute contributions become the user-facing factors so the
  // explanation parallels the rule-based path's `factors` array shape.
  const top = contributions
    .slice()
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 3)
    .map((c) => ({
      factor: c.feature,
      delta: Number(c.contribution.toFixed(3)),
      description: `${FACTOR_LABELS[c.feature] || c.feature}: ${c.rawValue}`,
    }));

  return {
    riskScore,
    riskLevel,
    factors: top,
    modelUsed: true,
  };
}

module.exports = {
  isModelLoaded,
  getModelMeta,
  getModelWeights,
  predictNoShowRisk,
  // Exposed for the training script's evaluation pass.
  _sigmoid: sigmoid,
};
