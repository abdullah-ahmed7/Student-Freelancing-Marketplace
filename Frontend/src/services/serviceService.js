import { apiRequest, getToken } from './apiClient';

const enc = encodeURIComponent;
const body = (f) => ({
  title: f.title, categoryId: f.categoryId, description: f.description, price: f.price,
  deliveryDays: f.deliveryDays, requirements: f.requirements, images: f.images, status: f.status,
});

export const serviceService = {
  // Public marketplace: only Active services from active sellers. Returns { items, total, page, pageSize }.
  search: ({ q, categoryId, min, max, maxDelivery, minRating, availableOnly, sort = 'relevance', page = 1, pageSize = 9 } = {}) =>
    apiRequest('/services', { query: { q, categoryId, min, max, maxDelivery, minRating, availableOnly, sort, page, pageSize } }),

  get: (id) => apiRequest(`/services/${enc(id)}`),
  listMine: () => apiRequest('/services/mine'),
  create: (f) => apiRequest('/services', { method: 'POST', body: body(f) }),
  update: (id, f) => apiRequest(`/services/${enc(id)}`, { method: 'PUT', body: body(f) }),
  setStatus: (id, status) => apiRequest(`/services/${enc(id)}/status`, { method: 'PATCH', body: { status } }),
  remove: (id) => apiRequest(`/services/${enc(id)}`, { method: 'DELETE' }),

  // Favorites
  listFavorites: () => apiRequest('/favorites'),
  favoriteIds: async () => (getToken() ? apiRequest('/favorites/ids') : []),
  toggleFavorite: async (serviceId) => {
    const ids = await apiRequest('/favorites/ids');
    if (ids.includes(serviceId)) { await apiRequest(`/favorites/${enc(serviceId)}`, { method: 'DELETE' }); return { saved: false }; }
    await apiRequest(`/favorites/${enc(serviceId)}`, { method: 'POST' });
    return { saved: true };
  },
};
