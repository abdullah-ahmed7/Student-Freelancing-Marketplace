import mongoose from "mongoose";
import { ORDER_STATUSES } from "../utils/constants.js";

const timelineSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    note: { type: String, default: "" },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true, index: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // snapshots: later edits to the listing must not change an existing order
    serviceTitle: { type: String, required: true },
    price: { type: Number, required: true },
    deliveryDays: { type: Number, required: true },
    requirements: { type: String, required: true, maxlength: 1500 },
    requestedDeadline: { type: String, default: "" }, // YYYY-MM-DD or ""
    status: { type: String, enum: ORDER_STATUSES, default: "Requested", index: true },
    delivery: {
      message: { type: String, default: "" },
      link: { type: String, default: "" },
      at: { type: Date },
    },
    revisionNote: { type: String, default: "" },
    timeline: { type: [timelineSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
