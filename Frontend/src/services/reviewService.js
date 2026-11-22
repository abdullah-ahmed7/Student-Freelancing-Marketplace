import { apiRequest } from './apiClient';

export const reviewService = {
  create: ({ orderId, rating, comment }) => apiRequest('/reviews', { method: 'POST', body: { orderId, rating, comment } }),
  listAll: () => apiRequest('/reviews'),
  remove: (id) => apiRequest(`/reviews/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};