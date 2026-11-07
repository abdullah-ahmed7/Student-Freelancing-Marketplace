// Mock repository. Persists to localStorage under ONE key so it behaves like a single data source.
// This is demo-only infrastructure. It stores NO passwords. Swap services/* to real HTTP calls later.
import {
  seedCategories, seedUsers, seedServices, seedOrders, seedMessages,
  seedReviews, seedNotifications, seedFavorites, seedReports,
} from '../data/mockSeed';

const KEY = 'studenthub_mock_db_v2';
const SESSION_KEY = 'studenthub_mock_session_v2';

function seed() {
  return {
    categories: seedCategories, users: seedUsers, services: seedServices, orders: seedOrders,
    messages: seedMessages, reviews: seedReviews, notifications: seedNotifications,
    favorites: seedFavorites, reports: seedReports, portfolio: [],
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

export class ApiError extends Error {
  constructor(message, status = 400, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export function clone(v) { return v === undefined ? v : JSON.parse(JSON.stringify(v)); }
