import PortfolioItem from "../models/PortfolioItem.js";
import { asyncHandler, fail } from "../utils/errors.js";
import { isHttpUrl, str } from "../utils/validate.js";
import { portfolioDto } from "../utils/serialize.js";

function clean(body) {
  const e = {};
  const title = str(body.title);
  const description = str(body.description);
  const link = str(body.link);
  if (title.length < 3) e.title = "Enter a title (3+ characters).";
  else if (title.length > 80) e.title = "Title must be 80 characters or fewer.";
  if (description.length > 300) e.description = "Description must be 300 characters or fewer.";
  if (link && !isHttpUrl(link)) e.link = "Enter a valid http(s) link.";
  if (Object.keys(e).length) fail(422, "Please fix the highlighted fields.", e);
  return { title, description, link };
}

// Every query is scoped to req.user so people can only touch their own items.
export const list = asyncHandler(async (req, res) => {
  const items = await PortfolioItem.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(items.map(portfolioDto));
});

export const create = asyncHandler(async (req, res) => {
  const item = await PortfolioItem.create({ user: req.user._id, ...clean(req.body || {}) });
  res.status(201).json(portfolioDto(item));
});

export const update = asyncHandler(async (req, res) => {
  const item = await PortfolioItem.findOne({ _id: req.params.id, user: req.user._id });
  if (!item) fail(404, "Portfolio item not found.");
  Object.assign(item, clean(req.body || {}));
  await item.save();
  res.json(portfolioDto(item));
});

export const remove = asyncHandler(async (req, res) => {
  const item = await PortfolioItem.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!item) fail(404, "Portfolio item not found.");
  res.json({ ok: true });
});
