import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { env } from "../config/env.js";
import { HttpError, asyncHandler } from "../utils/errors.js";

export const signToken = (id) => jwt.sign({ id: String(id) }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

function readToken(req) {
  const header = req.headers.authorization;
  return header && header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

async function userFromToken(token) {
  let decoded;
  try {
    decoded = jwt.verify(token, env.jwtSecret);
  } catch (err) {
    const expired = err.name === "TokenExpiredError";
    throw new HttpError(401, expired ? "Your session has expired. Please log in again." : "Invalid session. Please log in again.");
  }
  // Loaded fresh on every request so suspension / deletion takes effect immediately
  const user = await User.findById(decoded.id);
  if (!user) throw new HttpError(401, "This account no longer exists.");
  if (user.status === "suspended") throw new HttpError(403, "Your account is suspended. Contact the administrator.");
  return user;
}

// Requires a valid token and an active account.
export const protect = asyncHandler(async (req, res, next) => {
  const token = readToken(req);
  if (!token) throw new HttpError(401, "Please log in to continue.");
  req.user = await userFromToken(token);
  next();
});

// Attaches req.user when a valid token is present; otherwise continues as a guest.
export const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = readToken(req);
  if (token) {
    try { req.user = await userFromToken(token); } catch { /* treat as guest */ }
  }
  next();
});

export const restrictTo = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new HttpError(403, roles.includes("admin") && roles.length === 1 ? "Admin access required." : "You do not have permission to do this."));
  }
  return next();
};

export const adminOnly = restrictTo("admin");
export const studentOnly = restrictTo("student");
