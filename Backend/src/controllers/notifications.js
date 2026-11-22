import Notification from "../models/Notification.js";
import { asyncHandler, fail } from "../utils/errors.js";
import { notificationDto } from "../utils/serialize.js";

export const list = asyncHandler(async (req, res) => {
  const items = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(200);
  res.json(items.map(notificationDto));
});

// PATCH /api/notifications/read — mark all as read
export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } });
  res.json({ ok: true });
});

// PATCH /api/notifications/:id/read
export const markRead = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { $set: { read: true } }, { new: true });
  if (!n) fail(404, "Notification not found.");
  res.json(notificationDto(n));
});
