import Service from "../models/Service.js";
import Order from "../models/Order.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import Review from "../models/Review.js";
import Report from "../models/Report.js";
import { asyncHandler } from "../utils/errors.js";
import { OPEN_ORDER_STATUSES } from "../utils/constants.js";
import { notificationDto, ratingOf } from "../utils/serialize.js";
import { completeness } from "../utils/profile.js";

// GET /api/dashboard/student — every figure is computed from MongoDB at request time
export const student = asyncHandler(async (req, res) => {
  const me = req.user;
  const [activeServices, incomingActive, outgoingActive, completed, recent, notes] = await Promise.all([
    Service.countDocuments({ seller: me._id, status: "Active" }),
    Order.countDocuments({ seller: me._id, status: { $in: OPEN_ORDER_STATUSES } }),
    Order.countDocuments({ buyer: me._id, status: { $in: OPEN_ORDER_STATUSES } }),
    Order.countDocuments({ $or: [{ buyer: me._id }, { seller: me._id }], status: "Completed" }),
    Order.find({ $or: [{ buyer: me._id }, { seller: me._id }] }).sort({ createdAt: -1 }).limit(5),
    Notification.find({ user: me._id }).sort({ createdAt: -1 }).limit(5),
  ]);
  const c = completeness(me, { hasActiveService: activeServices > 0 });
  res.json({
    activeServices, incomingActive, outgoingActive, completed,
    rating: ratingOf(me),
    recent: recent.map((o) => ({
      id: String(o._id), serviceTitle: o.serviceTitle, status: o.status, createdAt: o.createdAt.toISOString(),
      role: String(o.buyer) === String(me._id) ? "buyer" : "seller",
    })),
    notifications: notes.map(notificationDto),
    profileFields: { bio: c.fields.bio, avatar: c.fields.avatar, skills: c.fields.skills, verified: c.fields.verified },
    profileCompletion: c,
  });
});

// GET /api/dashboard/admin
export const admin = asyncHandler(async (req, res) => {
  const [users, unverified, activeServices, totalServices, orders, completedOrders, openReports, reviews, recent] = await Promise.all([
    User.countDocuments({ role: "student" }),
    User.countDocuments({ role: "student", verified: false }),
    Service.countDocuments({ status: "Active" }),
    Service.countDocuments(),
    Order.countDocuments(),
    Order.countDocuments({ status: "Completed" }),
    Report.countDocuments({ status: "Open" }),
    Review.countDocuments(),
    Order.find().sort({ createdAt: -1 }).limit(6).populate("buyer", "fullName").populate("seller", "fullName"),
  ]);
  res.json({
    users, unverified, activeServices, totalServices, orders, completedOrders, openReports, reviews,
    recentOrders: recent.map((o) => ({
      id: String(o._id), serviceTitle: o.serviceTitle, status: o.status, createdAt: o.createdAt.toISOString(),
      buyer: o.buyer?.fullName, seller: o.seller?.fullName,
    })),
  });
});
