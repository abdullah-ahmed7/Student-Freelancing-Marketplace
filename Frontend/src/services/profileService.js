import { apiRequest } from './apiClient';

export const profileService = {
  getMine: () => apiRequest('/profiles/me'),
  update: (patch) => apiRequest('/profiles/me', { method: 'PUT', body: patch }),
  getPublic: (id) => apiRequest(`/profiles/${encodeURIComponent(id)}`),
  listStudents: ({ q = '', availableOnly = false } = {}) => apiRequest('/profiles/students', { query: { q, availableOnly } }),

  // Portfolio
  listPortfolio: () => apiRequest('/portfolio'),
  savePortfolioItem: (item) => {
    const body = { title: item.title, description: item.description, link: item.link };
    return item.id
      ? apiRequest(`/portfolio/${encodeURIComponent(item.id)}`, { method: 'PUT', body })
      : apiRequest('/portfolio', { method: 'POST', body });
  },
  deletePortfolioItem: (id) => apiRequest(`/portfolio/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
