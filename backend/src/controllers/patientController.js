const Patient = require('../models/Patient');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// A patient may only read/update their own Patient document;
// optometrist and admin may access any.
const assertCanAccess = async (user, patientId) => {
  if (user.role === 'admin' || user.role === 'optometrist') return;
  const own = await Patient.findOne({ user: user._id });
  if (!own || !own._id.equals(patientId)) {
    throw new ApiError(403, 'Not authorized to access this patient');
  }
};

// Fields a self-updating patient is not allowed to change.
const PATIENT_PROTECTED_FIELDS = [
  'user',
  'visitCount',
  'attendanceRate',
  'nextRecallDate',
];

exports.getPatients = asyncHandler(async (req, res) => {
  const patients = await Patient.find().populate('user');
  res.json({ success: true, data: patients });
});

exports.getPatient = asyncHandler(async (req, res) => {
  await assertCanAccess(req.user, req.params.id);
  const patient = await Patient.findById(req.params.id);
  if (!patient) throw new ApiError(404, 'Patient not found');
  res.json({ success: true, data: patient });
});

exports.updatePatient = asyncHandler(async (req, res) => {
  await assertCanAccess(req.user, req.params.id);

  const patch = { ...req.body };
  if (req.user.role === 'patient') {
    for (const f of PATIENT_PROTECTED_FIELDS) delete patch[f];
  }

  const patient = await Patient.findByIdAndUpdate(req.params.id, patch, {
    new: true,
    runValidators: true,
  });
  if (!patient) throw new ApiError(404, 'Patient not found');
  res.json({ success: true, data: patient });
});
