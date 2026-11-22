// API serialisation. Every endpoint returns frontend-shaped JSON with a string `id`
// (never `_id`/`__v`), so React pages work unchanged with MongoDB ObjectIds.
export const USER_PUBLIC_FIELDS =
  "fullName degree program department semester bio avatarUrl verified availability skills role status createdAt ratingAvg ratingCount";

export const idOf = (v) => (v == null ? null : v._id ? String(v._id) : String(v));
const iso = (d) => (d ? new Date(d).toISOString() : undefined);
const round1 = (n) => Math.round((n || 0) * 10) / 10;
const isDoc = (v) => !!v && typeof v === "object" && v._id !== undefined && v.fullName !== undefined;

export const ratingOf = (o) => ({ avg: round1(o.ratingAvg), count: o.ratingCount || 0 });

export function publicUser(u) {
  if (!u) return null;
  return {
    id: idOf(u),
    fullName: u.fullName, degree: u.degree, program: u.program, department: u.department,
    semester: u.semester, bio: u.bio || "", avatarUrl: u.avatarUrl || "", verified: !!u.verified,
    availability: u.availability !== false,
    skills: (u.skills || []).map((s) => ({ name: s.name, level: s.level })),
    role: u.role, status: u.status, createdAt: iso(u.createdAt), rating: ratingOf(u),
  };
}

// Only ever sent to the account owner or an admin
export const ownUser = (u) => ({ ...publicUser(u), email: u.email });

export function serviceDto(s) {
  const seller = isDoc(s.seller) ? s.seller : null;
  const cat = s.category && s.category.name !== undefined ? s.category : null;
  return {
    id: idOf(s), sellerId: idOf(s.seller), title: s.title,
    categoryId: idOf(s.category), category: cat?.name || "Uncategorised",
    description: s.description, price: s.price, deliveryDays: s.deliveryDays,
    requirements: s.requirements || "", images: s.images || [], status: s.status,
    createdAt: iso(s.createdAt), updatedAt: iso(s.updatedAt),
    seller: seller ? publicUser(seller) : null, rating: ratingOf(s),
  };
}

export const categoryDto = (c) => ({ id: idOf(c), name: c.name, icon: c.icon || "", active: c.active });

export function reviewDto(r) {
  return {
    id: idOf(r), orderId: idOf(r.order), serviceId: idOf(r.service), sellerId: idOf(r.seller),
    buyerId: idOf(r.buyer), rating: r.rating, comment: r.comment, createdAt: iso(r.createdAt),
  };
}

export function orderDto(o, { review } = {}) {
  return {
    id: idOf(o), serviceId: idOf(o.service), serviceTitle: o.serviceTitle, price: o.price,
    deliveryDays: o.deliveryDays, buyerId: idOf(o.buyer), sellerId: idOf(o.seller),
    requirements: o.requirements, requestedDeadline: o.requestedDeadline || "", status: o.status,
    createdAt: iso(o.createdAt), updatedAt: iso(o.updatedAt),
    delivery: o.delivery && o.delivery.message
      ? { message: o.delivery.message, link: o.delivery.link || "", at: iso(o.delivery.at) } : null,
    revisionNote: o.revisionNote || "",
    timeline: (o.timeline || []).map((t) => ({ status: t.status, at: iso(t.at), by: idOf(t.by), note: t.note || "" })),
    buyer: isDoc(o.buyer) ? publicUser(o.buyer) : null,
    seller: isDoc(o.seller) ? publicUser(o.seller) : null,
    review: review ? { id: idOf(review), rating: review.rating, comment: review.comment, createdAt: iso(review.createdAt) } : null,
  };
}

export const messageDto = (m) => ({ id: idOf(m), orderId: idOf(m.order), senderId: idOf(m.sender), text: m.text, at: iso(m.createdAt) });

export const notificationDto = (n) => ({
  id: idOf(n), userId: idOf(n.user), type: n.type, text: n.text, link: n.link || "", read: !!n.read, createdAt: iso(n.createdAt),
});

export const portfolioDto = (p) => ({
  id: idOf(p), userId: idOf(p.user), title: p.title, description: p.description || "", link: p.link || "", createdAt: iso(p.createdAt),
});

export const reportDto = (r, extra = {}) => ({
  id: idOf(r), reporterId: idOf(r.reporter), targetType: r.targetType, targetId: idOf(r.target),
  reason: r.reason, details: r.details || "", status: r.status, createdAt: iso(r.createdAt),
  resolvedAt: iso(r.resolvedAt), ...extra,
});
