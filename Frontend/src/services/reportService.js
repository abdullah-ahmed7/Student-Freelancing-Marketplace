import { apiRequest } from './apiClient';

export const reportService = {
  create: ({ targetType, targetId, reason, details }) => apiRequest('/reports', { method: 'POST', body: { targetType, targetId, reason, details } }),
  list: () => apiRequest('/reports'),
  resolve: (id, status) => apiRequest(`/reports/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status } }),
};
