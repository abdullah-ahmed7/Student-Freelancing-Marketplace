import { run, requireAdmin } from './runtime';
import { ApiError, uid } from './mockDb';

export const categoryService = {
  list: ({ includeInactive = false } = {}) => run('Categories', (d) =>
    d.categories.filter((c) => includeInactive || c.active), { ms: 80 }),

  create: (name) => run('Create category', (d) => {
    requireAdmin(d);
    const n = name.trim();
    if (!n) throw new ApiError('Enter a category name.', 400);
    if (d.categories.some((c) => c.name.toLowerCase() === n.toLowerCase())) throw new ApiError('That category already exists.', 409);
    const c = { id: uid('cat'), name: n, icon: '🏷️', active: true };
    d.categories.push(c);
    return c;
  }, { write: true }),

  update: (id, patch) => run('Update category', (d) => {
    requireAdmin(d);
    const c = d.categories.find((x) => x.id === id);
    if (!c) throw new ApiError('Category not found.', 404);
    if (patch.name !== undefined) {
      if (!patch.name.trim()) throw new ApiError('Enter a category name.', 400);
      c.name = patch.name.trim();
    }
    if (patch.active !== undefined) c.active = patch.active;
    return c;
  }, { write: true }),

  remove: (id) => run('Delete category', (d) => {
    requireAdmin(d);
    if (d.services.some((s) => s.categoryId === id)) throw new ApiError('This category has services. Deactivate it instead.', 409);
    d.categories = d.categories.filter((c) => c.id !== id);
    return { ok: true };
  }, { write: true }),
};
