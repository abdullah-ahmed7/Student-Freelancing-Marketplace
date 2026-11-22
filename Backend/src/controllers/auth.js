import User from "../models/User.js";
import { env } from "../config/env.js";
import { signToken } from "../middleware/auth.js";
import { asyncHandler, fail } from "../utils/errors.js";
import { DEGREES, SEMESTERS } from "../utils/constants.js";
import { isUniversityEmail, str } from "../utils/validate.js";
import { ownUser } from "../utils/serialize.js";
import { applyProfileUpdate } from "./profiles.js";

function validateRegistration(b) {
  const e = {};
  if (str(b.fullName).length < 2) e.fullName = "Enter your full name.";
  else if (str(b.fullName).length > 80) e.fullName = "Name must be 80 characters or fewer.";
  const email = str(b.email).toLowerCase();
  if (!email) e.email = "Enter your university email.";
  else if (!isUniversityEmail(email)) e.email = "Use your university email (ending in .edu or .edu.pk).";
  if (!DEGREES.includes(str(b.degree))) e.degree = "Select your degree.";
  if (!str(b.program)) e.program = "Enter your program (e.g. Computer Science).";
  if (!str(b.department)) e.department = "Enter your department.";
  if (!SEMESTERS.includes(str(b.semester))) e.semester = "Select your semester.";
  const pw = typeof b.password === "string" ? b.password : "";
  if (pw.length < 8) e.password = "Password must be at least 8 characters.";
  else if (pw.length > 72) e.password = "Password must be 72 characters or fewer.";
  return e;
}

// POST /api/auth/register — always creates a "student". Any `role` in the body is ignored.
export const register = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const errors = validateRegistration(b);
  if (Object.keys(errors).length) fail(422, "Please fix the highlighted fields.", errors);

  const email = str(b.email).toLowerCase();
  if (await User.exists({ email })) fail(409, "An account with this email already exists.", { email: "This email is already registered." });

  const user = await User.create({
    fullName: str(b.fullName), email, password: b.password, role: "student",
    degree: str(b.degree), program: str(b.program), department: str(b.department), semester: str(b.semester),
  });
  res.status(201).json({ token: signToken(user._id), user: ownUser(user) });
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const email = str(req.body?.email).toLowerCase();
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!email || !password) fail(400, "Enter your email and password.");

  const user = await User.findOne({ email }).select("+password");
  // Same message for unknown email and wrong password (no account enumeration)
  if (!user || !(await user.matchPassword(password))) fail(401, "Invalid email or password.");
  if (user.status === "suspended") fail(403, "This account is suspended. Contact the administrator.");
  res.json({ token: signToken(user._id), user: ownUser(user) });
});

// GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => res.json(ownUser(req.user)));

// PUT /api/auth/me — same allow-list as PUT /api/profiles/me
export const updateMe = asyncHandler(async (req, res) => {
  await applyProfileUpdate(req.user, req.body || {});
  res.json(ownUser(req.user));
});

// POST /api/auth/verify
// UNIVERSITY-PROJECT DEMO: no email is sent. The "code" is the DEMO_OTP environment value (default 123456),
// shown on the Verify page and labelled as a demo. Replace with a real mail provider before real use.
export const verify = asyncHandler(async (req, res) => {
  if (!env.demoOtp) fail(501, "Email verification is not configured on this server.");
  const code = str(req.body?.code);
  if (code !== env.demoOtp) fail(400, "That code is not correct.", { code: "That code is not correct." });
  req.user.verified = true;
  await req.user.save();
  res.json(ownUser(req.user));
});
