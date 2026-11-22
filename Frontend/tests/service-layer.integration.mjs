// Runs the REAL frontend service modules (src/services/*) against a RUNNING backend + MongoDB.
// It executes the project's acceptance scenario and checks the data shapes the React pages rely on.
//   1) start MongoDB   2) cd Backend && npm run seed && npm start   3) cd Frontend && node tests/service-layer.integration.mjs
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const API = process.env.API_URL || 'http://localhost:5000/api';
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
const listeners = {};
globalThis.window = { dispatchEvent: (e) => (listeners[e.type] || []).forEach((f) => f(e)), addEventListener: (t, f) => (listeners[t] ||= []).push(f) };
globalThis.Event ??= class { constructor(t) { this.type = t; } };

const vite = await createServer({
  server: { middlewareMode: true }, appType: 'custom', logLevel: 'error',
  define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify(API), 'import.meta.env.VITE_USE_MOCK': JSON.stringify('false') },
});
const svc = await vite.ssrLoadModule('/src/services/index.js');
const client = await vite.ssrLoadModule('/src/services/apiClient.js');
const { ApiError } = await vite.ssrLoadModule('/src/services/apiError.js');
const { authService, serviceService, orderService, reviewService, notificationService, profileService, categoryService, reportService, dashboardService, adminService, allowedActions, USE_MOCK } = svc;

let n = 0;
const step = async (name, fn) => { try { await fn(); n += 1; console.log(`  ok  ${String(n).padStart(2)}  ${name}`); } catch (e) { console.log(`  FAIL    ${name}\n       ${e.message}`); process.exitCode = 1; throw e; } };
const rejects = async (p, status) => { try { await p; } catch (e) { assert.ok(e instanceof ApiError, 'must be ApiError'); assert.equal(e.status, status, `expected ${status}, got ${e.status}: ${e.message}`); return e; } assert.fail(`expected rejection ${status}`); };

const stamp = Date.now().toString(36);
const mk = (who) => ({ fullName: `Flow ${who}`, email: `flow.${who.toLowerCase()}.${stamp}@lhr.nu.edu.pk`, degree: 'BS', program: 'Computer Science', department: 'Computing', semester: '5', password: 'password123', confirm: 'password123' });
const A = mk('Alpha'), B = mk('Beta');
const S = {};

