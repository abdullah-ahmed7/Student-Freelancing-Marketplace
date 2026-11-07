import { run, currentUserOrThrow, publicUser, hydrateService } from './runtime';
import { ApiError } from './apiError';
import { uid } from './mockDb';

export const profileService = {
  getMine: () => run('Profile', (d) => ({
    ...currentUserOrThrow(d),
    rating: publicUser(d, currentUserOrThrow(d)).rating,
  })),

  update: (patch) => run('Update profile', (d) => {
    const me = currentUserOrThrow(d);
    const allowed = ['fullName', 'degree', 'program', 'department', 'semester', 'bio', 'avatarUrl', 'availability', 'skills'];
    for (const k of allowed) if (k in patch) me[k] = patch[k];
    return me;
  }, { write: true }),

  getPublic: (id) => run('Student profile', (d) => {
    const u = d.users.find((x) => x.id === id && x.role === 'student' && x.status === 'active');
    if (!u) throw new ApiError('Student not found.', 404);
    return {
      ...publicUser(d, u),
      services: d.services.filter((s) => s.sellerId === id && s.status === 'Active').map((s) => hydrateService(d, s)),
      portfolio: d.portfolio.filter((p) => p.userId === id),
      reviews: d.reviews.filter((r) => r.sellerId === id).map((r) => ({
        ...r, buyer: publicUser(d, d.users.find((x) => x.id === r.buyerId)),
        serviceTitle: d.services.find((s) => s.id === r.serviceId)?.title,
      })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  }),

  listStudents: ({ q = '', availableOnly = false } = {}) => run('Students', (d) => {
    const t = q.toLowerCase().trim();
    return d.users
      .filter((u) => u.role === 'student' && u.status === 'active')
      .filter((u) => !availableOnly || u.availability)
      .filter((u) => !t || [u.fullName, u.program, u.department, ...u.skills.map((s) => s.name)]
        .some((x) => x.toLowerCase().includes(t)))
      .map((u) => publicUser(d, u));
  }),

  // Portfolio
  listPortfolio: () => run('Portfolio', (d) => {
    const me = currentUserOrThrow(d);
    return d.portfolio.filter((p) => p.userId === me.id);
  }),
  savePortfolioItem: (item) => run('Save portfolio item', (d) => {
    const me = currentUserOrThrow(d);
    if (item.id) {
      const ex = d.portfolio.find((p) => p.id === item.id && p.userId === me.id);
      if (!ex) throw new ApiError('Portfolio item not found.', 404);
      Object.assign(ex, { title: item.title, description: item.description, link: item.link });
      return ex;
    }
    const created = { id: uid('p'), userId: me.id, title: item.title, description: item.description, link: item.link, createdAt: new Date().toISOString() };
    d.portfolio.unshift(created);
    return created;
  }, { write: true }),
  deletePortfolioItem: (id) => run('Delete portfolio item', (d) => {
    const me = currentUserOrThrow(d);
    const i = d.portfolio.findIndex((p) => p.id === id && p.userId === me.id);
    if (i < 0) throw new ApiError('Portfolio item not found.', 404);
    d.portfolio.splice(i, 1);
    return { ok: true };
  }, { write: true }),
};
