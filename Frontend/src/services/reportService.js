import { run, currentUserOrThrow, requireAdmin } from './runtime';
import { ApiError } from './apiError';
import { uid } from './mockDb';

export const reportService = {
  create: ({ targetType, targetId, reason, details }) => run('Report', (d) => {
    const me = currentUserOrThrow(d);
    if (!reason) throw new ApiError('Choose a reason.', 422);
    if (d.reports.some((r) => r.reporterId === me.id && r.targetId === targetId && r.status === 'Open')) {
      throw new ApiError('You already have an open report on this.', 409);
    }
    const r = { id: uid('rp'), reporterId: me.id, targetType, targetId, reason, details: (details || '').trim(), status: 'Open', createdAt: new Date().toISOString() };
    d.reports.unshift(r);
    return r;
  }, { write: true }),

  list: () => run('Reports', (d) => {
    requireAdmin(d);
    return d.reports.map((r) => {
      const target = r.targetType === 'service'
        ? d.services.find((s) => s.id === r.targetId)?.title
        : d.users.find((u) => u.id === r.targetId)?.fullName;
      return { ...r, reporterName: d.users.find((u) => u.id === r.reporterId)?.fullName, targetLabel: target || '(removed)' };
    });
  }),

  resolve: (id, status) => run('Resolve report', (d) => {
    requireAdmin(d);
    const r = d.reports.find((x) => x.id === id);
    if (!r) throw new ApiError('Report not found.', 404);
    r.status = status;
    return r;
  }, { write: true }),
};
