// Central HTTP client for the Express/MongoDB backend.
// - attaches the JWT to every request when a session token exists
// - turns every failure into an ApiError (message, status, per-field errors)
// - on an expired/invalid session (401 with a token) clears it and tells the app to log the user out
import { API_BASE_URL } from './config';
import { ApiError } from './apiError';

const TOKEN_KEY = 'studenthub_token';
export const SESSION_EXPIRED_EVENT = 'studenthub:session-expired';

// localStorage holds only the session token, never application data.
export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = (t) => { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* storage unavailable */ } };
export const clearToken = () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } };

function buildUrl(path, query) {
  const qs = new URLSearchParams();
  Object.entries(query || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== false) qs.set(k, v === true ? '1' : String(v));
  });
  const s = qs.toString();
  return `${API_BASE_URL}${path}${s ? `?${s}` : ''}`;
}

// opts.public = true for login/register: a 401 there means "wrong credentials", not "session expired".
export async function apiRequest(path, { method = 'GET', body, query, public: isPublic = false } = {}) {
  const token = getToken();
  let res;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }

  let data = null;
  try { data = await res.json(); } catch { /* empty or non-JSON body */ }

  if (!res.ok) {
    if (res.status === 401 && token && !isPublic) {
      clearToken();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    throw new ApiError(data?.message || `Request failed (${res.status}).`, res.status, data?.errors);
  }
  return data;
}

export function notConnected(feature) {
  throw new ApiError(`${feature}: this feature is only available in mock mode (VITE_USE_MOCK=true).`, 501);
}