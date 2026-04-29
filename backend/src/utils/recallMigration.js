const Patient = require('../models/Patient');

// Phase R1 — recall split backfill.
// Idempotent: copies legacy `Patient.nextRecallDate` into the new typed
// `eyeTestRecallDate` field exactly when the patient has a legacy recall set
// AND neither typed field is already populated. Existing data is treated as
// an eye-test recall (the dominant historical use case).
//
// Safe to call on every server boot — no-ops once every legacy recall has
// been migrated. Same shape as utils/patientNumber.backfillPatientNumbers.

async function backfillRecallSplit() {
  const candidates = await Patient.find({
    nextRecallDate: { $ne: null, $exists: true },
    $and: [
      { $or: [{ eyeTestRecallDate: null }, { eyeTestRecallDate: { $exists: false } }] },
      { $or: [{ contactLensRecallDate: null }, { contactLensRecallDate: { $exists: false } }] },
    ],
  })
    .select('_id nextRecallDate')
    .lean();

  if (candidates.length === 0) return { migrated: 0 };

  let migrated = 0;
  for (const p of candidates) {
    const result = await Patient.updateOne(
      {
        _id: p._id,
        nextRecallDate: { $ne: null, $exists: true },
        $and: [
          { $or: [{ eyeTestRecallDate: null }, { eyeTestRecallDate: { $exists: false } }] },
          { $or: [{ contactLensRecallDate: null }, { contactLensRecallDate: { $exists: false } }] },
        ],
      },
      { $set: { eyeTestRecallDate: p.nextRecallDate } },
    );
    if (result.modifiedCount > 0) migrated += 1;
  }

  return { migrated };
}

module.exports = { backfillRecallSplit };
