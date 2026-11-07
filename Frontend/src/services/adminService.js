import { run, requireAdmin, hydrateService } from './runtime';
import { ApiError } from './apiError';

export const adminService = {
  listUsers: () => run('Users', (d) => {
    requireAdmin(d);
    return d.users.filter((u) => u.role === 'student');
  }),
  updateUser: (id, patch) => run('Update user', (d) => {
    requireAdmin(d);
    const u = d.users.find((x) => x.id === id);
    if (!u || u.role === 'admin') throw new ApiError('User not found.', 404);
    if (patch.status) u.status = patch.status;
    if (patch.verified !== undefined) u.verified = patch.verified;
    return u;
  }, { write: true }),
  listServices: () => run('Services', (d) => {
    requireAdmin(d);
    return d.services.map((s) => hydrateService(d, s)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }),
};
