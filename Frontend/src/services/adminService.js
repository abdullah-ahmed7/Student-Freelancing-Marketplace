import { apiRequest } from './apiClient';

export const adminService = {
  listUsers: () => apiRequest('/admin/users'),
  getUser: (id) => apiRequest(`/admin/users/${encodeURIComponent(id)}`),
  updateUser: (id, patch) => apiRequest(`/admin/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch }),
  listServices: () => apiRequest('/admin/services'),
};
