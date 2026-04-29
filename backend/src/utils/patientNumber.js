const Patient = require('../models/Patient');

// Phase D2b — patient numbering helpers.
// Mongo `_id` stays the relational key; `patientNumber` is a user-facing
// numeric ID assigned in `createdAt` order. Race-acceptable for the
// prototype: registrations are not concurrent enough on this demo to
// collide, and the startup backfill only fills missing values.

/**
 * Returns the next available patientNumber by reading the current max and
 * adding 1. Returns 1 if the collection is empty or no patient yet has a
 * number assigned.
 */
async function getNextPatientNumber() {
  const top = await Patient.findOne({ patientNumber: { $ne: null } })
    .sort({ patientNumber: -1 })
    .select('patientNumber')
    .lean();
  const next = top && typeof top.patientNumber === 'number'
    ? top.patientNumber + 1
    : 1;
  return next;
}

/**
 * Idempotent: assigns sequential patientNumbers to any patient that does
 * not yet have one, in `createdAt` ascending order. Safe to call on every
 * server boot — no-ops once every patient has a number.
 *
 * Uses an in-process counter primed from the current max so two unnumbered
 * patients in the same backfill pass don't both pick the same value.
 */
async function backfillPatientNumbers() {
  const missing = await Patient.find({
    $or: [{ patientNumber: { $exists: false } }, { patientNumber: null }],
  })
    .sort({ createdAt: 1, _id: 1 })
    .select('_id');

  if (missing.length === 0) return { assigned: 0 };

  let counter = await getNextPatientNumber();
  for (const p of missing) {
    await Patient.updateOne(
      { _id: p._id, $or: [{ patientNumber: { $exists: false } }, { patientNumber: null }] },
      { $set: { patientNumber: counter } },
    );
    counter += 1;
  }

  return { assigned: missing.length };
}

module.exports = {
  getNextPatientNumber,
  backfillPatientNumbers,
};
