import mongoose from "mongoose";

export const isObjectId = (v) => typeof v === "string" && /^[a-f\d]{24}$/i.test(v);
export const toObjectId = (v) => new mongoose.Types.ObjectId(v);

// Coerces untrusted input to a trimmed string (objects/arrays become "") so query operators can never
// be smuggled into a Mongo filter through a JSON body or query string.
export const str = (v) => (typeof v === "string" ? v.trim() : "");

export function toNum(v) {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") return Number(v);
  return NaN;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isEmail = (v) => EMAIL_RE.test(v);
// University addresses end in .edu or .edu.pk (same rule as the frontend validator)
export const isUniversityEmail = (v) => isEmail(v) && /\.edu(\.[a-z]{2})?$/i.test(v);

export function isHttpUrl(v) {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function parsePaging(query, { defaultSize = 9, maxSize = 50 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(maxSize, Math.max(1, parseInt(query.pageSize, 10) || defaultSize));
  return { page, pageSize };
}
