// Central HTTP client for when real endpoints are confirmed. Not used while USE_MOCK is true.
import { API_BASE_URL } from './config';
import { ApiError } from './apiError';

export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw new ApiError(data?.message || `Request failed (${res.status}).`, res.status, data?.errors);
  return data;
}

export function notConnected(feature) {
  throw new ApiError(
    `${feature}: live API is not connected yet. Set VITE_USE_MOCK=true or supply the endpoint contract.`,
    501,
  );
}
