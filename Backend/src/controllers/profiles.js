import User from "../models/User.js";
import Service from "../models/Service.js";
import Review from "../models/Review.js";
import PortfolioItem from "../models/PortfolioItem.js";
import { asyncHandler, fail } from "../utils/errors.js";
import { DEGREES, SEMESTERS, SKILL_LEVELS } from "../utils/constants.js";
import { escapeRegex, isHttpUrl, str } from "../utils/validate.js";
import { USER_PUBLIC_FIELDS, ownUser, portfolioDto, publicUser, reviewDto, serviceDto } from "../utils/serialize.js";
import { completeness } from "../utils/profile.js";

// Validates and applies the editable profile fields (never email / role / verified / status).
export async function applyProfileUpdate(user, patch) {
  const e = {};
  if ("fullName" in patch) {
    const v = str(patch.fullName);
    if (v.length < 2 || v.length > 80) e.fullName = "Enter your full name (2–80 characters).";
    else user.fullName = v;
  }
  if ("degree" in patch) {
    if (!DEGREES.includes(str(patch.degree))) e.degree = "Select a valid degree.";
    else user.degree = str(patch.degree);
  }
  if ("semester" in patch) {
    if (!SEMESTERS.includes(str(patch.semester))) e.semester = "Select a valid semester.";
    else user.semester = str(patch.semester);
  }
  for (const k of ["program", "department"]) {
    if (k in patch) {
      const v = str(patch[k]);
      if (!v || v.length > 80) e[k] = `Enter your ${k} (up to 80 characters).`;
      else user[k] = v;
    }
  }
  if ("bio" in patch) {
    const v = str(patch.bio);
    if (v.length > 500) e.bio = "Bio must be 500 characters or fewer.";
    else user.bio = v;
  }
  if ("avatarUrl" in patch) {
    const v = str(patch.avatarUrl);
    if (v && !isHttpUrl(v)) e.avatarUrl = "Enter a valid http(s) image URL.";
    else user.avatarUrl = v;
  }
  if ("availability" in patch) {
    if (typeof patch.availability !== "boolean") e.availability = "Availability must be true or false.";
    else user.availability = patch.availability;
  }
  if ("skills" in patch) {
    const raw = Array.isArray(patch.skills) ? patch.skills : null;
    if (!raw) e.skills = "Skills must be a list.";
    else if (raw.length > 15) e.skills = "You can add up to 15 skills.";
    else {
      const seen = new Set();
      const skills = [];
      for (const s of raw) {
        const name = str(typeof s === "string" ? s : s?.name);
        const level = typeof s === "object" && s && s.level ? str(s.level) : "Intermediate";
        if (!name || name.length > 40) { e.skills = "Each skill needs a name of up to 40 characters."; break; }
        if (!SKILL_LEVELS.includes(level)) { e.skills = "Skill level must be Beginner, Intermediate or Advanced."; break; }
        if (seen.has(name.toLowerCase())) continue; // ignore duplicates
        seen.add(name.toLowerCase());
        skills.push({ name, level });
      }
      if (!e.skills) user.skills = skills;
    }
  }
  if (Object.keys(e).length) fail(422, "Please fix the highlighted fields.", e);
  await user.save();
  return user;
}

// GET /api/profiles/me
export const getMine = asyncHandler(async (req, res) => {
  const hasActiveService = !!(await Service.exists({ seller: req.user._id, status: "Active" }));
  res.json({ ...ownUser(req.user), completeness: completeness(req.user, { hasActiveService }) });
});

// PUT /api/profiles/me
export const updateMine = asyncHandler(async (req, res) => {
  await applyProfileUpdate(req.user, req.body || {});
  res.json(ownUser(req.user));
});

// GET /api/profiles/students?q=&availableOnly=1  — public directory (active students only)
export const listStudents = asyncHandler(async (req, res) => {
  const filter = { role: "student", status: "active" };
  if (req.query.availableOnly === "true" || req.query.availableOnly === "1") filter.availability = true;
  const q = str(req.query.q);
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ fullName: rx }, { program: rx }, { department: rx }, { "skills.name": rx }];
  }
  const users = await User.find(filter).select(USER_PUBLIC_FIELDS).sort({ ratingAvg: -1, ratingCount: -1, fullName: 1 });
  res.json(users.map(publicUser));
});

// GET /api/profiles/:id — public profile with active services, portfolio and reviews
export const getPublic = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select(USER_PUBLIC_FIELDS);
  const viewerIsAdmin = req.user?.role === "admin";
  if (!user || user.role !== "student" || (user.status !== "active" && !viewerIsAdmin)) fail(404, "Student not found.");

  const [services, portfolio, reviews] = await Promise.all([
    Service.find({ seller: user._id, status: "Active" }).sort({ createdAt: -1 })
      .populate("seller", USER_PUBLIC_FIELDS).populate("category", "name icon active"),
    PortfolioItem.find({ user: user._id }).sort({ createdAt: -1 }),
    Review.find({ seller: user._id }).sort({ createdAt: -1 })
      .populate("buyer", USER_PUBLIC_FIELDS).populate("service", "title"),
  ]);

  res.json({
    ...publicUser(user),
    completeness: completeness(user, { hasActiveService: services.length > 0 }),
    services: services.map(serviceDto),
    portfolio: portfolio.map(portfolioDto),
    reviews: reviews.map((r) => ({
      ...reviewDto(r),
      buyer: r.buyer && r.buyer.fullName ? publicUser(r.buyer) : null,
      serviceTitle: r.service?.title || "(deleted service)",
    })),
  });
});
