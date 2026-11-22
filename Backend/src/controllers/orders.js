import Order from "../models/Order.js";
import Service from "../models/Service.js";
import Message from "../models/Message.js";
import Review from "../models/Review.js";
import { asyncHandler, fail } from "../utils/errors.js";
import { isHttpUrl, str } from "../utils/validate.js";
import { USER_PUBLIC_FIELDS, messageDto, orderDto } from "../utils/serialize.js";
import { ACTIONS, TRANSITIONS } from "../utils/orderWorkflow.js";
import { notify } from "../utils/notify.js";

const populateOrder = (q) => q.populate("buyer", USER_PUBLIC_FIELDS).populate("seller", USER_PUBLIC_FIELDS);
const isParty = (o, user) => String(o.buyer._id ?? o.buyer) === String(user._id) || String(o.seller._id ?? o.seller) === String(user._id);
const partyRole = (o, user) => (String(o.buyer._id ?? o.buyer) === String(user._id) ? "buyer" : "seller");

async function withReviews(orders) {
  const reviews = await Review.find({ order: { $in: orders.map((o) => o._id) } });
  const byOrder = new Map(reviews.map((r) => [String(r.order), r]));
  return orders.map((o) => orderDto(o, { review: byOrder.get(String(o._id)) }));
}

// Loads an order only if the caller takes part in it (404 otherwise, so ids cannot be probed).
async function loadForParty(req, { allowAdmin = false } = {}) {
  const o = await populateOrder(Order.findById(req.params.id));
  const ok = o && (isParty(o, req.user) || (allowAdmin && req.user.role === "admin"));
  if (!ok) fail(404, "Order not found.");
  return o;
}

// POST /api/orders
export const create = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const service = await Service.findById(str(b.serviceId)).populate("seller", "status fullName");
  if (!service || service.status !== "Active" || service.seller?.status !== "active") fail(404, "This service is not available for ordering.");
  if (String(service.seller._id) === String(req.user._id)) fail(403, "You cannot order your own service.");

  const requirements = str(b.requirements);
  const deadline = str(b.requestedDeadline);
  const e = {};
  if (requirements.length < 20) e.requirements = "Describe what you need in at least 20 characters.";
  else if (requirements.length > 1500) e.requirements = "Requirements must be 1500 characters or fewer.";
  if (deadline) {
    const t = Date.parse(`${deadline}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || Number.isNaN(t)) e.requestedDeadline = "Enter a valid date.";
    else if (t < Date.now() - 2 * 86400000) e.requestedDeadline = "Choose today or a later date.";
  }
  if (Object.keys(e).length) fail(422, "Please fix the highlighted fields.", e);

  const now = new Date();
  const order = await Order.create({
    service: service._id, buyer: req.user._id, seller: service.seller._id,
    // title/price/delivery are snapshotted so later edits to the listing do not alter this order
    serviceTitle: service.title, price: service.price, deliveryDays: service.deliveryDays,
    requirements, requestedDeadline: deadline, status: "Requested",
    timeline: [{ status: "Requested", at: now, by: req.user._id }],
  });
  await notify(service.seller._id, "order_new", `${req.user.fullName} requested "${service.title}".`, `/orders/${order._id}`);
  const full = await populateOrder(Order.findById(order._id));
  res.status(201).json(orderDto(full));
});

// GET /api/orders — orders where I am the buyer or the seller
export const list = asyncHandler(async (req, res) => {
  const orders = await populateOrder(Order.find({ $or: [{ buyer: req.user._id }, { seller: req.user._id }] }).sort({ createdAt: -1 }));
  res.json(await withReviews(orders));
});

// GET /api/orders/:id — participants, plus admins (read-only oversight)
export const getOne = asyncHandler(async (req, res) => {
  const o = await loadForParty(req, { allowAdmin: true });
  res.json((await withReviews([o]))[0]);
});

// PATCH /api/orders/:id/status  { action, message?, link?, note? }
// Every transition is validated here (state, actor, payload); the frontend is not trusted.
export const act = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const action = str(b.action);
  if (!ACTIONS.includes(action)) fail(400, "Unknown order action.");

  const o = await loadForParty(req); // participants only; admins cannot change orders
  const t = TRANSITIONS[o.status]?.[action];
  if (!t) fail(409, `This action is not allowed while the order is "${o.status}".`);
  const role = partyRole(o, req.user);
  if (t.actor !== role) fail(403, `Only the ${t.actor} can do this.`);

  const set = { status: t.to };
  let note = "";
  if (action === "deliver") {
    const message = str(b.message), link = str(b.link);
    if (message.length < 10) fail(422, "Add a delivery note.", { message: "Write at least 10 characters about what you are delivering." });
    if (message.length > 1000) fail(422, "Delivery note is too long.", { message: "Delivery note must be 1000 characters or fewer." });
    if (link && !isHttpUrl(link)) fail(422, "Enter a valid link.", { link: "Link must start with http:// or https://" });
    set.delivery = { message, link, at: new Date() };
    note = message;
  }
  if (action === "revise") {
    const n = str(b.note);
    if (n.length < 10) fail(422, "Explain what should change.", { note: "Write at least 10 characters about what should change." });
    if (n.length > 1000) fail(422, "Revision note is too long.", { note: "Revision note must be 1000 characters or fewer." });
    set.revisionNote = n;
    note = n;
  }

  // Compare-and-set on the previous status: two concurrent requests cannot both apply a transition.
  const updated = await populateOrder(Order.findOneAndUpdate(
    { _id: o._id, status: o.status },
    { $set: set, $push: { timeline: { status: t.to, at: new Date(), by: req.user._id, note } } },
    { new: true },
  ));
  if (!updated) fail(409, "This order was just updated by someone else. Refresh and try again.");

  const other = role === "buyer" ? o.seller._id : o.buyer._id;
  await notify(other, t.type, `${req.user.fullName}: "${o.serviceTitle}" is now ${t.to}.`, `/orders/${o._id}`);
  res.json((await withReviews([updated]))[0]);
});

// GET /api/orders/:id/messages — participants only, oldest first
export const listMessages = asyncHandler(async (req, res) => {
  const o = await loadForParty(req);
  const msgs = await Message.find({ order: o._id }).sort({ createdAt: 1, _id: 1 });
  res.json(msgs.map(messageDto));
});

// POST /api/orders/:id/messages  { text }
export const sendMessage = asyncHandler(async (req, res) => {
  const o = await loadForParty(req);
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) fail(422, "Write a message first.");
  if (text.length > 1000) fail(422, "Message is too long (max 1000 characters).");
  const m = await Message.create({ order: o._id, sender: req.user._id, text });
  const other = partyRole(o, req.user) === "buyer" ? o.seller._id : o.buyer._id;
  await notify(other, "message_new", `New message from ${req.user.fullName} on "${o.serviceTitle}".`, `/orders/${o._id}`);
  res.status(201).json(messageDto(m));
});
