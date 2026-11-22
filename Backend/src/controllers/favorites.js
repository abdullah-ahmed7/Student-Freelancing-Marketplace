import Favorite from "../models/Favorite.js";
import Service from "../models/Service.js";
import { asyncHandler, fail } from "../utils/errors.js";
import { USER_PUBLIC_FIELDS, serviceDto } from "../utils/serialize.js";

// GET /api/favorites — the current user's saved services that are still Active
export const list = asyncHandler(async (req, res) => {
  const favs = await Favorite.find({ user: req.user._id }).sort({ createdAt: -1 });
  const services = await Service.find({ _id: { $in: favs.map((f) => f.service) }, status: "Active" })
    .populate("seller", USER_PUBLIC_FIELDS).populate("category", "name icon active");
  const byId = new Map(services.map((s) => [String(s._id), s]));
  res.json(favs.map((f) => byId.get(String(f.service))).filter(Boolean).map(serviceDto));
});

// GET /api/favorites/ids
export const ids = asyncHandler(async (req, res) => {
  const favs = await Favorite.find({ user: req.user._id }).select("service");
  res.json(favs.map((f) => String(f.service)));
});

// POST /api/favorites/:serviceId — idempotent (a duplicate save is a no-op, enforced by a unique index)
export const add = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.serviceId).select("seller status");
  if (!service || service.status !== "Active") fail(404, "This service is not available.");
  if (String(service.seller) === String(req.user._id)) fail(400, "You cannot save your own service.");
  await Favorite.updateOne({ user: req.user._id, service: service._id }, { $setOnInsert: { user: req.user._id, service: service._id } }, { upsert: true });
  res.status(201).json({ saved: true });
});

// DELETE /api/favorites/:serviceId
export const remove = asyncHandler(async (req, res) => {
  await Favorite.deleteOne({ user: req.user._id, service: req.params.serviceId });
  res.json({ saved: false });
});
