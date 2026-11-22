import Review from "../models/Review.js";
import Service from "../models/Service.js";
import User from "../models/User.js";

// Recomputes denormalised rating fields from the reviews collection (source of truth).
async function stats(match) {
  const [s] = await Review.aggregate([{ $match: match }, { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } }]);
  return { ratingAvg: s ? Math.round(s.avg * 10) / 10 : 0, ratingCount: s ? s.count : 0 };
}

export async function refreshRatings({ serviceId, sellerId }) {
  if (serviceId) await Service.updateOne({ _id: serviceId }, await stats({ service: serviceId }));
  if (sellerId) await User.updateOne({ _id: sellerId }, await stats({ seller: sellerId }));
}
