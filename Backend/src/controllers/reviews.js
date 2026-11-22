import Review from "../models/Review.js";
import Order from "../models/Order.js";
import { asyncHandler, fail } from "../utils/errors.js";
import { str, toNum } from "../utils/validate.js";
import { reviewDto, idOf } from "../utils/serialize.js";
import { refreshRatings } from "../utils/ratings.js";
import { notify } from "../utils/notify.js";

// POST /api/reviews  { orderId, rating, comment } — buyer of a Completed order, once
export const create = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const o = await Order.findById(str(b.orderId));
  if (!o) fail(404, "Order not found.");
  if (String(o.buyer) !== String(req.user._id)) fail(403, "Only the buyer on this order can review it.");
  if (o.status !== "Completed") fail(409, "You can review only after the order is Completed.");
  if (await Review.exists({ order: o._id })) fail(409, "You already reviewed this order.");

  const rating = toNum(b.rating);
  const comment = str(b.comment);
  const e = {};
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) e.rating = "Choose a rating from 1 to 5.";
  if (comment.length < 5) e.comment = "Write at least 5 characters.";
  else if (comment.length > 500) e.comment = "Review must be 500 characters or fewer.";
  if (Object.keys(e).length) fail(422, "Please fix the highlighted fields.", e);

  const review = await Review.create({ order: o._id, service: o.service, seller: o.seller, buyer: req.user._id, rating, comment });
  await refreshRatings({ serviceId: o.service, sellerId: o.seller });
  await notify(o.seller, "review_new", `${req.user.fullName} left you a ${rating}-star review.`, `/students/${o.seller}`);
  res.status(201).json(reviewDto(review));
});

// GET /api/reviews/service/:serviceId — public
export const listForService = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ service: req.params.serviceId }).sort({ createdAt: -1 }).populate("buyer", "fullName");
  res.json(reviews.map((r) => ({ ...reviewDto(r), buyerName: r.buyer?.fullName || "Student" })));
});

// GET /api/reviews — admin moderation list
export const listAll = asyncHandler(async (req, res) => {
  const reviews = await Review.find().sort({ createdAt: -1 })
    .populate("buyer", "fullName").populate("seller", "fullName").populate("service", "title");
  res.json(reviews.map((r) => ({
    ...reviewDto(r), buyerName: r.buyer?.fullName, sellerName: r.seller?.fullName,
    serviceTitle: r.service?.title || "(deleted service)", serviceId: idOf(r.service) || String(r.service),
  })));
});

// DELETE /api/reviews/:id — admin; ratings are recomputed from the remaining reviews
export const remove = asyncHandler(async (req, res) => {
  const r = await Review.findByIdAndDelete(req.params.id);
  if (!r) fail(404, "Review not found.");
  await refreshRatings({ serviceId: r.service, sellerId: r.seller });
  res.json({ ok: true });
});
