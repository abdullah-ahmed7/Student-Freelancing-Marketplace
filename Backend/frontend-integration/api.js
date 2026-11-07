// Put this file at Frontend/src/api/api.js
// Optional: add VITE_API_URL=http://localhost:5000/api to Frontend/.env
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const getToken = () => localStorage.getItem('studenthub_token');
export const getUser = () => {
  try { return JSON.parse(localStorage.getItem('studenthub_user')); } catch { return null; }
};
export function logout() {
  localStorage.removeItem('studenthub_token');
  localStorage.removeItem('studenthub_user');
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

function saveSession({ token, user }) {
  localStorage.setItem('studenthub_token', token);
  localStorage.setItem('studenthub_user', JSON.stringify(user));
  return user;
}

// Auth
export const register = (form) => request('/auth/register', { method: 'POST', body: form }).then(saveSession);
export const login = (form) => request('/auth/login', { method: 'POST', body: form }).then(saveSession);

// Services
export const getAllServices = (params = {}) =>
  request(`/services?${new URLSearchParams(params)}`);
export const getServiceById = (id) => request(`/services/${id}`);
export const getMyServices = () => request('/services/mine');
export const createService = (service) => request('/services', { method: 'POST', body: service });

// Orders
export const placeOrder = (serviceId, requirements) =>
  request('/orders', { method: 'POST', body: { serviceId, requirements } });
export const getMyOrders = (asSeller = false) =>
  request(`/orders${asSeller ? '?as=seller' : ''}`);
