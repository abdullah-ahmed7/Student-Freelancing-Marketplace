import User from "../models/User.js";
import Service from "../models/Service.js";
import Order from "../models/Order.js";
import Review from "../models/Review.js";
import { asyncHandler, fail } from "../utils/errors.js";
import { DEGREES, SEMESTERS } from "../utils/constants.js";
import { escapeRegex, str } from "../utils/validate.js";
import { ownUser, serviceDto } from "../utils/serialize.js";
import { populateService } from "./services.js";

// Admin accounts are never exposed or modified through these endpoints (404 for them).
const studentOr404 = async (id) => {
  const u = await User.findById(id);
  if (!u || u.role !== "student") fail(404, "User not found.");
  return u;
};

// GET /api/admin/users?q=&status=
export const listUsers = asyncHandler(async (req, res) => {
  const filter = { role: "student" };
  const status = str(req.query.status);
  if (["active", "suspended"].includes(status)) filter.status = status;
  const q = str(req.query.q);
  if (q) { const rx = new RegExp(escapeRegex(q), "i"); filter.$or = [{ fullName: rx }, { email: rx }]; }
  const users = await User.find(filter).sort({ createdAt: -1 });
  res.json(users.map(ownUser));
});

// GET /api/admin/users/:id
export const getUser = asyncHandler(async (req, res) => {
  const u = await studentOr404(req.params.id);
  const [services, ordersAsBuyer, ordersAsSeller, reviews] = await Promise.all([
    Service.countDocuments({ seller: u._id }), Order.countDocuments({ buyer: u._id }),
    Order.countDocuments({ seller: u._id }), Review.countDocuments({ seller: u._id }),
  ]);
  res.json({ ...ownUser(u), stats: { services, ordersAsBuyer, ordersAsSeller, reviews } });
});

// PATCH /api/admin/users/:id  { status?, verified?, fullName?, degree?, program?, department?, semester? }
export const updateUser = asyncHandler(async (req, res) => {
  const u = await studentOr404(req.params.id);
  const b = req.body || {};
  const e = {};
  if (b.status !== undefined) {
    if (!["active", "suspended"].includes(b.status)) e.status = "Status must be active or suspended.";
    else u.status = b.status;
  }
  if (b.verified !== undefined) {
    if (typeof b.verified !== "boolean") e.verified = "verified must be true or false.";
    else u.verified = b.verified;
  }
  if (b.fullName !== undefined) { const v = str(b.fullName); if (v.length < 2 || v.length > 80) e.fullName = "Enter a name (2–80 characters)."; else u.fullName = v; }
  if (b.degree !== undefined) { if (!DEGREES.includes(str(b.degree))) e.degree = "Invalid degree."; else u.degree = str(b.degree); }
  if (b.semester !== undefined) { if (!SEMESTERS.includes(str(b.semester))) e.semester = "Invalid semester."; else u.semester = str(b.semester); }
  for (const k of ["program", "department"]) {
    if (b[k] !== undefined) { const v = str(b[k]); if (!v || v.length > 80) e[k] = `Enter a valid ${k}.`; else u[k] = v; }
  }
  if (Object.keys(e).length) fail(422, "Please fix the highlighted fields.", e);
  await u.save();
  res.json(ownUser(u));
});

// GET /api/admin/services — every service in every status
export const listServices = asyncHandler(async (req, res) => {
  const list = await populateService(Service.find().sort({ createdAt: -1 }));
  res.json(list.map(serviceDto));
});
