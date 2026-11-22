// Live backend is the default. The browser-local mock database is an OPTIONAL development fallback:
// it is used only when VITE_USE_MOCK is exactly "true".
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// VITE_API_BASE_URL may be "http://localhost:5000/api", "http://localhost:5000" or empty (same-origin "/api",
// which the Vite dev server proxies to the backend). A trailing slash or an already-present "/api" is handled,
// so "/api" is never duplicated.
function resolveBase(raw) {
  const trimmed = String(raw || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '/api';
  return /\/api$/i.test(trimmed) ? trimmed : `${trimmed}/api`;
}
export const API_BASE_URL = resolveBase(import.meta.env.VITE_API_BASE_URL);
