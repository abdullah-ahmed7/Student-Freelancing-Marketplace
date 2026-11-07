import { USE_MOCK } from './config';
import { notConnected } from './apiClient';
import { db, save, delay, clone, ApiError, getSessionUserId } from './mockDb';

// Runs a mock-backed operation with simulated latency. When live mode is selected and no
// endpoint contract exists yet, it fails loudly instead of silently inventing endpoints.
export async function run(feature, fn, { write = false, ms = 250 } = {}) {
  if (!USE_MOCK) notConnected(feature);
  await delay(ms);
  const result = fn(db());
  if (write) save();
  return clone(result);
}

export function currentUserOrThrow(d) {
  const id = getSessionUserId();
  const user = d.users.find((u) => u.id === id);
  if (!user) throw new ApiError('Please log in to continue.', 401);
  if (user.status === 'suspended') throw new ApiError('Your account is suspended.', 403);
  return user;
}

export function requireAdmin(d) {
  const u = currentUserOrThrow(d);
  if (u.role !== 'admin') throw new ApiError('Admin access required.', 403);
  return u;
}

export function ratingFor(d, pred) {
  const rs = d.reviews.filter(pred);
  const count = rs.length;
  const avg = count ? rs.reduce((a, r) => a + r.rating, 0) / count : 0;
  return { avg: Math.round(avg * 10) / 10, count };
}

export function publicUser(d, u) {
  if (!u) return null;
  return {
    id: u.id, fullName: u.fullName, degree: u.degree, program: u.program, department: u.department,
    semester: u.semester, bio: u.bio, avatarUrl: u.avatarUrl, verified: u.verified,
    availability: u.availability, skills: u.skills, role: u.role, status: u.status, createdAt: u.createdAt,
    rating: ratingFor(d, (r) => r.sellerId === u.id),
  };
}

export function hydrateService(d, s) {
  const cat = d.categories.find((c) => c.id === s.categoryId);
  const seller = d.users.find((u) => u.id === s.sellerId);
  return {
    ...s,
    category: cat?.name || 'Uncategorised',
    seller: publicUser(d, seller),
    rating: ratingFor(d, (r) => r.serviceId === s.id),
  };
}

export function notify(d, userId, text, link) {
  d.notifications.unshift({
    id: `n-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    userId, text, link, read: false, createdAt: new Date().toISOString(),
  });
}
