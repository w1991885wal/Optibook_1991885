// Phase AI-1 — deterministic synthetic appointment generator.
//
// Produces appointment-like rows with realistic feature distributions and a
// generated `attended` label, used as training data for the no-show risk
// classifier. Every randomness call is routed through a seeded PRNG so the
// dataset is byte-reproducible from a (seed, n) pair.
//
// Distribution rationale (justifiable in the dissertation):
//   - attendance_rate ~ Beta-like (most patients reliable; long left tail)
//   - prior no-shows correlate inversely with attendance
//   - lead time exponential (most book within ~7 days)
//   - age mixture roughly matching NHS optical mix
//   - target overall no-show rate ~12-15%
//
// Ground-truth label is generated from a hand-tuned linear combination of
// features through a sigmoid plus Gaussian logit-noise, sampled as
// Bernoulli. The model has a real signal to learn but the dataset is not
// trivially separable.

// --- Mulberry32 PRNG (small, well-known, seedable) ---
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller standard-normal sample using the supplied uniform RNG.
function gaussian(rng) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Beta-like draw via two gammas isn't worth the complexity; use a clipped
// Gaussian centred on 88 with sd 9 and re-roll out-of-range samples. This
// matches a Beta(8,2)-shaped right-skewed distribution closely enough for
// training data purposes and stays deterministic under the seeded RNG.
function attendanceRateSample(rng) {
  for (let i = 0; i < 16; i += 1) {
    const v = 88 + gaussian(rng) * 9;
    if (v >= 30 && v <= 100) return Math.round(v * 10) / 10;
  }
  return 80;
}

function geometricSample(rng, p) {
  // Number of failures before first success, integer >= 0.
  return Math.floor(Math.log(1 - rng()) / Math.log(1 - p));
}

function exponentialSample(rng, mean) {
  return -mean * Math.log(1 - rng());
}

function categoricalSample(rng, weights) {
  const total = weights.reduce((a, b) => a + b.weight, 0);
  let r = rng() * total;
  for (const w of weights) {
    r -= w.weight;
    if (r <= 0) return w.value;
  }
  return weights[weights.length - 1].value;
}

function sigmoid(z) {
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
}

const APPT_TYPES = [
  { value: 'Eye Test', weight: 0.55 },
  { value: 'Contact Lens Fitting', weight: 0.08 },
  { value: 'Contact Lens Follow-up', weight: 0.12 },
  { value: 'PCO Test', weight: 0.15 },
  { value: 'PCO Test + Eye Test', weight: 0.10 },
];

// Feature names in the order the model expects.
const FEATURE_NAMES = [
  'attendance_rate',
  'prior_no_shows_180d',
  'lead_days',
  'patient_age',
  'visit_count',
  'has_phone',
  'is_weekend',
  'hour_of_day',
  'is_first_or_last_slot',
  'appt_type_eye_test',
  'appt_type_cl',
];

// Hand-tuned ground-truth coefficients used to label the dataset.
// These are NOT the trained coefficients — they're the latent function the
// classifier should approximately recover from data.
const TRUTH = {
  intercept: -1.95,
  attendance_rate: -0.060, // per percentage point above 80
  prior_no_shows_180d: 0.70,
  lead_days: 0.025,
  patient_age: -0.003,
  visit_count: -0.030,
  has_phone: -0.30,
  is_weekend: 0.18,
  hour_of_day: -0.04,
  is_first_or_last_slot: 0.35,
  appt_type_eye_test: -0.05,
  appt_type_cl: 0.05,
  noiseSd: 0.15, // logit-space gaussian noise (tuned for 1200-row trainability)
};

