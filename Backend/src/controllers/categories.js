import Category from "../models/Category.js";
import Service from "../models/Service.js";
import { asyncHandler, fail } from "../utils/errors.js";
import { escapeRegex, str } from "../utils/validate.js";
import { categoryDto } from "../utils/serialize.js";

// GET /api/categories — active only; admins may pass ?includeInactive=1 to see all
export const list = asyncHandler(async (req, res) => {
  const includeInactive = req.user?.role === "admin" && ["1", "true"].includes(req.query.includeInactive);
  const cats = await Category.find(includeInactive ? {} : { active: true }).sort({ createdAt: 1, name: 1 });
  res.json(cats.map(categoryDto));
});

async function assertUniqueName(name, exceptId) {
  const dup = await Category.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, "i"), ...(exceptId ? { _id: { $ne: exceptId } } : {}) });
  if (dup) fail(409, "That category already exists.");
}

export const create = asyncHandler(async (req, res) => {
  const name = str(req.body?.name);
  if (!name) fail(400, "Enter a category name.");
  if (name.length > 40) fail(400, "Category name must be 40 characters or fewer.");
  await assertUniqueName(name);
  const c = await Category.create({ name, icon: "🏷️", active: true });
  res.status(201).json(categoryDto(c));
});

export const update = asyncHandler(async (req, res) => {
  const c = await Category.findById(req.params.id);
  if (!c) fail(404, "Category not found.");
  const b = req.body || {};
  if (b.name !== undefined) {
    const name = str(b.name);
    if (!name) fail(400, "Enter a category name.");
    if (name.length > 40) fail(400, "Category name must be 40 characters or fewer.");
    await assertUniqueName(name, c._id);
    c.name = name;
  }
  if (b.active !== undefined) {
    if (typeof b.active !== "boolean") fail(400, "active must be true or false.");
    c.active = b.active;
  }
  await c.save();
  res.json(categoryDto(c));
});

export const remove = asyncHandler(async (req, res) => {
  const c = await Category.findById(req.params.id);
  if (!c) fail(404, "Category not found.");
  if (await Service.exists({ category: c._id })) fail(409, "This category has services. Deactivate it instead.");
  await c.deleteOne();
  res.json({ ok: true });
});
