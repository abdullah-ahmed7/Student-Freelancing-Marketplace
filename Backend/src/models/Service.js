import mongoose from "mongoose";
import { SERVICE_STATUSES } from "../utils/constants.js";

const serviceSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 8, maxlength: 100 },
    description: { type: String, required: true, trim: true, minlength: 30, maxlength: 2000 },
    price: {
      type: Number, required: true,
      min: [1, "Price must be at least 1"],
      validate: { validator: Number.isInteger, message: "Price must be a whole number" },
    },
    deliveryDays: {
      type: Number, required: true,
      min: [1, "Delivery must be between 1 and 365 days"],
      max: [365, "Delivery must be between 1 and 365 days"],
      validate: { validator: Number.isInteger, message: "Delivery days must be a whole number" },
    },
    requirements: { type: String, trim: true, maxlength: 800, default: "" },
    images: { type: [String], default: [], validate: [(v) => v.length <= 4, "You can add up to 4 images"] },
    status: { type: String, enum: SERVICE_STATUSES, default: "Active", index: true },
    // denormalised review stats (recomputed from reviews)
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

serviceSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("Service", serviceSchema);
