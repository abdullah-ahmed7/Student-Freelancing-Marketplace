import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { DEGREES, SEMESTERS, SKILL_LEVELS } from "../utils/constants.js";

const skillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    level: { type: String, enum: SKILL_LEVELS, default: "Intermediate" },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // bcrypt hash; never selected by default so it cannot leak into a response
    password: { type: String, required: true, select: false },
    // "student" can both buy and sell. "admin" is provisioned only by the seed script.
    role: { type: String, enum: ["student", "admin"], default: "student" },
    degree: { type: String, enum: [...DEGREES, ""], default: "" },
    program: { type: String, trim: true, maxlength: 80, default: "" },
    department: { type: String, trim: true, maxlength: 80, default: "" },
    semester: { type: String, enum: [...SEMESTERS, ""], default: "" },
    bio: { type: String, trim: true, maxlength: 500, default: "" },
    avatarUrl: { type: String, trim: true, maxlength: 2000, default: "" },
    verified: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    availability: { type: Boolean, default: true },
    skills: { type: [skillSchema], default: [] },
    // denormalised seller rating (recomputed from reviews)
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.index({ role: 1, status: 1 });

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = function matchPassword(plain) {
  return bcrypt.compare(plain, this.password);
};

export default mongoose.model("User", userSchema);
