import mongoose from "mongoose";
import { REPORT_STATUSES } from "../utils/constants.js";

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    targetType: { type: String, enum: ["service", "user"], required: true },
    target: { type: mongoose.Schema.Types.ObjectId, required: true },
    reason: { type: String, required: true },
    details: { type: String, trim: true, maxlength: 500, default: "" },
    status: { type: String, enum: REPORT_STATUSES, default: "Open" },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

// At most one OPEN report per reporter + target (closed reports do not block a new one)
reportSchema.index(
  { reporter: 1, targetType: 1, target: 1 },
  { unique: true, partialFilterExpression: { status: "Open" } }
);

export default mongoose.model("Report", reportSchema);
