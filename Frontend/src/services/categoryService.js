import { apiRequest } from './apiClient';

export const categoryService = {
  list: ({ includeInactive = false } = {}) => apiRequest('/categories', { query: { includeInactive } }),
  create: (name) => apiRequest('/categories', { method: 'POST', body: { name } }),
  update: (id, patch) => apiRequest(`/categories/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch }),
  remove: (id) => apiRequest(`/categories/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