function buildRow(rng) {
  const attendance_rate = attendanceRateSample(rng);

  // Prior no-shows correlate inversely with attendance. Patients above 90
  // very rarely no-show; below 70 frequently.
  const expectedNoShows =
    Math.max(0, (90 - attendance_rate) / 12) + 0.2 * geometricSample(rng, 0.5);
  const prior_no_shows_180d = Math.min(8, Math.round(expectedNoShows));

  const lead_days = Math.min(60, Math.round(exponentialSample(rng, 9)));

  // Age mixture: child / adult / senior.
  const ageBucket = categoricalSample(rng, [
    { value: 'child', weight: 0.18 },
    { value: 'adult', weight: 0.62 },
    { value: 'senior', weight: 0.20 },
  ]);
  let patient_age;
  if (ageBucket === 'child') {
    patient_age = Math.max(2, Math.round(8 + gaussian(rng) * 4));
  } else if (ageBucket === 'senior') {
    patient_age = Math.min(95, Math.max(60, Math.round(72 + gaussian(rng) * 7)));
  } else {
    patient_age = Math.min(75, Math.max(18, Math.round(40 + gaussian(rng) * 12)));
  }

  // Returning patient bias correlates with age.
  const visit_count = Math.min(
    30,
    geometricSample(rng, ageBucket === 'senior' ? 0.18 : 0.32),
  );

  const has_phone = rng() < 0.92 ? 1 : 0;

  const dow = Math.floor(rng() * 7);
  const is_weekend = dow === 0 || dow === 6 ? 1 : 0;

  // Working hours 9-17. Bimodal: morning + late-afternoon peaks.
  const hour_of_day = rng() < 0.55
    ? 9 + Math.floor(rng() * 3) // 9-11
    : 14 + Math.floor(rng() * 4); // 14-17

  const is_first_or_last_slot = hour_of_day === 9 || hour_of_day === 17 ? 1 : 0;

  const apptType = categoricalSample(rng, APPT_TYPES);
  const appt_type_eye_test = apptType === 'Eye Test' ? 1 : 0;
  const appt_type_cl =
    apptType === 'Contact Lens Fitting' ||
    apptType === 'Contact Lens Follow-up'
      ? 1
      : 0;

  return {
    attendance_rate,
    prior_no_shows_180d,
    lead_days,
    patient_age,
    visit_count,
    has_phone,
    is_weekend,
    hour_of_day,
    is_first_or_last_slot,
    appt_type_eye_test,
    appt_type_cl,
    appointmentType: apptType,
  };
}

function labelRow(row, rng) {
  // Centre attendance around 80 so the coefficient stays interpretable.
  const z =
    TRUTH.intercept +
    TRUTH.attendance_rate * (row.attendance_rate - 80) +
    TRUTH.prior_no_shows_180d * row.prior_no_shows_180d +
    TRUTH.lead_days * row.lead_days +
    TRUTH.patient_age * (row.patient_age - 40) +
    TRUTH.visit_count * row.visit_count +
    TRUTH.has_phone * row.has_phone +
    TRUTH.is_weekend * row.is_weekend +
    TRUTH.hour_of_day * (row.hour_of_day - 13) +
    TRUTH.is_first_or_last_slot * row.is_first_or_last_slot +
    TRUTH.appt_type_eye_test * row.appt_type_eye_test +
    TRUTH.appt_type_cl * row.appt_type_cl +
    TRUTH.noiseSd * gaussian(rng);

  const p = sigmoid(z);
  return rng() < p ? 1 : 0; // 1 = no-show, 0 = attended
}

function generateSyntheticAppointments({ n = 1200, seed = 42 } = {}) {
  const rng = mulberry32(seed);
  const rows = [];
  let noShowCount = 0;

  for (let i = 0; i < n; i += 1) {
    const row = buildRow(rng);
    const noShow = labelRow(row, rng);
    row.no_show = noShow;
    row.attended = noShow ? 0 : 1;
    rows.push(row);
    if (noShow) noShowCount += 1;
  }

  return {
    rows,
    summary: {
      n,
      seed,
      noShowCount,
      noShowRate: Number((noShowCount / n).toFixed(4)),
      featureNames: [...FEATURE_NAMES],
    },
  };
}

module.exports = {
  generateSyntheticAppointments,
  FEATURE_NAMES,
  // Exported for the inference helper so feature extraction stays in sync.
  __TRUTH_FOR_REFERENCE__: TRUTH,
};
