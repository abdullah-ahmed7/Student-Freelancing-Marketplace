import Service from "../models/Service.js";
import Category from "../models/Category.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import Review from "../models/Review.js";
import Favorite from "../models/Favorite.js";
import { asyncHandler, fail } from "../utils/errors.js";
import { OPEN_ORDER_STATUSES, SERVICE_STATUSES } from "../utils/constants.js";
import { escapeRegex, isHttpUrl, isObjectId, parsePaging, str, toNum, toObjectId } from "../utils/validate.js";
import { USER_PUBLIC_FIELDS, reviewDto, serviceDto } from "../utils/serialize.js";

export const populateService = (q) => q.populate("seller", USER_PUBLIC_FIELDS).populate("category", "name icon active");

// Validates a full service payload (merged over `base` so partial API updates work too).
async function cleanService(body, base = {}) {
  const src = {
    title: body.title ?? base.title, description: body.description ?? base.description,
    categoryId: body.categoryId ?? base.categoryId, price: body.price ?? base.price,
    deliveryDays: body.deliveryDays ?? base.deliveryDays, requirements: body.requirements ?? base.requirements ?? "",
    images: body.images ?? base.images ?? [], status: body.status ?? base.status,
  };
  const e = {};
  const title = typeof src.title === "string" ? src.title.trim() : "";
  const description = typeof src.description === "string" ? src.description.trim() : "";
  const requirements = typeof src.requirements === "string" ? src.requirements.trim() : "";
  if (title.length < 8) e.title = "Title must be at least 8 characters.";
  else if (title.length > 100) e.title = "Title must be 100 characters or fewer.";
  if (description.length < 30) e.description = "Description is too short (at least 30 characters).";
  else if (description.length > 2000) e.description = "Description must be 2000 characters or fewer.";
  const price = toNum(src.price);
  if (!Number.isInteger(price) || price <= 0 || price > 10000000) e.price = "Enter a valid whole-number price.";
  const deliveryDays = toNum(src.deliveryDays);
  if (!Number.isInteger(deliveryDays) || deliveryDays < 1 || deliveryDays > 365) e.deliveryDays = "Delivery must be 1–365 days.";
  if (requirements.length > 800) e.requirements = "Requirements must be 800 characters or fewer.";

  let images = [];
  if (!Array.isArray(src.images)) e.images = "Images must be a list of URLs.";
  else {
    images = src.images.map((u) => (typeof u === "string" ? u.trim() : "")).filter(Boolean);
    if (images.length > 4) e.images = "You can add up to 4 images.";
    else if (images.some((u) => u.length > 2000 || !isHttpUrl(u))) e.images = "Each image must be a valid http(s) URL.";
  }

  const status = src.status === undefined || src.status === null || src.status === "" ? "Active" : src.status;
  if (!SERVICE_STATUSES.includes(status)) e.status = "Invalid status.";

  let category = null;
  const catId = typeof src.categoryId === "string" ? src.categoryId : String(src.categoryId?._id ?? "");
  if (!isObjectId(catId)) e.category = "Choose a category.";
  else {
    category = await Category.findById(catId);
    const unchanged = base.categoryId && String(base.categoryId) === catId;
    if (!category) e.category = "Choose a valid category.";
    else if (!category.active && !unchanged) e.category = "That category is no longer available.";
  }
  if (Object.keys(e).length) fail(422, "Please fix the highlighted fields.", e);
  return { title, description, price, deliveryDays, requirements, images, status, category: category._id };
}

const SORTS = {
  newest: { createdAt: -1 },
  "price-asc": { price: 1, createdAt: -1 },
  "price-desc": { price: -1, createdAt: -1 },
  rating: { ratingAvg: -1, ratingCount: -1, createdAt: -1 },
};

