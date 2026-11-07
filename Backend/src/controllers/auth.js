import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Service from "../models/Service.js";

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

const userPayload = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  university: u.university,
  bio: u.bio,
  skills: u.skills,
  avatar: u.avatar,
});

export async function register(req, res, next) {
  try {
    const { name, email, password, role, university } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    const user = await User.create({ name, email, password, role, university });
    res.status(201).json({ token: signToken(user._id), user: userPayload(user) });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    const user = await User.findOne({ email: String(email).toLowerCase() }).select("+password");
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    res.json({ token: signToken(user._id), user: userPayload(user) });
  } catch (err) {
    next(err);
  }
}

export const getMe = (req, res) => res.json({ user: userPayload(req.user) });

export async function updateMe(req, res, next) {
  try {
    const allowed = ["name", "university", "bio", "skills", "avatar"];
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) req.user[f] = req.body[f];
    });
    await req.user.save();
    // keep the seller name on listings in sync
    if (req.body.name !== undefined) {
      await Service.updateMany({ sellerId: req.user._id }, { seller: req.user.name });
    }
    res.json({ user: userPayload(req.user) });
  } catch (err) {
    next(err);
  }
}
