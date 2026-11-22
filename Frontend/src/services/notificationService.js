import { apiRequest } from './apiClient';

export const notificationService = {
  list: () => apiRequest('/notifications'),
  // markRead(id) marks one notification; markRead() marks all of them.
  markRead: (id) => apiRequest(id ? `/notifications/${encodeURIComponent(id)}/read` : '/notifications/read', { method: 'PATCH' }),
};
