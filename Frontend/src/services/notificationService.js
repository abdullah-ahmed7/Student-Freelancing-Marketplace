import { run, currentUserOrThrow } from './runtime';

export const notificationService = {
  list: () => run('Notifications', (d) => {
    const me = currentUserOrThrow(d);
    return d.notifications.filter((n) => n.userId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, { ms: 100 }),
  markRead: (id) => run('Notifications', (d) => {
    const me = currentUserOrThrow(d);
    d.notifications.filter((n) => n.userId === me.id && (!id || n.id === id)).forEach((n) => { n.read = true; });
    return { ok: true };
  }, { write: true, ms: 60 }),
};
