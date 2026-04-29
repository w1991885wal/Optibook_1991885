const Notification = require('../models/Notification');
const Optometrist = require('../models/Optometrist');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// Scope filter based on the caller's role.
// Optom sees only their own optom-scoped rows; admin sees admin-scoped rows.
const scopeForUser = async (user) => {
  if (user.role === 'admin') return { recipientRole: 'admin' };
  if (user.role === 'optometrist') {
    const optom = await Optometrist.findOne({ user: user._id }).select('_id');
    if (!optom) return { recipientRole: 'optometrist', optometrist: null };
    return { recipientRole: 'optometrist', optometrist: optom._id };
  }
  return null;
};

exports.listMine = asyncHandler(async (req, res) => {
  const scope = await scopeForUser(req.user);
  if (!scope) return res.json({ success: true, count: 0, data: [] });

  const items = await Notification.find(scope)
    .sort({ createdAt: -1 })
    .limit(50);

  const unread = await Notification.countDocuments({ ...scope, read: false });

  res.json({
    success: true,
    count: items.length,
    unread,
    data: items,
  });
});

exports.markRead = asyncHandler(async (req, res) => {
  const scope = await scopeForUser(req.user);
  if (!scope) throw new ApiError(403, 'Not authorized');

  const updated = await Notification.findOneAndUpdate(
    { _id: req.params.id, ...scope },
    { read: true },
    { new: true },
  );
  if (!updated) throw new ApiError(404, 'Notification not found');
  res.json({ success: true, data: updated });
});

exports.markAllRead = asyncHandler(async (req, res) => {
  const scope = await scopeForUser(req.user);
  if (!scope) throw new ApiError(403, 'Not authorized');

  const result = await Notification.updateMany(
    { ...scope, read: false },
    { read: true },
  );
  res.json({
    success: true,
    data: { updated: result.modifiedCount || 0 },
  });
});
