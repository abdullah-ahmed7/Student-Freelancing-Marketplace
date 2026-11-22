import { env } from "../config/env.js";

// Tiny in-memory limiter for credential endpoints (slows brute-force; resets on restart).
export function authRateLimit({ windowMs = 15 * 60 * 1000 } = {}) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, windowMs).unref();

  return (req, res, next) => {
    const max = env.authRateLimitMax;
    if (!Number.isFinite(max) || max <= 0) return next();
    const key = req.ip;
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.reset <= now) { entry = { count: 0, reset: now + windowMs }; hits.set(key, entry); }
    entry.count += 1;
    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ message: "Too many attempts. Please wait a few minutes and try again." });
    }
    return next();
  };
}
