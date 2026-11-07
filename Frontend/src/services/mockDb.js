// Mock repository. Persists to localStorage under ONE key so it behaves like a single data source.
// Local development adapter. Starts EMPTY (no seed data): users register and create records themselves.
// Stores NO passwords. Only imported by the mock path; never initialised in live API mode.
import { ApiError } from './apiError';
import { DEFAULT_CATEGORIES } from '../utils/constants';

const KEY = 'studenthub_mock_db_v2';
const SESSION_KEY = 'studenthub_mock_session_v2';

function seed() {
  return {
    categories: DEFAULT_CATEGORIES.map((name, i) => ({ id: `cat-${i + 1}`, name, icon: '', active: true })), users: [], services: [], orders: [], messages: [],
    reviews: [], notifications: [], favorites: [], reports: [], portfolio: [],
  };
}

let cache = null;

export function db() {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? JSON.parse(raw) : seed();
  } catch {
    cache = seed();
  }
  return cache;
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* storage unavailable; data lives in memory for this tab */
  }
}

export function resetMockDb() {
  cache = seed();
  save();
  clearSession();
}

export function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function getSessionUserId() {
  try { return localStorage.getItem(SESSION_KEY); } catch { return null; }
}
export function setSession(id) {
  try { localStorage.setItem(SESSION_KEY, id); } catch { /* ignore */ }
}
export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

// Simulated latency so loading states are real and visible.
export const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

export { ApiError };

export function clone(v) { return v === undefined ? v : JSON.parse(JSON.stringify(v)); }