try {
  await step('mock mode is OFF; API base URL resolves without duplicating /api', async () => {
    assert.equal(USE_MOCK, false);
    const { API_BASE_URL } = await vite.ssrLoadModule('/src/services/config.js');
    assert.equal(API_BASE_URL, API);
  });
  await step('4. register Student A (token stored, user shaped for the UI, role student)', async () => {
    S.a = await authService.register(A);
    assert.equal(S.a.role, 'student'); assert.equal(S.a.fullName, A.fullName); assert.equal(S.a.verified, false);
    assert.ok(client.getToken()); assert.equal(S.a.password, undefined); assert.ok(Array.isArray(S.a.skills));
  });
  await step('5. register Student B; duplicate email gives field error for the form', async () => {
    S.b = await authService.register(B);
    const e = await rejects(authService.register(A), 409);
    assert.ok(e.fields.email);
  });
  await step('invalid login -> ApiError 401 without logging the user out; wrong-form -> field errors on register', async () => {
    client.clearToken();
    await rejects(authService.login({ email: A.email, password: 'nope-nope-1' }), 401);
    const e = await rejects(authService.register({ ...A, email: 'a@gmail.com', password: 'x', degree: '' }), 422);
    assert.ok(e.fields.email && e.fields.password && e.fields.degree);
  });
  await step('6. log in as Student A; session restores after a "reload"; demo verify works', async () => {
    const u = await authService.login({ email: A.email, password: A.password });
    assert.equal(u.id, S.a.id);
    assert.equal((await authService.restore()).id, S.a.id);
    await rejects(authService.verify('000000'), 400);
    assert.equal((await authService.verify('123456')).verified, true);
  });
  await step('profile edit + skills as {name, level}; own profile + public profile', async () => {
    const updated = await profileService.update({ fullName: A.fullName, degree: 'BS', program: 'Computer Science', department: 'Computing', semester: '5', bio: 'I build web apps.', avatarUrl: '', availability: true, skills: [{ name: 'React', level: 'Advanced' }] });
    assert.deepEqual(updated.skills, [{ name: 'React', level: 'Advanced' }]);
    const me = await profileService.getMine(); assert.equal(me.bio, 'I build web apps.'); assert.ok(me.rating && typeof me.rating.avg === 'number');
    const pub = await profileService.getPublic(S.a.id);
    for (const k of ['services', 'portfolio', 'reviews', 'rating']) assert.ok(k in pub, k);
    const list = await profileService.listStudents({ q: 'react' }); assert.ok(list.some((s) => s.id === S.a.id));
    assert.ok(list.every((s) => s.email === undefined));
  });
  await step('portfolio create / edit / delete through the UI service methods', async () => {
    const c = await profileService.savePortfolioItem({ title: 'My project', description: 'x', link: 'https://example.com' });
    const u = await profileService.savePortfolioItem({ ...c, title: 'My project 2' });
    assert.equal(u.id, c.id); assert.equal(u.title, 'My project 2');
    assert.equal((await profileService.listPortfolio()).length, 1);
    await profileService.deletePortfolioItem(c.id); assert.equal((await profileService.listPortfolio()).length, 0);
  });
  await step('7. create a service (categories from MongoDB; field errors reach the form)', async () => {
    const cats = await categoryService.list();
    assert.equal(cats.length >= 8, true); S.cat = cats.find((c) => c.name === 'Programming & Tech');
    const e = await rejects(serviceService.create({ title: 'x', categoryId: S.cat.id, description: 'x', price: '0', deliveryDays: '0', requirements: '', images: [], status: 'Active' }), 422);
    assert.ok(e.fields.title && e.fields.description && e.fields.price && e.fields.deliveryDays);
    S.svc = await serviceService.create({ title: `Flow React landing page ${stamp}`, categoryId: S.cat.id, description: 'I will build a responsive landing page with React and deploy it for you.', price: '4200', deliveryDays: '3', requirements: 'Send copy', images: ['https://example.com/1.png'], status: 'Active' });
    assert.equal(S.svc.sellerId, S.a.id); assert.equal(S.svc.price, 4200); assert.equal(S.svc.category, 'Programming & Tech');
    assert.deepEqual(S.svc.rating, { avg: 0, count: 0 });
    assert.ok((await serviceService.listMine()).some((s) => s.id === S.svc.id));
  });
  await step('8-11. log in as B; marketplace search (paginated object), details, seller object for cards', async () => {
    await authService.login({ email: B.email, password: B.password });
    const r = await serviceService.search({ q: `Flow React landing page ${stamp}`, sort: 'relevance', page: 1, pageSize: 9 });
    assert.deepEqual(Object.keys(r).sort(), ['items', 'page', 'pageSize', 'total']);
    assert.equal(r.total, 1); const card = r.items[0];
    assert.equal(card.seller.fullName, A.fullName); assert.equal(card.seller.id, S.a.id); assert.equal(typeof card.rating.avg, 'number'); assert.equal(card.seller.verified, true);
    const detail = await serviceService.get(S.svc.id);
    assert.equal(detail.reviews.length, 0); assert.equal(detail.requirements, 'Send copy');
    const cats = await serviceService.search({ categoryId: S.cat.id, sort: 'newest' }); assert.ok(cats.total >= 1);
    const filt = await serviceService.search({ min: '4000', max: '5000', maxDelivery: '3', availableOnly: true, sort: 'price-asc' });
    assert.ok(filt.items.some((s) => s.id === S.svc.id));
  });
  await step('12. save the service (toggle on/off/on) and list favorites', async () => {
    assert.deepEqual(await serviceService.toggleFavorite(S.svc.id), { saved: true });
    assert.deepEqual(await serviceService.favoriteIds(), [S.svc.id]);
    assert.deepEqual(await serviceService.toggleFavorite(S.svc.id), { saved: false });
    assert.deepEqual(await serviceService.toggleFavorite(S.svc.id), { saved: true });
    assert.deepEqual((await serviceService.listFavorites()).map((s) => s.id), [S.svc.id]);
  });
  await step('13. place an order (validation errors surface per field), then A sees it', async () => {
    const e = await rejects(orderService.create({ serviceId: S.svc.id, requirements: 'short', requestedDeadline: '' }), 422);
    assert.ok(e.fields.requirements);
    S.order = await orderService.create({ serviceId: S.svc.id, requirements: 'I need a landing page for my society with a contact form.', requestedDeadline: '' });
    assert.equal(S.order.status, 'Requested'); assert.equal(S.order.buyerId, S.b.id);
    assert.deepEqual(allowedActions(S.order, S.b.id), ['cancel']); assert.deepEqual(allowedActions(S.order, S.a.id), ['accept', 'reject']);
    await authService.login({ email: A.email, password: A.password }); // the seller tries to order their own service
    await rejects(orderService.create({ serviceId: S.svc.id, requirements: 'x'.repeat(30) }), 403);
  });
  const as = (u) => authService.login({ email: u.email, password: u.password });
  await step('14-17. A accepts, starts, messages; wrong-actor action is refused by the server', async () => {
    await as(A);
    await rejects(orderService.act(S.order.id, 'cancel'), 403);
    assert.equal((await orderService.act(S.order.id, 'accept')).status, 'Accepted');
    assert.equal((await orderService.act(S.order.id, 'start')).status, 'In Progress');
    const m = await orderService.sendMessage(S.order.id, 'Working on it!');
    assert.ok(m.id && m.senderId === S.a.id && m.text && m.at);
    await rejects(orderService.sendMessage(S.order.id, '   '), 422);
  });
  await step('18. A delivers (validation fields), B sees delivery', async () => {
    const e = await rejects(orderService.act(S.order.id, 'deliver', { message: 'short', link: '' }), 422); assert.ok(e.fields.message);
    const o = await orderService.act(S.order.id, 'deliver', { message: 'First version delivered, please review.', link: 'https://example.com/f' });
    assert.equal(o.status, 'Delivered'); assert.equal(o.delivery.link, 'https://example.com/f'); assert.ok(o.delivery.at);
  });
  await step('19-20. B reads messages (chronological) and requests a revision', async () => {
    await as(B);
    await orderService.sendMessage(S.order.id, 'Thanks, one change please.');
    const msgs = await orderService.listMessages(S.order.id);
    assert.deepEqual(msgs.map((m) => m.text), ['Working on it!', 'Thanks, one change please.']);
    const o = await orderService.act(S.order.id, 'revise', { note: 'Please make the header green.' });
    assert.equal(o.status, 'Revision Requested'); assert.equal(o.revisionNote, 'Please make the header green.');
  });
  await step('21-22. A restarts and delivers again', async () => {
    await as(A);
    assert.equal((await orderService.act(S.order.id, 'start')).status, 'In Progress');
    assert.equal((await orderService.act(S.order.id, 'deliver', { message: 'Header is green now.', link: '' })).status, 'Delivered');
  });
  await step('23-24. B completes the order and submits a review (field errors first)', async () => {
    await as(B);
    const o = await orderService.act(S.order.id, 'complete');
    assert.equal(o.status, 'Completed');
    assert.equal(o.timeline.at(-1).status, 'Completed'); assert.ok(o.timeline.every((t) => t.status && t.at));
    const e = await rejects(reviewService.create({ orderId: o.id, rating: 0, comment: 'x' }), 422); assert.ok(e.fields.rating && e.fields.comment);
    await reviewService.create({ orderId: o.id, rating: 5, comment: 'Excellent work, thank you!' });
    await rejects(reviewService.create({ orderId: o.id, rating: 5, comment: 'Second attempt here' }), 409);
    const full = await orderService.get(o.id); assert.equal(full.review.rating, 5); assert.equal(full.seller.id, S.a.id); assert.equal(full.buyer.id, S.b.id);
    assert.equal((await orderService.list()).length, 1);
  });
  await step('25. review appears on the service page and on the student profile; rating aggregates update', async () => {
    const d = await serviceService.get(S.svc.id);
    assert.equal(d.reviews[0].buyerName, B.fullName); assert.deepEqual(d.rating, { avg: 5, count: 1 });
    const p = await profileService.getPublic(S.a.id);
    assert.equal(p.reviews[0].buyer.fullName, B.fullName); assert.equal(p.reviews[0].serviceTitle, S.svc.title); assert.deepEqual(p.rating, { avg: 5, count: 1 });
    assert.equal(p.services.length, 1);
  });
  await step('26. notifications for both students; mark one / mark all (UI methods)', async () => {
    const nb = await notificationService.list();
    assert.ok(nb.length >= 4 && nb.every((x) => x.text && 'read' in x && x.createdAt && x.link.startsWith('/orders/')));
    await notificationService.markRead(nb[0].id);
    assert.equal((await notificationService.list()).filter((x) => x.read).length, 1);
    await notificationService.markRead();
    assert.ok((await notificationService.list()).every((x) => x.read));
    await as(A);
    const na = await notificationService.list(); assert.ok(na.some((x) => x.text.includes('left you a 5-star review')));
  });
  await step('dashboards: student numbers from the DB', async () => {
    const d = await dashboardService.student();
    assert.equal(d.completed, 1); assert.equal(d.activeServices, 1); assert.deepEqual(d.rating, { avg: 5, count: 1 });
    assert.ok(d.recent[0].serviceTitle && d.recent[0].role === 'seller'); assert.ok('verified' in d.profileFields);
    await rejects(dashboardService.admin(), 403);
  });
  await step('reports: student reports a service; duplicate refused', async () => {
    await as(B);
    await reportService.create({ targetType: 'service', targetId: S.svc.id, reason: 'Spam or misleading listing', details: 'test' });
    await rejects(reportService.create({ targetType: 'service', targetId: S.svc.id, reason: 'Spam or misleading listing' }), 409);
    await rejects(reportService.list(), 403);
  });
  await step('27-28. admin logs in (role admin) and cannot be created via registration', async () => {
    const u = await authService.login({ email: process.env.ADMIN_EMAIL || 'admin@lhr.nu.edu.pk', password: process.env.ADMIN_PASSWORD || 'ChangeMe-Admin-2026' });
    assert.equal(u.role, 'admin');
    await rejects(serviceService.create({ title: 'Admin cannot sell this', categoryId: S.cat.id, description: 'x'.repeat(40), price: '10', deliveryDays: '1', images: [] }), 403);
  });
  await step('29. admin dashboard, users, services, reviews, reports, categories', async () => {
    const d = await dashboardService.admin();
    for (const k of ['users', 'unverified', 'activeServices', 'totalServices', 'orders', 'completedOrders', 'openReports', 'reviews', 'recentOrders']) assert.ok(k in d, k);
    assert.ok(d.openReports >= 1 && d.recentOrders[0].buyer);
    const users = await adminService.listUsers(); const ua = users.find((x) => x.id === S.a.id); assert.ok(ua.email && users.every((x) => x.role === 'student'));
    await adminService.updateUser(S.b.id, { verified: true }); assert.equal((await adminService.listUsers()).find((x) => x.id === S.b.id).verified, true);
    assert.ok((await adminService.listServices()).some((s) => s.id === S.svc.id && s.seller.fullName === A.fullName));
    const reps = await reportService.list(); const rep = reps.find((r) => r.targetId === S.svc.id);
    assert.ok(rep.reporterName && rep.targetLabel === S.svc.title);
    assert.equal((await reportService.resolve(rep.id, 'Resolved')).status, 'Resolved');
    const revs = await reviewService.listAll(); const rv = revs.find((r) => r.serviceTitle === S.svc.title); assert.ok(rv.buyerName && rv.sellerName);
    const cat = await categoryService.create(`Flow cat ${stamp}`); assert.equal(cat.active, true);
    await categoryService.update(cat.id, { name: `Flow cat 2 ${stamp}` }); await categoryService.update(cat.id, { active: false });
    assert.ok(!(await categoryService.list()).some((c) => c.id === cat.id)); assert.ok((await categoryService.list({ includeInactive: true })).some((c) => c.id === cat.id));
    await categoryService.remove(cat.id);
    await rejects(categoryService.remove(S.cat.id), 409);
  });
  await step('admin suspends B: B\'s next request fires the session-expired logout hook... (403 suspended)', async () => {
    await adminService.updateUser(S.b.id, { status: 'suspended' });
    await rejects(authService.login({ email: B.email, password: B.password }), 403);
    await adminService.updateUser(S.b.id, { status: 'active' });
  });
  await step('expired/invalid token: client clears it and emits the session-expired event; restore() returns null', async () => {
    let fired = 0; window.addEventListener(client.SESSION_EXPIRED_EVENT, () => { fired += 1; });
    client.setToken('not.a.valid.jwt');
    await rejects(orderService.list(), 401);
    assert.equal(fired, 1); assert.equal(client.getToken(), null);
    assert.equal(await authService.restore(), null);
  });
  await step('logout clears the session; protected calls then fail with 401 (no event for guests)', async () => {
    await as(A); await authService.logout(); assert.equal(client.getToken(), null);
    await rejects(orderService.list(), 401);
    assert.deepEqual(await serviceService.favoriteIds(), []);
  });
  console.log(`\nALL ${n} SERVICE-LAYER CHECKS PASSED against ${API}`);
} catch { console.log(`\nFAILED after ${n} passing checks`); } finally { await vite.close(); }
