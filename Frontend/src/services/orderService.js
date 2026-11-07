import { run, currentUserOrThrow, publicUser, notify } from './runtime';
import { ApiError, uid } from './mockDb';

// Allowed transitions: [from status][action] = { to, actor, needsNote? }
// The mock enforces them like a backend would, so the UI shows real "invalid transition" errors.
const TRANSITIONS = {
  Requested: {
    accept: { to: 'Accepted', actor: 'seller' },
    reject: { to: 'Rejected', actor: 'seller' },
    cancel: { to: 'Cancelled', actor: 'buyer' },
  },
  Accepted: {
    start: { to: 'In Progress', actor: 'seller' },
    cancel: { to: 'Cancelled', actor: 'buyer' },
  },
  'In Progress': { deliver: { to: 'Delivered', actor: 'seller' } },
  Delivered: {
    complete: { to: 'Completed', actor: 'buyer' },
    revise: { to: 'Revision Requested', actor: 'buyer' },
  },
  'Revision Requested': { start: { to: 'In Progress', actor: 'seller' } },
};

export function allowedActions(order, userId) {
  const role = order.buyerId === userId ? 'buyer' : order.sellerId === userId ? 'seller' : null;
  if (!role) return [];
  return Object.entries(TRANSITIONS[order.status] || {})
    .filter(([, t]) => t.actor === role).map(([action]) => action);
}

function hydrate(d, o) {
  return {
    ...o,
    buyer: publicUser(d, d.users.find((u) => u.id === o.buyerId)),
    seller: publicUser(d, d.users.find((u) => u.id === o.sellerId)),
    review: d.reviews.find((r) => r.orderId === o.id) || null,
  };
}

export const orderService = {
  create: ({ serviceId, requirements, requestedDeadline }) => run('Place order', (d) => {
    const me = currentUserOrThrow(d);
    const s = d.services.find((x) => x.id === serviceId);
    if (!s || s.status !== 'Active') throw new ApiError('This service is not available for ordering.', 404);
    if (s.sellerId === me.id) throw new ApiError('You cannot order your own service.', 403);
    if (!requirements || requirements.trim().length < 20) {
      throw new ApiError('Please describe your requirements.', 422, { requirements: 'Describe what you need in at least 20 characters.' });
    }
    if (requestedDeadline && new Date(requestedDeadline) < new Date(new Date().toDateString())) {
      throw new ApiError('Deadline must be in the future.', 422, { requestedDeadline: 'Choose today or a later date.' });
    }
    const now = new Date().toISOString();
    // price & title are snapshotted so later edits to the listing do not change this order
    const o = {
      id: uid('o'), serviceId: s.id, serviceTitle: s.title, price: s.price, deliveryDays: s.deliveryDays,
      buyerId: me.id, sellerId: s.sellerId, requirements: requirements.trim(),
      requestedDeadline: requestedDeadline || '', status: 'Requested', createdAt: now,
      delivery: null, revisionNote: '', timeline: [{ status: 'Requested', at: now, by: me.id }],
    };
    d.orders.unshift(o);
    notify(d, s.sellerId, `${me.fullName} requested "${s.title}".`, `/orders/${o.id}`);
    return o;
  }, { write: true }),

  list: () => run('Orders', (d) => {
    const me = currentUserOrThrow(d);
    return d.orders.filter((o) => o.buyerId === me.id || o.sellerId === me.id)
      .map((o) => hydrate(d, o)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }),

  get: (id) => run('Order', (d) => {
    const me = currentUserOrThrow(d);
    const o = d.orders.find((x) => x.id === id);
    if (!o || (o.buyerId !== me.id && o.sellerId !== me.id && me.role !== 'admin')) throw new ApiError('Order not found.', 404);
    return hydrate(d, o);
  }),

  act: (id, action, payload = {}) => run('Update order', (d) => {
    const me = currentUserOrThrow(d);
    const o = d.orders.find((x) => x.id === id);
    if (!o || (o.buyerId !== me.id && o.sellerId !== me.id)) throw new ApiError('Order not found.', 404);
    const t = TRANSITIONS[o.status]?.[action];
    if (!t) throw new ApiError(`This action is not allowed while the order is "${o.status}".`, 409);
    const role = o.buyerId === me.id ? 'buyer' : 'seller';
    if (t.actor !== role) throw new ApiError(`Only the ${t.actor} can do this.`, 403);
    if (action === 'deliver') {
      if (!payload.message || payload.message.trim().length < 10) {
        throw new ApiError('Add a delivery note.', 422, { message: 'Write at least 10 characters about what you are delivering.' });
      }
      o.delivery = { message: payload.message.trim(), link: (payload.link || '').trim(), at: new Date().toISOString() };
    }
    if (action === 'revise') {
      if (!payload.note || payload.note.trim().length < 10) {
        throw new ApiError('Explain what should change.', 422, { note: 'Write at least 10 characters about what should change.' });
      }
      o.revisionNote = payload.note.trim();
    }
    o.status = t.to;
    o.timeline.push({ status: t.to, at: new Date().toISOString(), by: me.id, note: payload.note || '' });
    const other = role === 'buyer' ? o.sellerId : o.buyerId;
    notify(d, other, `${me.fullName}: "${o.serviceTitle}" is now ${t.to}.`, `/orders/${o.id}`);
    return hydrate(d, o);
  }, { write: true }),

  listMessages: (orderId) => run('Messages', (d) => {
    const me = currentUserOrThrow(d);
    const o = d.orders.find((x) => x.id === orderId);
    if (!o || (o.buyerId !== me.id && o.sellerId !== me.id)) throw new ApiError('Order not found.', 404);
    return d.messages.filter((m) => m.orderId === orderId).sort((a, b) => a.at.localeCompare(b.at));
  }, { ms: 120 }),

  sendMessage: (orderId, text) => run('Send message', (d) => {
    const me = currentUserOrThrow(d);
    const o = d.orders.find((x) => x.id === orderId);
    if (!o || (o.buyerId !== me.id && o.sellerId !== me.id)) throw new ApiError('Order not found.', 404);
    if (!text.trim()) throw new ApiError('Write a message first.', 422);
    if (text.length > 1000) throw new ApiError('Message is too long (max 1000 characters).', 422);
    const m = { id: uid('m'), orderId, senderId: me.id, text: text.trim(), at: new Date().toISOString() };
    d.messages.push(m);
    notify(d, o.buyerId === me.id ? o.sellerId : o.buyerId, `New message from ${me.fullName} on "${o.serviceTitle}".`, `/orders/${o.id}`);
    return m;
  }, { write: true, ms: 120 }),
};
