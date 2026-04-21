const Optometrist = require('../models/Optometrist');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

exports.getOptometrists = asyncHandler(async (req, res) => {
  const optometrists = await Optometrist.find().populate('user');
  res.json({ success: true, data: optometrists });
});

exports.getOptometrist = asyncHandler(async (req, res) => {
  const optometrist = await Optometrist.findById(req.params.id).populate('user');
  if (!optometrist) throw new ApiError(404, 'Optometrist not found');
  res.json({ success: true, data: optometrist });
});
