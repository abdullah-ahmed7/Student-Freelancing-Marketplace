import { run, currentUserOrThrow, requireAdmin, notify } from './runtime';
import { ApiError } from './apiError';
import { uid } from './mockDb';

export const reviewService = {
  create: ({ orderId, rating, comment }) => run('Submit review', (d) => {
    const me = currentUserOrThrow(d);
    const o = d.orders.find((x) => x.id === orderId);
    if (!o || o.buyerId !== me.id) throw new ApiError('Only the buyer on this order can review it.', 403);
    if (o.status !== 'Completed') throw new ApiError('You can review only after the order is Completed.', 409);
    if (d.reviews.some((r) => r.orderId === orderId)) throw new ApiError('You already reviewed this order.', 409);
    if (!(rating >= 1 && rating <= 5)) throw new ApiError('Choose a rating from 1 to 5.', 422, { rating: 'Choose a rating from 1 to 5.' });
    if (!comment || comment.trim().length < 5) throw new ApiError('Add a short comment.', 422, { comment: 'Write at least 5 characters.' });
    const r = {
      id: uid('r'), orderId, serviceId: o.serviceId, sellerId: o.sellerId, buyerId: me.id,
      rating, comment: comment.trim(), createdAt: new Date().toISOString(),
    };
    d.reviews.push(r);
    notify(d, o.sellerId, `${me.fullName} left you a ${rating}-star review.`, `/students/${o.sellerId}`);
    return r;
  }, { write: true }),

  listAll: () => run('Reviews', (d) => {
    requireAdmin(d);
    return d.reviews.map((r) => ({
      ...r, buyerName: d.users.find((u) => u.id === r.buyerId)?.fullName,
      sellerName: d.users.find((u) => u.id === r.sellerId)?.fullName,
      serviceTitle: d.services.find((s) => s.id === r.serviceId)?.title || '(deleted service)',
    })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }),

  remove: (id) => run('Remove review', (d) => {
    requireAdmin(d);
    d.reviews = d.reviews.filter((r) => r.id !== id);
    return { ok: true };
  }, { write: true }),
};
