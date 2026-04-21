const Waitlist = require('../models/Waitlist');
const Patient = require('../models/Patient');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

exports.addToWaitlist = asyncHandler(async (req, res) => {
  let { patientId, optometristId, appointmentType, priority } = req.body;

  // Patients may only add themselves.
  if (req.user.role === 'patient') {
    const own = await Patient.findOne({ user: req.user._id });
    if (!own) throw new ApiError(404, 'Patient profile not found');
    patientId = own._id;
  }

  const waitlistEntry = await Waitlist.create({
    patient: patientId,
    optometrist: optometristId,
    appointmentType,
    priority,
  });

  await waitlistEntry.populate('patient optometrist');

  res.status(201).json({ success: true, data: waitlistEntry });
});

exports.getWaitlist = asyncHandler(async (req, res) => {
  const waitlist = await Waitlist.find({ status: 'active' })
    .populate('patient optometrist')
    .sort({ priority: -1, addedDate: 1 });

  res.json({ success: true, count: waitlist.length, data: waitlist });
});

exports.removeFromWaitlist = asyncHandler(async (req, res) => {
  const waitlistEntry = await Waitlist.findByIdAndUpdate(
    req.params.id,
    { status: 'removed' },
    { new: true },
  );

  if (!waitlistEntry) throw new ApiError(404, 'Waitlist entry not found');

  res.json({ success: true, data: waitlistEntry });
});
