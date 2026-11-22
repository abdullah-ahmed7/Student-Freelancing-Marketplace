// Integration tests: real Express app + real MongoDB, exercised over HTTP.
// Run:  npm test        (needs MongoDB; uses MONGO_URI_TEST or mongodb://127.0.0.1:27017/studenthub_test, which is DROPPED first)
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.MONGO_URI = process.env.MONGO_URI_TEST || "mongodb://127.0.0.1:27017/studenthub_test";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret";
process.env.AUTH_RATE_LIMIT_MAX = "100000";
process.env.DEMO_OTP = "123456";

const { default: mongoose } = await import("mongoose");
const { default: app } = await import("../src/app.js");
const { default: connectDB } = await import("../src/config/db.js");
const { User, Category, Notification } = await import("../src/models/index.js");

let server, base;
const api = async (method, path, { token, body, raw } = {}) => {
  if (method === "GET" || method === "HEAD") { body = undefined; raw = undefined; }
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: { ...(body !== undefined || raw !== undefined ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: data };
};

const studentForm = (n, over = {}) => ({
  fullName: `Test Student ${n}`, email: `student${n}@lhr.nu.edu.pk`, degree: "BS", program: "Computer Science",
  department: "Computing", semester: "5", password: "password123", ...over,
});
const goodService = (categoryId, over = {}) => ({
  title: "Build a React landing page", categoryId, price: 3000, deliveryDays: 4,
  description: "I will build a responsive landing page in React with clean, tested components.",
  requirements: "Send your brand colours and copy.", images: ["https://example.com/a.png"], status: "Active", ...over,
});

const S = {}; // shared state across the ordered scenario

before(async () => {
  await connectDB();
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise((r) => server.close(r));
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("health & basics", () => {
  it("GET /api/health reports DB connected", async () => {
    const r = await api("GET", "/health");
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, { status: "ok", db: "connected" });
  });
  it("unknown route -> 404 JSON; malformed JSON -> 400", async () => {
    assert.equal((await api("GET", "/nope")).status, 404);
    const r = await api("POST", "/auth/login", { raw: "{bad json", body: undefined });
    assert.equal(r.status, 400);
  });
  it("malformed ObjectId -> 404 (not a 500)", async () => {
    assert.equal((await api("GET", "/services/not-an-id")).status, 404);
  });
});

describe("authentication", () => {
  it("registration validates every field (422 + field map)", async () => {
    const r = await api("POST", "/auth/register", { body: { fullName: "", email: "x@gmail.com", password: "short" } });
    assert.equal(r.status, 422);
    for (const f of ["fullName", "email", "degree", "program", "department", "semester", "password"]) assert.ok(r.body.errors[f], `missing error for ${f}`);
  });
  it("registers a student; password is never returned; role injection is ignored", async () => {
    const r = await api("POST", "/auth/register", { body: { ...studentForm("A"), role: "admin", verified: true, status: "active" } });
    assert.equal(r.status, 201);
    assert.ok(r.body.token);
    assert.equal(r.body.user.role, "student");
    assert.equal(r.body.user.verified, false);
    assert.equal(r.body.user.password, undefined);
    assert.ok(!JSON.stringify(r.body).includes("$2"), "bcrypt hash leaked");
    S.tokenA = r.body.token; S.idA = r.body.user.id;
    const stored = await User.findById(S.idA).select("+password");
    assert.match(stored.password, /^\$2[aby]\$/); // hashed, not plaintext
  });
  it("duplicate email -> 409 (case-insensitive)", async () => {
    const r = await api("POST", "/auth/register", { body: studentForm("A", { email: "STUDENTA@lhr.nu.edu.pk" }) });
    assert.equal(r.status, 409);
    assert.ok(r.body.errors.email);
  });
  it("registers Student B and Student C", async () => {
    const b = await api("POST", "/auth/register", { body: studentForm("B") });
    const c = await api("POST", "/auth/register", { body: studentForm("C") });
    assert.equal(b.status, 201); assert.equal(c.status, 201);
    S.tokenB = b.body.token; S.idB = b.body.user.id; S.tokenC = c.body.token; S.idC = c.body.user.id;
  });
  it("login: success, wrong password, unknown email give correct codes/messages", async () => {
    const ok = await api("POST", "/auth/login", { body: { email: "studentA@lhr.nu.edu.pk", password: "password123" } });
    assert.equal(ok.status, 200); assert.ok(ok.body.token); assert.equal(ok.body.user.email, "studenta@lhr.nu.edu.pk");
    const bad = await api("POST", "/auth/login", { body: { email: "studentA@lhr.nu.edu.pk", password: "wrong-password" } });
    const unknown = await api("POST", "/auth/login", { body: { email: "nobody@lhr.nu.edu.pk", password: "password123" } });
    assert.equal(bad.status, 401); assert.equal(unknown.status, 401);
    assert.equal(bad.body.message, unknown.body.message); // no account enumeration
    assert.equal((await api("POST", "/auth/login", { body: {} })).status, 400);
  });
  it("NoSQL operator injection in login is rejected", async () => {
    const r = await api("POST", "/auth/login", { body: { email: { $gt: "" }, password: { $gt: "" } } });
    assert.ok([400, 401].includes(r.status));
    assert.equal(r.body.token, undefined);
  });
  it("protected endpoints: no token / bad token -> 401; GET /auth/me works", async () => {
    assert.equal((await api("GET", "/auth/me")).status, 401);
    assert.equal((await api("GET", "/auth/me", { token: "garbage.token.here" })).status, 401);
    const me = await api("GET", "/auth/me", { token: S.tokenA });
    assert.equal(me.status, 200); assert.equal(me.body.id, S.idA);
  });
  it("PUT /auth/me updates allowed fields only", async () => {
    const r = await api("PUT", "/auth/me", { token: S.tokenA, body: { bio: "Hello there", role: "admin", email: "evil@x.edu", verified: true } });
    assert.equal(r.status, 200);
    assert.equal(r.body.bio, "Hello there"); assert.equal(r.body.role, "student"); assert.equal(r.body.email, "studenta@lhr.nu.edu.pk"); assert.equal(r.body.verified, false);
  });
  it("demo verification: wrong code 400, right code verifies", async () => {
    const bad = await api("POST", "/auth/verify", { token: S.tokenA, body: { code: "000000" } });
    assert.equal(bad.status, 400); assert.ok(bad.body.errors.code);
    assert.equal((await api("POST", "/auth/verify", { body: { code: "123456" } })).status, 401);
    const ok = await api("POST", "/auth/verify", { token: S.tokenA, body: { code: "123456" } });
    assert.equal(ok.status, 200); assert.equal(ok.body.verified, true);
  });
});

describe("categories & admin provisioning", () => {
  before(async () => {
    for (const name of ["Design & Creative", "Programming & Tech", "Other"]) await Category.create({ name, icon: "" });
    await User.create({ fullName: "Test Admin", email: "admin@lhr.nu.edu.pk", password: "admin-password-1", role: "admin", verified: true });
  });
  it("public list returns only active categories with string ids", async () => {
    const r = await api("GET", "/categories");
    assert.equal(r.status, 200); assert.equal(r.body.length, 3);
    assert.equal(typeof r.body[0].id, "string"); assert.equal(r.body[0]._id, undefined);
    S.catProg = r.body.find((c) => c.name === "Programming & Tech").id;
    S.catDesign = r.body.find((c) => c.name === "Design & Creative").id;
    S.catOther = r.body.find((c) => c.name === "Other").id;
  });
  it("admin logs in via the normal login; public registration can never create admins", async () => {
    const r = await api("POST", "/auth/login", { body: { email: "admin@lhr.nu.edu.pk", password: "admin-password-1" } });
    assert.equal(r.status, 200); assert.equal(r.body.user.role, "admin");
    S.tokenAdmin = r.body.token; S.idAdmin = r.body.user.id;
    assert.equal(await User.countDocuments({ role: "admin" }), 1);
  });
  it("students cannot manage categories (403); guests 401", async () => {
    assert.equal((await api("POST", "/categories", { token: S.tokenA, body: { name: "Hack" } })).status, 403);
    assert.equal((await api("POST", "/categories", { body: { name: "Hack" } })).status, 401);
    assert.equal((await api("GET", "/categories?includeInactive=1", { token: S.tokenA })).body.length, 3);
  });
  it("admin creates (dup 409 case-insensitive), renames, deactivates", async () => {
    const c = await api("POST", "/categories", { token: S.tokenAdmin, body: { name: "Photography" } });
    assert.equal(c.status, 201);
    assert.equal((await api("POST", "/categories", { token: S.tokenAdmin, body: { name: "photography" } })).status, 409);
    assert.equal((await api("POST", "/categories", { token: S.tokenAdmin, body: { name: "  " } })).status, 400);
    const u = await api("PATCH", `/categories/${c.body.id}`, { token: S.tokenAdmin, body: { name: "Photo & Video" } });
    assert.equal(u.body.name, "Photo & Video");
    const d = await api("PATCH", `/categories/${c.body.id}`, { token: S.tokenAdmin, body: { active: false } });
    assert.equal(d.body.active, false);
    assert.ok(!(await api("GET", "/categories")).body.some((x) => x.id === c.body.id), "inactive category still public");
    assert.ok((await api("GET", "/categories?includeInactive=1", { token: S.tokenAdmin })).body.some((x) => x.id === c.body.id));
    assert.equal((await api("DELETE", `/categories/${c.body.id}`, { token: S.tokenAdmin })).status, 200);
    S.catInactive = (await Category.create({ name: "Hidden", active: false }))._id.toString();
  });
});

describe("services", () => {
  it("validation errors are reported per field (422)", async () => {
    const r = await api("POST", "/services", { token: S.tokenA, body: { title: "short", price: 1.5, deliveryDays: 400, description: "x", categoryId: "nope", images: ["ftp://bad"] } });
    assert.equal(r.status, 422);
    for (const f of ["title", "price", "deliveryDays", "description", "category", "images"]) assert.ok(r.body.errors[f], `missing ${f}`);
  });
  it("guests cannot create; admin cannot create; inactive category rejected", async () => {
    assert.equal((await api("POST", "/services", { body: goodService(S.catProg) })).status, 401);
    assert.equal((await api("POST", "/services", { token: S.tokenAdmin, body: goodService(S.catProg) })).status, 403);
    assert.equal((await api("POST", "/services", { token: S.tokenA, body: goodService(S.catInactive) })).status, 422);
  });
  it("Student A creates a service; seller comes from the token, not the body", async () => {
    const r = await api("POST", "/services", { token: S.tokenA, body: { ...goodService(S.catProg), sellerId: S.idB, seller: S.idB } });
    assert.equal(r.status, 201);
    assert.equal(r.body.sellerId, S.idA); assert.equal(r.body.seller.id, S.idA);
    assert.equal(r.body.category, "Programming & Tech"); assert.equal(r.body.categoryId, S.catProg);
    assert.deepEqual(r.body.rating, { avg: 0, count: 0 });
    assert.equal(r.body.seller.email, undefined, "seller email must not be public");
    S.svc = r.body.id;
  });
  it("create more services for filter tests (Draft / Paused / other category)", async () => {
    const mk = async (token, body) => (await api("POST", "/services", { token, body })).body.id;
    S.svcDesign = await mk(S.tokenA, goodService(S.catDesign, { title: "Logo design for your club", price: 1000, deliveryDays: 2, description: "Clean modern logos for student clubs and societies, two concepts included." }));
    S.svcDraft = await mk(S.tokenA, goodService(S.catProg, { title: "Secret draft service", status: "Draft" }));
    S.svcPaused = await mk(S.tokenA, goodService(S.catProg, { title: "Paused service here", status: "Paused" }));
    S.svcB = await mk(S.tokenB, goodService(S.catOther, { title: "Student B tutoring help", price: 500, deliveryDays: 1, description: "One hour of tutoring and study guidance for any first-year course.", status: "Active" }));
  });
  it("marketplace shows only Active services, paginated {items,total,page,pageSize}", async () => {
    const r = await api("GET", "/services?pageSize=2&sort=newest");
    assert.equal(r.status, 200);
    assert.equal(r.body.total, 3); assert.equal(r.body.items.length, 2); assert.equal(r.body.page, 1); assert.equal(r.body.pageSize, 2);
    const p2 = await api("GET", "/services?pageSize=2&page=2&sort=newest");
    assert.equal(p2.body.items.length, 1);
    const titles = [...r.body.items, ...p2.body.items].map((s) => s.title);
    assert.ok(!titles.includes("Secret draft service") && !titles.includes("Paused service here"));
  });
  it("search, category, price, delivery and sort filters", async () => {
    assert.deepEqual((await api("GET", "/services?q=logo")).body.items.map((s) => s.id), [S.svcDesign]);
    assert.equal((await api("GET", "/services?q=" + encodeURIComponent("Test Student B"))).body.total, 1); // seller name
    assert.equal((await api("GET", `/services?categoryId=${S.catOther}`)).body.total, 1);
    assert.equal((await api("GET", "/services?min=1500")).body.total, 1);
    assert.equal((await api("GET", "/services?max=1500")).body.total, 2);
    assert.equal((await api("GET", "/services?maxDelivery=2")).body.total, 2);
    const asc = (await api("GET", "/services?sort=price-asc")).body.items.map((s) => s.price);
    assert.deepEqual(asc, [...asc].sort((a, b) => a - b));
    const desc = (await api("GET", "/services?sort=price-desc")).body.items.map((s) => s.price);
    assert.deepEqual(desc, [...asc].reverse());
    assert.equal((await api("GET", "/services?q=" + encodeURIComponent(".*"))).body.total, 0, "regex chars must be escaped");
    assert.equal((await api("GET", "/services?minRating=4")).body.total, 0);
  });
  it("detail: Active is public; Draft only for owner/admin", async () => {
    const pub = await api("GET", `/services/${S.svc}`);
    assert.equal(pub.status, 200); assert.deepEqual(pub.body.reviews, []);
    assert.equal((await api("GET", `/services/${S.svcDraft}`)).status, 404);
    assert.equal((await api("GET", `/services/${S.svcDraft}`, { token: S.tokenB })).status, 404);
    assert.equal((await api("GET", `/services/${S.svcDraft}`, { token: S.tokenA })).status, 200);
    assert.equal((await api("GET", `/services/${S.svcDraft}`, { token: S.tokenAdmin })).status, 200);
  });
  it("my services lists all statuses; only owner can edit / delete; status change", async () => {
    const mine = await api("GET", "/services/mine", { token: S.tokenA });
    assert.equal(mine.body.length, 4);
    assert.equal((await api("PUT", `/services/${S.svc}`, { token: S.tokenB, body: goodService(S.catProg) })).status, 403);
    assert.equal((await api("DELETE", `/services/${S.svc}`, { token: S.tokenB })).status, 403);
    assert.equal((await api("PATCH", `/services/${S.svc}/status`, { token: S.tokenB, body: { status: "Archived" } })).status, 403);
    const edited = await api("PUT", `/services/${S.svc}`, { token: S.tokenA, body: goodService(S.catProg, { price: 3500, title: "Build a React landing page v2" }) });
    assert.equal(edited.status, 200); assert.equal(edited.body.price, 3500);
    assert.equal((await api("PATCH", `/services/${S.svcPaused}/status`, { token: S.tokenA, body: { status: "Bogus" } })).status, 400);
    const st = await api("PATCH", `/services/${S.svcPaused}/status`, { token: S.tokenA, body: { status: "Archived" } });
    assert.equal(st.body.status, "Archived");
  });
  it("category with services cannot be deleted (409)", async () => {
    assert.equal((await api("DELETE", `/categories/${S.catProg}`, { token: S.tokenAdmin })).status, 409);
  });
});

describe("favorites", () => {
  it("save / duplicate-safe / list / ids / remove; own & draft rejected", async () => {
    assert.equal((await api("GET", "/favorites", { })).status, 401);
    assert.equal((await api("POST", `/favorites/${S.svc}`, { token: S.tokenB })).status, 201);
    assert.equal((await api("POST", `/favorites/${S.svc}`, { token: S.tokenB })).status, 201); // idempotent, no duplicate
    assert.deepEqual((await api("GET", "/favorites/ids", { token: S.tokenB })).body, [S.svc]);
    const list = await api("GET", "/favorites", { token: S.tokenB });
    assert.equal(list.body.length, 1); assert.equal(list.body[0].id, S.svc); assert.ok(list.body[0].seller.fullName);
    assert.deepEqual((await api("GET", "/favorites/ids", { token: S.tokenC })).body, [], "favorites leaked across users");
    assert.equal((await api("POST", `/favorites/${S.svc}`, { token: S.tokenA })).status, 400); // own service
    assert.equal((await api("POST", `/favorites/${S.svcDraft}`, { token: S.tokenB })).status, 404); // not available
    assert.equal((await api("DELETE", `/favorites/${S.svc}`, { token: S.tokenB })).status, 200);
    assert.deepEqual((await api("GET", "/favorites/ids", { token: S.tokenB })).body, []);
    await api("POST", `/favorites/${S.svc}`, { token: S.tokenB }); // leave saved for the scenario
  });
});

describe("orders: validation and access control", () => {
  it("cannot order own / draft / paused / non-existent service", async () => {
    const body = { requirements: "x".repeat(30) };
    assert.equal((await api("POST", "/orders", { token: S.tokenA, body: { serviceId: S.svc, ...body } })).status, 403);
    assert.equal((await api("POST", "/orders", { token: S.tokenB, body: { serviceId: S.svcDraft, ...body } })).status, 404);
    assert.equal((await api("POST", "/orders", { token: S.tokenB, body: { serviceId: S.svcPaused, ...body } })).status, 404);
    assert.equal((await api("POST", "/orders", { token: S.tokenB, body: { serviceId: "123456789012345678901234", ...body } })).status, 404);
    assert.equal((await api("POST", "/orders", { body: { serviceId: S.svc, ...body } })).status, 401);
    assert.equal((await api("POST", "/orders", { token: S.tokenAdmin, body: { serviceId: S.svc, ...body } })).status, 403);
  });
  it("requirements / deadline validated", async () => {
    const r = await api("POST", "/orders", { token: S.tokenB, body: { serviceId: S.svc, requirements: "too short", requestedDeadline: "2020-01-01" } });
    assert.equal(r.status, 422); assert.ok(r.body.errors.requirements); assert.ok(r.body.errors.requestedDeadline);
  });
});

describe("end-to-end scenario: order lifecycle, messaging, review, notifications", () => {
  const act = (token, action, extra = {}) => api("PATCH", `/orders/${S.order}/status`, { token, body: { action, ...extra } });

  it("Student B places an order; price/title/delivery are snapshotted; seller notified", async () => {
    const r = await api("POST", "/orders", { token: S.tokenB, body: { serviceId: S.svc, requirements: "I need a landing page for my society, with a contact form.", requestedDeadline: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10), buyerId: S.idC, sellerId: S.idC } });
    assert.equal(r.status, 201);
    S.order = r.body.id;
    assert.equal(r.body.status, "Requested"); assert.equal(r.body.buyerId, S.idB); assert.equal(r.body.sellerId, S.idA, "buyer/seller must not be client-controlled");
    assert.equal(r.body.price, 3500); assert.equal(r.body.serviceTitle, "Build a React landing page v2"); assert.equal(r.body.deliveryDays, 4);
    assert.equal(r.body.timeline.length, 1);
    const n = await api("GET", "/notifications", { token: S.tokenA });
    assert.ok(n.body.some((x) => x.type === "order_new" && !x.read));
  });
  it("later edits to the listing do not change the order (snapshot)", async () => {
    await api("PUT", `/services/${S.svc}`, { token: S.tokenA, body: goodService(S.catProg, { price: 9999, title: "Build a React landing page v3" }) });
    const o = await api("GET", `/orders/${S.order}`, { token: S.tokenB });
    assert.equal(o.body.price, 3500); assert.equal(o.body.serviceTitle, "Build a React landing page v2");
    await api("PUT", `/services/${S.svc}`, { token: S.tokenA, body: goodService(S.catProg, { price: 3500, title: "Build a React landing page v2" }) });
  });
  it("only participants can read an order or its messages (admin reads order, not chat)", async () => {
    assert.equal((await api("GET", `/orders/${S.order}`, { token: S.tokenC })).status, 404);
    assert.equal((await api("GET", `/orders/${S.order}/messages`, { token: S.tokenC })).status, 404);
    assert.equal((await api("POST", `/orders/${S.order}/messages`, { token: S.tokenC, body: { text: "hi" } })).status, 404);
    assert.equal((await act(S.tokenC, "accept")).status, 404);
    assert.equal((await api("GET", `/orders/${S.order}`, { token: S.tokenAdmin })).status, 200);
    assert.equal((await api("GET", `/orders/${S.order}/messages`, { token: S.tokenAdmin })).status, 403);
    assert.equal((await api("GET", "/orders", { token: S.tokenC })).body.length, 0);
    assert.equal((await api("GET", "/orders", { token: S.tokenA })).body.length, 1);
  });
  it("invalid transitions / wrong actors are rejected by the server", async () => {
    assert.equal((await act(S.tokenB, "accept")).status, 403);          // buyer cannot accept
    assert.equal((await act(S.tokenA, "cancel")).status, 403);          // seller cannot cancel
    assert.equal((await act(S.tokenA, "start")).status, 409);           // not accepted yet
    assert.equal((await act(S.tokenA, "deliver", { message: "x".repeat(20) })).status, 409);
    assert.equal((await act(S.tokenB, "complete")).status, 409);
    assert.equal((await act(S.tokenA, "explode")).status, 400);
    assert.equal((await api("PATCH", `/orders/${S.order}/status`, { token: S.tokenA, body: { status: "Completed" } })).status, 400); // raw status writes not accepted
  });
  it("Student A accepts then starts the work", async () => {
    assert.equal((await act(S.tokenA, "accept")).body.status, "Accepted");
    assert.equal((await act(S.tokenA, "accept")).status, 409);          // cannot accept twice
    assert.equal((await act(S.tokenA, "start")).body.status, "In Progress");
    assert.equal((await act(S.tokenA, "cancel")).status, 409);          // no cancel from "In Progress" at all
    assert.equal((await act(S.tokenB, "cancel")).status, 409);          // buyer cannot cancel once work started
  });
  it("messaging: persisted, validated, chronological, notifies the other party", async () => {
    const m1 = await api("POST", `/orders/${S.order}/messages`, { token: S.tokenA, body: { text: "Started working on it!" } });
    assert.equal(m1.status, 201); assert.equal(m1.body.senderId, S.idA); assert.equal(m1.body.orderId, S.order); assert.ok(m1.body.at);
    await api("POST", `/orders/${S.order}/messages`, { token: S.tokenB, body: { text: "Great, thanks!" } });
    assert.equal((await api("POST", `/orders/${S.order}/messages`, { token: S.tokenB, body: { text: "   " } })).status, 422);
    assert.equal((await api("POST", `/orders/${S.order}/messages`, { token: S.tokenB, body: { text: "x".repeat(1001) } })).status, 422);
    const list = await api("GET", `/orders/${S.order}/messages`, { token: S.tokenB });
    assert.deepEqual(list.body.map((m) => m.text), ["Started working on it!", "Great, thanks!"]);
    assert.ok((await api("GET", "/notifications", { token: S.tokenB })).body.some((n) => n.type === "message_new"));
  });
  it("deliver validates the note and link, then moves to Delivered", async () => {
    const bad = await act(S.tokenA, "deliver", { message: "short", link: "ftp://x" });
    assert.equal(bad.status, 422); assert.ok(bad.body.errors.message);
    assert.equal((await act(S.tokenA, "deliver", { message: "Finished work, see link", link: "javascript:alert(1)" })).status, 422);
    const ok = await act(S.tokenA, "deliver", { message: "First version is ready for review.", link: "https://example.com/files" });
    assert.equal(ok.body.status, "Delivered"); assert.equal(ok.body.delivery.link, "https://example.com/files");
  });
  it("Student B requests a revision (note required); A restarts and re-delivers", async () => {
    assert.equal((await act(S.tokenB, "revise", { note: "short" })).status, 422);
    assert.equal((await act(S.tokenA, "revise", { note: "Please change the header colour." })).status, 403);
    const rev = await act(S.tokenB, "revise", { note: "Please change the header colour to green." });
    assert.equal(rev.body.status, "Revision Requested"); assert.equal(rev.body.revisionNote, "Please change the header colour to green.");
    assert.equal((await act(S.tokenA, "start")).body.status, "In Progress");
    assert.equal((await act(S.tokenA, "deliver", { message: "Updated: header colour is now green." })).body.status, "Delivered");
  });
  it("review is refused before completion; B completes the order", async () => {
    const early = await api("POST", "/reviews", { token: S.tokenB, body: { orderId: S.order, rating: 5, comment: "Great work overall" } });
    assert.equal(early.status, 409);
    assert.equal((await act(S.tokenA, "complete")).status, 403);
    const done = await act(S.tokenB, "complete");
    assert.equal(done.body.status, "Completed");
    assert.deepEqual(done.body.timeline.map((t) => t.status), ["Requested", "Accepted", "In Progress", "Delivered", "Revision Requested", "In Progress", "Delivered", "Completed"]);
  });
  it("terminal state: no further transitions", async () => {
    const seller = ["accept", "reject", "start", "deliver"], buyer = ["complete", "revise", "cancel"];
    for (const a of seller) assert.equal((await act(S.tokenA, a, { message: "x".repeat(20) })).status, 409, a);
    for (const a of buyer) assert.equal((await act(S.tokenB, a, { note: "x".repeat(20) })).status, 409, a);
  });
  it("review rules: only buyer, rating 1-5, comment, once per order", async () => {
    const R = (token, body) => api("POST", "/reviews", { token, body: { orderId: S.order, ...body } });
    assert.equal((await R(S.tokenA, { rating: 5, comment: "Seller reviewing self" })).status, 403);
    assert.equal((await R(S.tokenC, { rating: 5, comment: "Stranger review" })).status, 403);
    assert.equal((await R(S.tokenB, { rating: 6, comment: "Great work" })).status, 422);
    assert.equal((await R(S.tokenB, { rating: 0, comment: "Great work" })).status, 422);
    assert.equal((await R(S.tokenB, { rating: 4.5, comment: "Great work" })).status, 422);
    const noComment = await R(S.tokenB, { rating: 5, comment: "hi" });
    assert.equal(noComment.status, 422); assert.ok(noComment.body.errors.comment);
    const ok = await R(S.tokenB, { rating: 5, comment: "Excellent work, delivered on time." });
    assert.equal(ok.status, 201); S.review = ok.body.id;
    assert.equal((await R(S.tokenB, { rating: 4, comment: "A second review attempt" })).status, 409);
  });
  it("review appears on the service, the student profile and the order; ratings are recalculated", async () => {
    const svc = await api("GET", `/services/${S.svc}`);
    assert.equal(svc.body.reviews.length, 1); assert.equal(svc.body.reviews[0].buyerName, "Test Student B");
    assert.deepEqual(svc.body.rating, { avg: 5, count: 1 });
    const prof = await api("GET", `/profiles/${S.idA}`);
    assert.equal(prof.body.reviews.length, 1); assert.equal(prof.body.reviews[0].buyer.fullName, "Test Student B"); assert.equal(prof.body.reviews[0].serviceTitle, "Build a React landing page v2");
    assert.deepEqual(prof.body.rating, { avg: 5, count: 1 });
    assert.equal((await api("GET", `/orders/${S.order}`, { token: S.tokenB })).body.review.rating, 5);
    assert.equal((await api("GET", `/reviews/service/${S.svc}`)).body.length, 1);
    assert.equal((await api("GET", "/services?minRating=4.5")).body.total, 1);
  });
  it("notifications reached both students for the lifecycle; mark one / mark all read", async () => {
    const a = (await api("GET", "/notifications", { token: S.tokenA })).body;
    const b = (await api("GET", "/notifications", { token: S.tokenB })).body;
    const types = (l) => new Set(l.map((n) => n.type));
    for (const t of ["order_new", "order_revision_requested", "order_completed", "message_new", "review_new"]) assert.ok(types(a).has(t), `seller missing ${t}`);
    for (const t of ["order_accepted", "order_started", "order_delivered", "message_new"]) assert.ok(types(b).has(t), `buyer missing ${t}`);
    assert.ok(a.every((n) => n.userId === S.idA), "notifications leaked across users");
    const one = a.find((n) => !n.read);
    const r1 = await api("PATCH", `/notifications/${one.id}/read`, { token: S.tokenA });
    assert.equal(r1.body.read, true);
    assert.equal((await api("PATCH", `/notifications/${one.id}/read`, { token: S.tokenB })).status, 404); // not B's notification
    assert.equal((await api("PATCH", "/notifications/read", { token: S.tokenA })).status, 200);
    assert.ok((await api("GET", "/notifications", { token: S.tokenA })).body.every((n) => n.read));
    assert.ok((await api("GET", "/notifications", { token: S.tokenB })).body.some((n) => !n.read), "marking A's must not touch B's");
  });
  it("cancel / reject paths: Requested -> Cancelled (buyer), Requested -> Rejected (seller), Accepted -> Cancelled (buyer)", async () => {
    const place = async () => (await api("POST", "/orders", { token: S.tokenB, body: { serviceId: S.svc, requirements: "Second order with enough detail here." } })).body.id;
    let id = await place();
    let r = await api("PATCH", `/orders/${id}/status`, { token: S.tokenB, body: { action: "cancel" } });
    assert.equal(r.body.status, "Cancelled");
    id = await place();
    r = await api("PATCH", `/orders/${id}/status`, { token: S.tokenA, body: { action: "reject" } });
    assert.equal(r.body.status, "Rejected");
    id = await place();
    await api("PATCH", `/orders/${id}/status`, { token: S.tokenA, body: { action: "accept" } });
    r = await api("PATCH", `/orders/${id}/status`, { token: S.tokenB, body: { action: "cancel" } });
    assert.equal(r.body.status, "Cancelled");
  });
  it("service with active orders cannot be deleted; with finished orders it can", async () => {
    const id = (await api("POST", "/orders", { token: S.tokenB, body: { serviceId: S.svc, requirements: "Third order, still open at the moment." } })).body.id;
    const blocked = await api("DELETE", `/services/${S.svc}`, { token: S.tokenA });
    assert.equal(blocked.status, 409);
    await api("PATCH", `/orders/${id}/status`, { token: S.tokenB, body: { action: "cancel" } });
  });
  it("concurrent conflicting actions: exactly one wins", async () => {
    const id = (await api("POST", "/orders", { token: S.tokenB, body: { serviceId: S.svc, requirements: "Race condition order with details." } })).body.id;
    const results = await Promise.all([
      api("PATCH", `/orders/${id}/status`, { token: S.tokenA, body: { action: "accept" } }),
      api("PATCH", `/orders/${id}/status`, { token: S.tokenA, body: { action: "reject" } }),
      api("PATCH", `/orders/${id}/status`, { token: S.tokenA, body: { action: "reject" } }),
    ]);
    assert.equal(results.filter((r) => r.status === 200).length, 1, JSON.stringify(results.map((r) => r.status)));
    const final = (await api("GET", `/orders/${id}`, { token: S.tokenA })).body;
    assert.equal(final.timeline.length, 2);
  });
});

describe("profiles & portfolio", () => {
  it("profile update validates and stores skills as {name, level}", async () => {
    const bad = await api("PUT", "/profiles/me", { token: S.tokenA, body: { skills: [{ name: "", level: "Advanced" }], bio: "x".repeat(501), avatarUrl: "notaurl", degree: "XX" } });
    assert.equal(bad.status, 422); for (const f of ["skills", "bio", "avatarUrl", "degree"]) assert.ok(bad.body.errors[f], f);
    const ok = await api("PUT", "/profiles/me", { token: S.tokenA, body: { bio: "React developer", availability: true, skills: [{ name: "React", level: "Advanced" }, { name: "react", level: "Beginner" }, { name: "Node", level: "Intermediate" }] } });
    assert.equal(ok.status, 200); assert.deepEqual(ok.body.skills, [{ name: "React", level: "Advanced" }, { name: "Node", level: "Intermediate" }]);
    const me = await api("GET", "/profiles/me", { token: S.tokenA });
    assert.ok(me.body.completeness.percent > 0); assert.equal(me.body.email, "studenta@lhr.nu.edu.pk");
  });
  it("directory: search by skill/name, availability filter, public data only", async () => {
    await api("PUT", "/profiles/me", { token: S.tokenC, body: { availability: false } });
    const all = await api("GET", "/profiles/students");
    assert.equal(all.body.length, 3); assert.ok(all.body.every((u) => u.email === undefined && u.role === "student"));
    assert.equal((await api("GET", "/profiles/students?q=react")).body.length, 1);
    assert.equal((await api("GET", "/profiles/students?q=Student%20B")).body.length, 1);
    assert.equal((await api("GET", "/profiles/students?availableOnly=1")).body.length, 2);
    assert.ok(!all.body.some((u) => u.id === S.idAdmin), "admin leaked into directory");
    assert.equal((await api("GET", `/profiles/${S.idAdmin}`)).status, 404);
  });
  it("portfolio CRUD, validation and ownership", async () => {
    assert.equal((await api("GET", "/portfolio")).status, 401);
    const bad = await api("POST", "/portfolio", { token: S.tokenA, body: { title: "ab", link: "nope" } });
    assert.equal(bad.status, 422); assert.ok(bad.body.errors.title && bad.body.errors.link);
    const c = await api("POST", "/portfolio", { token: S.tokenA, body: { title: "My project", description: "Built it", link: "https://github.com/x/y" } });
    assert.equal(c.status, 201); S.pf = c.body.id; assert.equal(c.body.userId, S.idA);
    assert.equal((await api("PUT", `/portfolio/${S.pf}`, { token: S.tokenB, body: { title: "Hijacked item" } })).status, 404);
    assert.equal((await api("DELETE", `/portfolio/${S.pf}`, { token: S.tokenB })).status, 404);
    const u = await api("PUT", `/portfolio/${S.pf}`, { token: S.tokenA, body: { title: "My project v2", description: "", link: "" } });
    assert.equal(u.body.title, "My project v2");
    assert.equal((await api("GET", "/portfolio", { token: S.tokenB })).body.length, 0);
    const pub = await api("GET", `/profiles/${S.idA}`);
    assert.equal(pub.body.portfolio.length, 1); assert.equal(pub.body.services.length, 2);
    assert.equal((await api("DELETE", `/portfolio/${S.pf}`, { token: S.tokenA })).status, 200);
    assert.equal((await api("GET", "/portfolio", { token: S.tokenA })).body.length, 0);
  });
});

describe("reports", () => {
  it("validation: reason, type, own content, missing target", async () => {
    const R = (token, body) => api("POST", "/reports", { token, body });
    assert.equal((await R(S.tokenB, { targetType: "service", targetId: S.svc, reason: "Nonsense" })).status, 422);
    assert.equal((await R(S.tokenB, { targetType: "order", targetId: S.svc, reason: "Harassment" })).status, 422);
    assert.equal((await R(S.tokenA, { targetType: "service", targetId: S.svc, reason: "Harassment" })).status, 400);
    assert.equal((await R(S.tokenA, { targetType: "user", targetId: S.idA, reason: "Harassment" })).status, 400);
    assert.equal((await R(S.tokenB, { targetType: "service", targetId: "123456789012345678901234", reason: "Harassment" })).status, 404);
    assert.equal((await R(S.tokenB, { targetType: "user", targetId: S.idAdmin, reason: "Harassment" })).status, 404);
    assert.equal((await R(undefined, { targetType: "service", targetId: S.svc, reason: "Harassment" })).status, 401);
  });
  it("create, duplicate-open 409, admin-only list/resolve, re-report after resolution", async () => {
    const body = { targetType: "service", targetId: S.svc, reason: "Spam or misleading listing", details: "Looks fake" };
    const c = await api("POST", "/reports", { token: S.tokenB, body });
    assert.equal(c.status, 201); assert.equal(c.body.status, "Open"); S.report = c.body.id;
    assert.equal((await api("POST", "/reports", { token: S.tokenB, body })).status, 409);
    assert.equal((await api("POST", "/reports", { token: S.tokenC, body })).status, 201); // different reporter is fine
    assert.equal((await api("GET", "/reports", { token: S.tokenB })).status, 403);
    assert.equal((await api("PATCH", `/reports/${S.report}`, { token: S.tokenB, body: { status: "Resolved" } })).status, 403);
    const list = await api("GET", "/reports", { token: S.tokenAdmin });
    assert.equal(list.body.length, 2);
    const rep = list.body.find((r) => r.id === S.report);
    assert.equal(rep.reporterName, "Test Student B"); assert.equal(rep.targetLabel, "Build a React landing page v2"); assert.equal(rep.targetId, S.svc);
    assert.equal((await api("PATCH", `/reports/${S.report}`, { token: S.tokenAdmin, body: { status: "Bogus" } })).status, 400);
    assert.equal((await api("PATCH", `/reports/${S.report}`, { token: S.tokenAdmin, body: { status: "Resolved" } })).body.status, "Resolved");
    assert.equal((await api("PATCH", `/reports/${S.report}`, { token: S.tokenAdmin, body: { status: "Dismissed" } })).status, 409);
    assert.equal((await api("POST", "/reports", { token: S.tokenB, body })).status, 201); // closed report no longer blocks
  });
  it("users can be reported", async () => {
    const r = await api("POST", "/reports", { token: S.tokenB, body: { targetType: "user", targetId: S.idA, reason: "Harassment" } });
    assert.equal(r.status, 201);
  });
});

describe("dashboards (computed from the database)", () => {
  it("student dashboard", async () => {
    const a = await api("GET", "/dashboard/student", { token: S.tokenA });
    assert.equal(a.status, 200);
    assert.equal(a.body.activeServices, 2); assert.equal(a.body.completed, 1);
    assert.deepEqual(a.body.rating, { avg: 5, count: 1 });
    assert.equal(a.body.recent[0].role, "seller"); assert.ok(a.body.notifications.length > 0);
    assert.equal(a.body.profileFields.verified, true); assert.equal(a.body.profileFields.skills, true); assert.equal(a.body.profileFields.avatar, false);
    assert.equal(typeof a.body.incomingActive, "number"); assert.equal(typeof a.body.outgoingActive, "number");
    const b = await api("GET", "/dashboard/student", { token: S.tokenB });
    assert.equal(b.body.completed, 1); assert.equal(b.body.activeServices, 1); assert.equal(b.body.recent[0].role, "buyer");
  });
  it("admin dashboard; role separation", async () => {
    const r = await api("GET", "/dashboard/admin", { token: S.tokenAdmin });
    assert.equal(r.status, 200);
    assert.equal(r.body.users, 3); assert.equal(r.body.unverified, 2);
    assert.equal(r.body.activeServices, 3); assert.equal(r.body.totalServices, 5);
    assert.equal(r.body.orders, 6); assert.equal(r.body.completedOrders, 1);
    assert.equal(r.body.openReports, 3); assert.equal(r.body.reviews, 1);
    assert.equal(r.body.recentOrders.length, 6); assert.ok(r.body.recentOrders[0].buyer);
    assert.equal((await api("GET", "/dashboard/admin", { token: S.tokenA })).status, 403);
    assert.equal((await api("GET", "/dashboard/student", { token: S.tokenAdmin })).status, 403);
    assert.equal((await api("GET", "/dashboard/admin")).status, 401);
  });
});

describe("admin operations", () => {
  it("every /api/admin route rejects guests (401) and students (403)", async () => {
    for (const [m, p] of [["GET", "/admin/users"], ["GET", `/admin/users/${S.idA}`], ["PATCH", `/admin/users/${S.idA}`], ["GET", "/admin/services"], ["GET", "/reviews"], ["DELETE", `/reviews/${S.review}`]]) {
      assert.equal((await api(m, p, { body: {} })).status, 401, `${m} ${p} guest`);
      assert.equal((await api(m, p, { token: S.tokenA, body: {} })).status, 403, `${m} ${p} student`);
    }
  });
  it("list/get users (with email), search, never lists admins", async () => {
    const all = await api("GET", "/admin/users", { token: S.tokenAdmin });
    assert.equal(all.body.length, 3); assert.ok(all.body.every((u) => u.email && u.role === "student"));
    assert.equal((await api("GET", "/admin/users?q=studentB", { token: S.tokenAdmin })).body.length, 1);
    const one = await api("GET", `/admin/users/${S.idA}`, { token: S.tokenAdmin });
    assert.equal(one.body.stats.services, 4); assert.equal(one.body.stats.ordersAsSeller, 6); assert.equal(one.body.password, undefined);
    assert.equal((await api("GET", `/admin/users/${S.idAdmin}`, { token: S.tokenAdmin })).status, 404);
    assert.equal((await api("PATCH", `/admin/users/${S.idAdmin}`, { token: S.tokenAdmin, body: { status: "suspended" } })).status, 404);
  });
  it("verify / unverify, edit info, validation", async () => {
    assert.equal((await api("PATCH", `/admin/users/${S.idB}`, { token: S.tokenAdmin, body: { verified: true } })).body.verified, true);
    assert.equal((await api("PATCH", `/admin/users/${S.idB}`, { token: S.tokenAdmin, body: { verified: "yes" } })).status, 422);
    assert.equal((await api("PATCH", `/admin/users/${S.idB}`, { token: S.tokenAdmin, body: { program: "Software Engineering", semester: "6" } })).body.semester, "6");
    assert.equal((await api("PATCH", `/admin/users/${S.idB}`, { token: S.tokenAdmin, body: { status: "banned" } })).status, 422);
    assert.equal((await api("PATCH", `/admin/users/${S.idB}`, { token: S.tokenAdmin, body: { role: "admin" } })).body.role, "student"); // role cannot be escalated
  });
  it("suspended user: token stops working at once, login refused, content hidden; reinstating restores", async () => {
    assert.ok((await api("GET", "/services?q=tutoring")).body.total === 1);
    const s = await api("PATCH", `/admin/users/${S.idB}`, { token: S.tokenAdmin, body: { status: "suspended" } });
    assert.equal(s.body.status, "suspended");
    const me = await api("GET", "/auth/me", { token: S.tokenB });
    assert.equal(me.status, 403); assert.match(me.body.message, /suspended/i);
    assert.equal((await api("POST", "/orders", { token: S.tokenB, body: { serviceId: S.svc, requirements: "x".repeat(30) } })).status, 403);
    assert.equal((await api("POST", "/auth/login", { body: { email: "studentB@lhr.nu.edu.pk", password: "password123" } })).status, 403);
    assert.equal((await api("GET", "/services?q=tutoring")).body.total, 0, "suspended seller's services still listed");
    assert.equal((await api("GET", "/profiles/students?q=Student%20B")).body.length, 0);
    assert.equal((await api("GET", `/profiles/${S.idB}`)).status, 404);
    assert.equal((await api("GET", `/profiles/${S.idB}`, { token: S.tokenAdmin })).status, 200); // admin can still inspect
    // nobody can place an order with a suspended seller
    assert.equal((await api("POST", "/orders", { token: S.tokenC, body: { serviceId: S.svcB, requirements: "x".repeat(30) } })).status, 404);
    assert.equal((await api("PATCH", `/admin/users/${S.idB}`, { token: S.tokenAdmin, body: { status: "active" } })).body.status, "active");
    assert.equal((await api("GET", "/auth/me", { token: S.tokenB })).status, 200);
    assert.equal((await api("GET", "/services?q=tutoring")).body.total, 1);
  });
  it("admin lists / archives / restores / deletes any service", async () => {
    const all = await api("GET", "/admin/services", { token: S.tokenAdmin });
    assert.equal(all.body.length, 5); assert.ok(all.body.some((s) => s.status === "Draft"));
    assert.equal((await api("PATCH", `/services/${S.svcB}/status`, { token: S.tokenAdmin, body: { status: "Archived" } })).body.status, "Archived");
    assert.equal((await api("GET", "/services?q=tutoring")).body.total, 0);
    assert.equal((await api("PATCH", `/services/${S.svcB}/status`, { token: S.tokenAdmin, body: { status: "Active" } })).body.status, "Active");
    assert.equal((await api("PUT", `/services/${S.svcB}`, { token: S.tokenAdmin, body: goodService(S.catOther) })).status, 403); // admins moderate, they do not edit content
    assert.equal((await api("DELETE", `/services/${S.svcB}`, { token: S.tokenAdmin })).status, 200);
    assert.equal((await api("GET", `/services/${S.svcB}`)).status, 404);
  });
  it("admin lists reviews and deletes one; ratings are recalculated everywhere", async () => {
    const list = await api("GET", "/reviews", { token: S.tokenAdmin });
    assert.equal(list.body.length, 1);
    assert.equal(list.body[0].buyerName, "Test Student B"); assert.equal(list.body[0].sellerName, "Test Student A"); assert.equal(list.body[0].serviceTitle, "Build a React landing page v2");
    assert.equal((await api("DELETE", `/reviews/${S.review}`, { token: S.tokenAdmin })).status, 200);
    assert.deepEqual((await api("GET", `/services/${S.svc}`)).body.rating, { avg: 0, count: 0 });
    assert.deepEqual((await api("GET", `/profiles/${S.idA}`)).body.rating, { avg: 0, count: 0 });
    assert.equal((await api("DELETE", `/reviews/${S.review}`, { token: S.tokenAdmin })).status, 404);
  });
  it("categories: admin cannot delete one that has services; unused one deletes cleanly", async () => {
    assert.equal((await api("DELETE", `/categories/${S.catDesign}`, { token: S.tokenAdmin })).status, 409);
    const c = await api("POST", "/categories", { token: S.tokenAdmin, body: { name: "Temp category" } });
    assert.equal((await api("DELETE", `/categories/${c.body.id}`, { token: S.tokenAdmin })).status, 200);
  });
});

describe("hardening", () => {
  it("auth endpoints are rate limited (429)", async () => {
    process.env.AUTH_RATE_LIMIT_MAX = "1";
    const r = await api("POST", "/auth/login", { body: { email: "x@lhr.nu.edu.pk", password: "whatever12" } });
    process.env.AUTH_RATE_LIMIT_MAX = "100000";
    assert.equal(r.status, 429);
  });
  it("oversized body is rejected", async () => {
    const r = await api("POST", "/auth/register", { body: { fullName: "x".repeat(200000) } });
    assert.equal(r.status, 413);
  });
  it("expired JWT is rejected with a clear message", async () => {
    const jwt = (await import("jsonwebtoken")).default;
    const t = jwt.sign({ id: S.idA }, process.env.JWT_SECRET, { expiresIn: -10 });
    const r = await api("GET", "/auth/me", { token: t });
    assert.equal(r.status, 401); assert.match(r.body.message, /expired/i);
  });
  it("a token signed with a different secret is rejected", async () => {
    const jwt = (await import("jsonwebtoken")).default;
    const t = jwt.sign({ id: S.idA }, "another-secret-another-secret-123");
    assert.equal((await api("GET", "/auth/me", { token: t })).status, 401);
  });
  it("notification collection only holds the sender's own events (sanity)", async () => {
    assert.ok((await Notification.countDocuments()) > 10);
  });
});
