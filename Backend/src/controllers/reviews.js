import Review from "../models/Review.js";
import Order from "../models/Order.js";
import Service from "../models/Service.js";

async function refreshRating(serviceId) {
  const [stats] = await Review.aggregate([
    { $match: { service: serviceId } },
    { $group: { _id: "$service", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  await Service.findByIdAndUpdate(serviceId, {
    avgRating: stats ? Math.round(stats.avg * 10) / 10 : 0,
    reviewCount: stats ? stats.count : 0,
  });
}

export async function createReview(req, res, next) {
  try {
    const { orderId, rating, comment } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!order.buyer.equals(req.user._id)) {
      return res.status(403).json({ message: "Only the buyer can review this order" });
    }
    if (order.status !== "completed") {
      return res.status(400).json({ message: "You can only review completed orders" });
    }
    const review = await Review.create({
      service: order.service,
      order: order._id,
      reviewer: req.user._id,
      rating,
      comment,
    });
    await refreshRating(order.service);
    res.status(201).json({ review });
  } catch (err) {
    next(err);
  }
}

export async function getServiceReviews(req, res, next) {
  try {
    const reviews = await Review.find({ service: req.params.serviceId })
      .populate("reviewer", "name avatar")
      .sort({ createdAt: -1 });
    res.json({ reviews });
  } catch (err) {
    next(err);
  }
}
