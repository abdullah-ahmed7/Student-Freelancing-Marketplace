import { run, currentUserOrThrow, hydrateService } from './runtime';
import { ApiError } from './apiError';
import { uid, getSessionUserId } from './mockDb';
import { SERVICE_STATUSES } from '../utils/constants';

function validate(f) {
  const errs = {};
  if (!f.title || f.title.trim().length < 8) errs.title = 'Title must be at least 8 characters.';
  if (!f.description || f.description.trim().length < 30) errs.description = 'Description is too short.';
  if (!Number.isInteger(Number(f.price)) || Number(f.price) <= 0) errs.price = 'Enter a valid whole-number price.';
  if (!Number.isInteger(Number(f.deliveryDays)) || f.deliveryDays < 1 || f.deliveryDays > 365) errs.deliveryDays = 'Delivery must be 1–365 days.';
  if (Object.keys(errs).length) throw new ApiError('Please fix the highlighted fields.', 422, errs);
}

export const serviceService = {
  // Public marketplace: only Active services from active sellers.
  search: ({ q = '', categoryId = '', min, max, maxDelivery, minRating, availableOnly, sort = 'relevance', page = 1, pageSize = 9 }) =>
    run('Marketplace', (d) => {
      const t = q.toLowerCase().trim();
      let list = d.services
        .filter((s) => s.status === 'Active')
        .map((s) => hydrateService(d, s))
        .filter((s) => s.seller && s.seller.status === 'active');
      if (t) {
        list = list.filter((s) => [s.title, s.description, s.category, s.seller.fullName, ...s.seller.skills.map((k) => k.name)]
          .some((x) => x.toLowerCase().includes(t)));
      }
      if (categoryId) list = list.filter((s) => s.categoryId === categoryId);
      if (min) list = list.filter((s) => s.price >= Number(min));
      if (max) list = list.filter((s) => s.price <= Number(max));
      if (maxDelivery) list = list.filter((s) => s.deliveryDays <= Number(maxDelivery));
      if (minRating) list = list.filter((s) => s.rating.avg >= Number(minRating));
      if (availableOnly) list = list.filter((s) => s.seller.availability);
      const score = (s) => (t && s.title.toLowerCase().includes(t) ? 2 : 0) + s.rating.avg / 5;
      const sorters = {
        relevance: (a, b) => (t ? score(b) - score(a) : b.rating.avg - a.rating.avg || b.createdAt.localeCompare(a.createdAt)),
        newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
        'price-asc': (a, b) => a.price - b.price,
        'price-desc': (a, b) => b.price - a.price,
        rating: (a, b) => b.rating.avg - a.rating.avg || b.rating.count - a.rating.count,
      };
      list.sort(sorters[sort] || sorters.relevance);
      const total = list.length;
      const start = (page - 1) * pageSize;
      return { items: list.slice(start, start + pageSize), total, page, pageSize };
    }),

  // Detail: Active services are public. Owner (and admin) can also see non-active ones.
  get: (id) => run('Service', (d) => {
    const s = d.services.find((x) => x.id === id);
    if (!s) throw new ApiError('Service not found.', 404);
    const h = hydrateService(d, s);
    if (s.status !== 'Active') {
      const me = d.users.find((u) => u.id === getSessionUserId());
      if (!me || (me.id !== s.sellerId && me.role !== 'admin')) throw new ApiError('This service is not available.', 404);
    }
    h.reviews = d.reviews.filter((r) => r.serviceId === id).map((r) => ({
      ...r, buyerName: d.users.find((u) => u.id === r.buyerId)?.fullName || 'Student',
    })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return h;
  }),

  listMine: () => run('My services', (d) => {
    const me = currentUserOrThrow(d);
    return d.services.filter((s) => s.sellerId === me.id).map((s) => hydrateService(d, s))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }),

  create: (f) => run('Create service', (d) => {
    const me = currentUserOrThrow(d);
    validate(f);
    const s = {
      id: uid('s'), sellerId: me.id, title: f.title.trim(), categoryId: f.categoryId,
      description: f.description.trim(), price: Number(f.price), deliveryDays: Number(f.deliveryDays),
      requirements: (f.requirements || '').trim(), images: (f.images || []).filter(Boolean).slice(0, 4),
      status: f.status && SERVICE_STATUSES.includes(f.status) ? f.status : 'Active',
      createdAt: new Date().toISOString(),
    };
    d.services.unshift(s);
    return s;
  }, { write: true }),

  update: (id, f) => run('Update service', (d) => {
    const me = currentUserOrThrow(d);
    const s = d.services.find((x) => x.id === id);
    if (!s) throw new ApiError('Service not found.', 404);
    if (s.sellerId !== me.id) throw new ApiError('You can only edit your own services.', 403);
    validate(f);
    Object.assign(s, {
      title: f.title.trim(), categoryId: f.categoryId, description: f.description.trim(),
      price: Number(f.price), deliveryDays: Number(f.deliveryDays), requirements: (f.requirements || '').trim(),
      images: (f.images || []).filter(Boolean).slice(0, 4),
    });
    if (f.status && SERVICE_STATUSES.includes(f.status)) s.status = f.status;
    return s;
  }, { write: true }),

  setStatus: (id, status) => run('Update service status', (d) => {
    const me = currentUserOrThrow(d);
    const s = d.services.find((x) => x.id === id);
    if (!s) throw new ApiError('Service not found.', 404);
    if (s.sellerId !== me.id && me.role !== 'admin') throw new ApiError('You can only change your own services.', 403);
    if (!SERVICE_STATUSES.includes(status)) throw new ApiError('Invalid status.', 400);
    s.status = status;
    return s;
  }, { write: true }),

  remove: (id) => run('Delete service', (d) => {
    const me = currentUserOrThrow(d);
    const s = d.services.find((x) => x.id === id);
    if (!s) throw new ApiError('Service not found.', 404);
    if (s.sellerId !== me.id && me.role !== 'admin') throw new ApiError('You can only delete your own services.', 403);
    if (d.orders.some((o) => o.serviceId === id && !['Completed', 'Rejected', 'Cancelled'].includes(o.status))) {
      throw new ApiError('This service has active orders. Pause or archive it instead.', 409);
    }
    d.services = d.services.filter((x) => x.id !== id);
    d.favorites = d.favorites.filter((f) => f.serviceId !== id);
    return { ok: true };
  }, { write: true }),

  // Favorites
  listFavorites: () => run('Saved services', (d) => {
    const me = currentUserOrThrow(d);
    return d.favorites.filter((f) => f.userId === me.id)
      .map((f) => d.services.find((s) => s.id === f.serviceId))
      .filter((s) => s && s.status === 'Active').map((s) => hydrateService(d, s));
  }),
  favoriteIds: () => run('Saved services', (d) => {
    const id = getSessionUserId();
    return d.favorites.filter((f) => f.userId === id).map((f) => f.serviceId);
  }, { ms: 30 }),
  toggleFavorite: (serviceId) => run('Save service', (d) => {
    const me = currentUserOrThrow(d);
    const i = d.favorites.findIndex((f) => f.userId === me.id && f.serviceId === serviceId);
    if (i >= 0) { d.favorites.splice(i, 1); return { saved: false }; }
    d.favorites.push({ userId: me.id, serviceId });
    return { saved: true };
  }, { write: true, ms: 80 }),
};
