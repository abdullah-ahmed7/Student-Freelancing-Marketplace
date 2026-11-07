import { run, currentUserOrThrow, requireAdmin, ratingFor } from './runtime';

const OPEN = ['Requested', 'Accepted', 'In Progress', 'Delivered', 'Revision Requested'];

export const dashboardService = {
  student: () => run('Dashboard', (d) => {
    const me = currentUserOrThrow(d);
    const mine = d.orders.filter((o) => o.buyerId === me.id || o.sellerId === me.id);
    return {
      activeServices: d.services.filter((s) => s.sellerId === me.id && s.status === 'Active').length,
      incomingActive: mine.filter((o) => o.sellerId === me.id && OPEN.includes(o.status)).length,
      outgoingActive: mine.filter((o) => o.buyerId === me.id && OPEN.includes(o.status)).length,
      completed: mine.filter((o) => o.status === 'Completed').length,
      rating: ratingFor(d, (r) => r.sellerId === me.id),
      recent: mine.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5).map((o) => ({
        id: o.id, serviceTitle: o.serviceTitle, status: o.status, createdAt: o.createdAt,
        role: o.buyerId === me.id ? 'buyer' : 'seller',
      })),
      notifications: d.notifications.filter((n) => n.userId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
      profileFields: { bio: !!me.bio, avatar: !!me.avatarUrl, skills: me.skills.length > 0, verified: me.verified },
    };
  }),

  admin: () => run('Admin dashboard', (d) => {
    requireAdmin(d);
    return {
      users: d.users.filter((u) => u.role === 'student').length,
      unverified: d.users.filter((u) => u.role === 'student' && !u.verified).length,
      activeServices: d.services.filter((s) => s.status === 'Active').length,
      totalServices: d.services.length,
      orders: d.orders.length,
      completedOrders: d.orders.filter((o) => o.status === 'Completed').length,
      openReports: d.reports.filter((r) => r.status === 'Open').length,
      reviews: d.reviews.length,
      recentOrders: d.orders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6).map((o) => ({
        id: o.id, serviceTitle: o.serviceTitle, status: o.status, createdAt: o.createdAt,
        buyer: d.users.find((u) => u.id === o.buyerId)?.fullName, seller: d.users.find((u) => u.id === o.sellerId)?.fullName,
      })),
    };
  }),
};
