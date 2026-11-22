import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
  },
  { timestamps: true }
);

// A service can be saved only once per user
favoriteSchema.index({ user: 1, service: 1 }, { unique: true });

export default mongoose.model("Favorite", favoriteSchema);
