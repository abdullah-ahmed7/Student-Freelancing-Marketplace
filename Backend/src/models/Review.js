import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    // unique: exactly one review per order
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true, index: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5, validate: { validator: Number.isInteger, message: "Rating must be a whole number" } },
    comment: { type: String, required: true, trim: true, minlength: 5, maxlength: 500 },
  },
  { timestamps: true }
);

export default mongoose.model("Review", reviewSchema);
