import { apiRequest } from './apiClient';

export const dashboardService = {
  student: () => apiRequest('/dashboard/student'),
  admin: () => apiRequest('/dashboard/admin'),
};
