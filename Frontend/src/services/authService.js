import { apiRequest, clearToken, getToken, setToken } from './apiClient';
import { ApiError } from './apiError';

export const authService = {
  login: async ({ email, password }) => {
    const { token, user } = await apiRequest('/auth/login', { method: 'POST', body: { email, password }, public: true });
    setToken(token);
    return user;
  },

  register: async (f) => {
    const body = {
      fullName: f.fullName, email: f.email, degree: f.degree, program: f.program,
      department: f.department, semester: f.semester, password: f.password,
    };
    const { token, user } = await apiRequest('/auth/register', { method: 'POST', body, public: true });
    setToken(token);
    return user;
  },

  // Restores the session after a page reload from the stored token.
  restore: async () => {
    if (!getToken()) return null;
    try {
      return await apiRequest('/auth/me');
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) { clearToken(); return null; }
      throw err; // network/server problem: keep the token, let the caller decide
    }
  },

  logout: async () => { clearToken(); },

  // Demo verification (no email is sent): the backend compares the code with its DEMO_OTP setting.
  verify: (code) => apiRequest('/auth/verify', { method: 'POST', body: { code } }),
};