// GET /api/services — public marketplace: Active services from active sellers.
// Returns { items, total, page, pageSize }.
export const search = asyncHandler(async (req, res) => {
  const q = req.query;
  const { page, pageSize } = parsePaging(q);
  const text = str(q.q);

  const match = { status: "Active" };
  if (q.categoryId !== undefined && str(q.categoryId)) {
    if (!isObjectId(str(q.categoryId))) return res.json({ items: [], total: 0, page, pageSize });
    match.category = toObjectId(str(q.categoryId));
  }
  const min = toNum(q.min), max = toNum(q.max);
  if (Number.isFinite(min) || Number.isFinite(max)) {
    match.price = {};
    if (Number.isFinite(min)) match.price.$gte = min;
    if (Number.isFinite(max)) match.price.$lte = max;
  }
  const maxDelivery = toNum(q.maxDelivery);
  if (Number.isFinite(maxDelivery) && maxDelivery > 0) match.deliveryDays = { $lte: maxDelivery };
  const minRating = toNum(q.minRating);
  if (Number.isFinite(minRating) && minRating > 0) match.ratingAvg = { $gte: minRating };

  const sellerMatch = { "sellerDoc.status": "active" };
  if (q.availableOnly === "true" || q.availableOnly === "1") sellerMatch["sellerDoc.availability"] = true;

  const pipeline = [
    { $match: match },
    { $lookup: { from: User.collection.name, localField: "seller", foreignField: "_id", as: "sellerDoc" } },
    { $unwind: "$sellerDoc" },
    { $match: sellerMatch },
    { $lookup: { from: Category.collection.name, localField: "category", foreignField: "_id", as: "catDoc" } },
    { $unwind: { path: "$catDoc", preserveNullAndEmptyArrays: true } },
  ];
  let sort = SORTS[q.sort] || { ratingAvg: -1, createdAt: -1 };
  if (text) {
    const safe = escapeRegex(text);
    const rx = new RegExp(safe, "i");
    pipeline.push({ $match: { $or: [{ title: rx }, { description: rx }, { "catDoc.name": rx }, { "sellerDoc.fullName": rx }, { "sellerDoc.skills.name": rx }] } });
    if (!SORTS[q.sort]) {
      pipeline.push({ $addFields: { score: { $add: [{ $cond: [{ $regexMatch: { input: "$title", regex: safe, options: "i" } }, 2, 0] }, { $divide: ["$ratingAvg", 5] }] } } });
      sort = { score: -1, createdAt: -1 };
    }
  }
  pipeline.push({ $sort: { ...sort, _id: -1 } });
  pipeline.push({ $facet: { items: [{ $skip: (page - 1) * pageSize }, { $limit: pageSize }, { $project: { _id: 1 } }], total: [{ $count: "n" }] } });

  const [out] = await Service.aggregate(pipeline);
  const ids = out.items.map((d) => d._id);
  const docs = await populateService(Service.find({ _id: { $in: ids } }));
  const byId = new Map(docs.map((d) => [String(d._id), d]));
  res.json({ items: ids.map((id) => byId.get(String(id))).filter(Boolean).map(serviceDto), total: out.total[0]?.n || 0, page, pageSize });
});

// GET /api/services/:id — Active services are public; the owner and admins may see any status
export const getOne = asyncHandler(async (req, res) => {
  const s = await populateService(Service.findById(req.params.id));
  if (!s) fail(404, "Service not found.");
  if (s.status !== "Active") {
    const me = req.user;
    if (!me || (String(me._id) !== String(s.seller?._id) && me.role !== "admin")) fail(404, "This service is not available.");
  }
  const reviews = await Review.find({ service: s._id }).sort({ createdAt: -1 }).populate("buyer", "fullName");
  res.json({
    ...serviceDto(s),
    reviews: reviews.map((r) => ({ ...reviewDto(r), buyerName: r.buyer?.fullName || "Student" })),
  });
});

// GET /api/services/mine
export const listMine = asyncHandler(async (req, res) => {
  const list = await populateService(Service.find({ seller: req.user._id }).sort({ createdAt: -1 }));
  res.json(list.map(serviceDto));
});

// POST /api/services — the seller is always the authenticated user (never taken from the body)
export const create = asyncHandler(async (req, res) => {
  const data = await cleanService(req.body || {});
  const s = await Service.create({ ...data, seller: req.user._id });
  res.status(201).json(serviceDto(await populateService(Service.findById(s._id))));
});

async function ownedService(req) {
  const s = await Service.findById(req.params.id);
  if (!s) fail(404, "Service not found.");
  if (String(s.seller) !== String(req.user._id)) fail(403, "You can only edit your own services.");
  return s;
}

// PUT /api/services/:id — owner only
export const update = asyncHandler(async (req, res) => {
  const s = await ownedService(req);
  const data = await cleanService(req.body || {}, {
    title: s.title, description: s.description, categoryId: String(s.category), price: s.price,
    deliveryDays: s.deliveryDays, requirements: s.requirements, images: s.images, status: s.status,
  });
  Object.assign(s, data);
  await s.save();
  res.json(serviceDto(await populateService(Service.findById(s._id))));
});

// PATCH /api/services/:id/status — owner or admin
export const setStatus = asyncHandler(async (req, res) => {
  const s = await Service.findById(req.params.id);
  if (!s) fail(404, "Service not found.");
  if (String(s.seller) !== String(req.user._id) && req.user.role !== "admin") fail(403, "You can only change your own services.");
  const status = str(req.body?.status);
  if (!SERVICE_STATUSES.includes(status)) fail(400, "Invalid status.");
  s.status = status;
  await s.save();
  res.json(serviceDto(await populateService(Service.findById(s._id))));
});

// DELETE /api/services/:id — owner or admin; blocked while orders are in progress
export const remove = asyncHandler(async (req, res) => {
  const s = await Service.findById(req.params.id);
  if (!s) fail(404, "Service not found.");
  if (String(s.seller) !== String(req.user._id) && req.user.role !== "admin") fail(403, "You can only delete your own services.");
  if (await Order.exists({ service: s._id, status: { $in: OPEN_ORDER_STATUSES } })) {
    fail(409, "This service has active orders. Pause or archive it instead.");
  }
  await Promise.all([s.deleteOne(), Favorite.deleteMany({ service: s._id })]);
  res.json({ ok: true });
});