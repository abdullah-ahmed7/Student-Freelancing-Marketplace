import { apiRequest } from './apiClient';

export { allowedActions } from './orderTransitions';
const enc = encodeURIComponent;

export const orderService = {
  create: ({ serviceId, requirements, requestedDeadline }) =>
    apiRequest('/orders', { method: 'POST', body: { serviceId, requirements, requestedDeadline } }),
  list: () => apiRequest('/orders'),
  get: (id) => apiRequest(`/orders/${enc(id)}`),
  // The server validates state, actor and payload for every action (accept, reject, start, deliver, complete, revise, cancel).
  act: (id, action, payload = {}) => apiRequest(`/orders/${enc(id)}/status`, { method: 'PATCH', body: { action, ...payload } }),
  listMessages: (orderId) => apiRequest(`/orders/${enc(orderId)}/messages`),
  sendMessage: (orderId, text) => apiRequest(`/orders/${enc(orderId)}/messages`, { method: 'POST', body: { text } }),
};
