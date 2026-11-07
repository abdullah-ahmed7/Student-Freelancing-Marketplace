import mongoose from "mongoose";

export const CATEGORIES = ["Programming", "Graphic Design", "Content Writing", "Data Science"];

const serviceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    category: { type: String, required: true, enum: CATEGORIES },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    price: {
      type: Number,
      required: true,
      min: [1, "Price must be at least 1"],
      validate: { validator: Number.isInteger, message: "Price must be a whole number" },
    },
    deliveryDays: {
      type: Number,
      required: true,
      min: [1, "Delivery must be between 1 and 365 days"],
      max: [365, "Delivery must be between 1 and 365 days"],
      validate: { validator: Number.isInteger, message: "Delivery days must be a whole number" },
    },
    // `seller` is the seller's display NAME (the frontend uses service.seller as a string).
    seller: { type: String, required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    avgRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Frontend expects `id`, not `_id`
serviceSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Service", serviceSchema);
