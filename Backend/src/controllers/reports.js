import Report from "../models/Report.js";
import Service from "../models/Service.js";
import User from "../models/User.js";
import { asyncHandler, fail } from "../utils/errors.js";
import { REPORT_REASONS } from "../utils/constants.js";
import { isObjectId, str } from "../utils/validate.js";
import { reportDto } from "../utils/serialize.js";

// POST /api/reports  { targetType: "service"|"user", targetId, reason, details? }
export const create = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const targetType = str(b.targetType), targetId = str(b.targetId), reason = str(b.reason), details = str(b.details);
  if (!["service", "user"].includes(targetType)) fail(422, "Invalid report target.");
  if (!isObjectId(targetId)) fail(404, "The reported item could not be found.");
  if (!REPORT_REASONS.includes(reason)) fail(422, "Choose a reason.", { reason: "Choose a reason." });
  if (details.length > 500) fail(422, "Details must be 500 characters or fewer.");

  if (targetType === "service") {
    const s = await Service.findById(targetId).select("seller");
    if (!s) fail(404, "The reported service could not be found.");
    if (String(s.seller) === String(req.user._id)) fail(400, "You cannot report your own service.");
  } else {
    const u = await User.findById(targetId).select("role");
    if (!u || u.role !== "student") fail(404, "The reported user could not be found.");
    if (String(u._id) === String(req.user._id)) fail(400, "You cannot report yourself.");
  }
  if (await Report.exists({ reporter: req.user._id, targetType, target: targetId, status: "Open" })) {
    fail(409, "You already have an open report on this.");
  }
  const r = await Report.create({ reporter: req.user._id, targetType, target: targetId, reason, details });
  res.status(201).json(reportDto(r));
});

// GET /api/reports — admin
export const list = asyncHandler(async (req, res) => {
  const reports = await Report.find().sort({ createdAt: -1 }).populate("reporter", "fullName");
  const sIds = reports.filter((r) => r.targetType === "service").map((r) => r.target);
  const uIds = reports.filter((r) => r.targetType === "user").map((r) => r.target);
  const [services, users] = await Promise.all([
    Service.find({ _id: { $in: sIds } }).select("title"), User.find({ _id: { $in: uIds } }).select("fullName"),
  ]);
  const label = new Map([...services.map((s) => [String(s._id), s.title]), ...users.map((u) => [String(u._id), u.fullName])]);
  res.json(reports.map((r) => reportDto(r, {
    reporterName: r.reporter?.fullName || "(deleted user)", targetLabel: label.get(String(r.target)) || "(removed)",
  })));
});

// PATCH /api/reports/:id  { status: "Resolved" | "Dismissed" } — admin
export const resolve = asyncHandler(async (req, res) => {
  const status = str(req.body?.status);
  if (!["Resolved", "Dismissed"].includes(status)) fail(400, "Status must be Resolved or Dismissed.");
  const r = await Report.findById(req.params.id);
  if (!r) fail(404, "Report not found.");
  if (r.status !== "Open") fail(409, `This report is already ${r.status.toLowerCase()}.`);
  r.status = status; r.resolvedBy = req.user._id; r.resolvedAt = new Date();
  await r.save();
  res.json(reportDto(r));
});
