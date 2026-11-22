// Idempotent seed: running it twice never creates duplicates.
//   npm run seed
// Creates: default categories, the admin account (from ADMIN_EMAIL / ADMIN_PASSWORD),
// and — unless SEED_DEMO_DATA=false — demo students, services and sample orders/reviews.
// It never deletes anything.
import "dotenv/config";
import mongoose from "mongoose";
import { Category, User, Service, Order, Review, Message, Notification } from "./models/index.js";
import { DEFAULT_CATEGORIES } from "./utils/constants.js";
import { refreshRatings } from "./utils/ratings.js";

const DEMO_STUDENTS = [
  { fullName: "Ali Hassan", email: "ali.hassan@lhr.nu.edu.pk", degree: "BS", program: "Computer Science", department: "Computing", semester: "6", bio: "Full-stack developer who loves React and Node. Happy to help classmates debug and ship projects.", skills: [{ name: "React", level: "Advanced" }, { name: "Node.js", level: "Intermediate" }, { name: "JavaScript", level: "Advanced" }] },
  { fullName: "Sara Ahmed", email: "sara.ahmed@lhr.nu.edu.pk", degree: "BS", program: "Software Engineering", department: "Computing", semester: "5", bio: "UI/UX and brand designer. I turn rough ideas into clean, modern logos and layouts.", skills: [{ name: "Logo Design", level: "Advanced" }, { name: "Figma", level: "Advanced" }] },
  { fullName: "Usman Khan", email: "usman.khan@lhr.nu.edu.pk", degree: "BS", program: "Data Science", department: "Computing", semester: "7", bio: "Python and data analysis tutor.", skills: [{ name: "Python", level: "Advanced" }, { name: "Pandas", level: "Advanced" }] },
  { fullName: "Ayesha Noor", email: "ayesha.noor@lhr.nu.edu.pk", degree: "BBA", program: "Business Administration", department: "Management Sciences", semester: "4", bio: "Writer and editor for essays, articles and web copy.", skills: [{ name: "Content Writing", level: "Advanced" }] },
  { fullName: "Hamza Tariq", email: "hamza.tariq@lhr.nu.edu.pk", degree: "MS", program: "Artificial Intelligence", department: "Computing", semester: "2", bio: "ML engineer in training.", skills: [{ name: "Machine Learning", level: "Advanced" }, { name: "Python", level: "Advanced" }] },
  { fullName: "Bilal Ahmed", email: "bilal.ahmed@lhr.nu.edu.pk", degree: "BS", program: "Computer Science", department: "Computing", semester: "6", bio: "Frontend bug fixing and layout work.", skills: [{ name: "CSS", level: "Advanced" }, { name: "React", level: "Intermediate" }] },
  { fullName: "Fatima Khan", email: "fatima.khan@lhr.nu.edu.pk", degree: "BS", program: "Graphic Design", department: "Design", semester: "5", bio: "Social media graphics and visual identity.", skills: [{ name: "Photoshop", level: "Advanced" }] },
  { fullName: "Zain Ali", email: "zain.ali@lhr.nu.edu.pk", degree: "BBA", program: "Marketing", department: "Management Sciences", semester: "3", bio: "Landing page and website copywriter.", skills: [{ name: "Copywriting", level: "Intermediate" }] },
];

// [seller email, category, title, description, price, deliveryDays]
const DEMO_SERVICES = [
  ["ali.hassan@lhr.nu.edu.pk", "Programming & Tech", "React Website Development", "I will build a responsive, clean website using React, including routing, forms and a polished layout.", 5000, 5],
  ["sara.ahmed@lhr.nu.edu.pk", "Design & Creative", "Professional Logo Design", "Clean and modern logo designs for your brand, with two concepts and unlimited small revisions.", 2000, 3],
  ["usman.khan@lhr.nu.edu.pk", "Data & Analytics", "Python Data Analysis", "Data cleaning, visualization and analysis using Python, pandas and matplotlib with a short written summary.", 3500, 4],
  ["ayesha.noor@lhr.nu.edu.pk", "Writing & Translation", "Article and Blog Writing", "Clear, well-structured and original articles or blog posts on the topic of your choice.", 1500, 2],
  ["hamza.tariq@lhr.nu.edu.pk", "Data & Analytics", "Machine Learning Model Tutoring", "One-on-one guidance to build and evaluate a basic machine learning model and understand the results.", 6000, 7],
  ["bilal.ahmed@lhr.nu.edu.pk", "Programming & Tech", "Frontend Bug Fixing", "I will fix layout issues and frontend React bugs and explain what went wrong so you can avoid it.", 2500, 3],
  ["fatima.khan@lhr.nu.edu.pk", "Marketing & Social", "Social Media Post Design", "Eye-catching graphics for social media posts, delivered as editable source files and exports.", 1800, 2],
  ["zain.ali@lhr.nu.edu.pk", "Writing & Translation", "Website Content Writing", "Website copy for landing pages and small business websites, written to be clear and persuasive.", 2200, 3],
];

const log = (...a) => console.log("[seed]", ...a);

async function seedCategories() {
  let created = 0;
  for (const name of DEFAULT_CATEGORIES) {
    const r = await Category.updateOne({ name }, { $setOnInsert: { name, icon: "", active: true } }, { upsert: true, collation: { locale: "en", strength: 2 } });
    if (r.upsertedCount) created += 1;
  }
  log(`categories: ${created} created, ${DEFAULT_CATEGORIES.length - created} already existed`);
}

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!email || password.length < 8) {
    log("admin: skipped (set ADMIN_EMAIL and an ADMIN_PASSWORD of 8+ characters in .env)");
    return;
  }
  const existing = await User.findOne({ email });
  if (existing) {
    log(`admin: ${email} already exists${existing.role === "admin" ? "" : " (NOT an admin; left untouched)"}`);
    return;
  }
  await User.create({ fullName: "StudentHub Admin", email, password, role: "admin", verified: true });
  log(`admin: created ${email}`);
}

async function seedDemo() {
  const password = process.env.DEMO_STUDENT_PASSWORD || "";
  if (password.length < 8) {
    log("demo data: skipped (set DEMO_STUDENT_PASSWORD of 8+ characters in .env, or SEED_DEMO_DATA=false)");
    return;
  }
  const users = {};
  let newUsers = 0;
  for (const s of DEMO_STUDENTS) {
    let u = await User.findOne({ email: s.email });
    if (!u) { u = await User.create({ ...s, password, role: "student", verified: true, availability: true }); newUsers += 1; }
    users[s.email] = u;
  }
  const cats = Object.fromEntries((await Category.find()).map((c) => [c.name, c]));

  let newServices = 0;
  const services = {};
  for (const [email, catName, title, description, price, deliveryDays] of DEMO_SERVICES) {
    const seller = users[email];
    let svc = await Service.findOne({ seller: seller._id, title });
    if (!svc) { svc = await Service.create({ seller: seller._id, category: cats[catName]._id, title, description, price, deliveryDays, status: "Active" }); newServices += 1; }
    services[title] = svc;
  }

  // Sample orders (idempotent: keyed by service + buyer + a fixed requirements text)
  const sample = [
    { svc: "React Website Development", buyer: "sara.ahmed@lhr.nu.edu.pk", status: "Completed", req: "[demo] I need a portfolio website with a contact form and a projects page.", review: [5, "Ali delivered exactly what I asked for, quickly and with clean code."] },
    { svc: "Professional Logo Design", buyer: "ali.hassan@lhr.nu.edu.pk", status: "Completed", req: "[demo] A minimal logo for my study-group channel, green and charcoal colours.", review: [4, "Great concepts and fast replies. Would order again."] },
    { svc: "Python Data Analysis", buyer: "ali.hassan@lhr.nu.edu.pk", status: "In Progress", req: "[demo] Analyse my survey CSV and produce three charts with a short summary." },
    { svc: "Website Content Writing", buyer: "bilal.ahmed@lhr.nu.edu.pk", status: "Requested", req: "[demo] Landing page copy for a small tutoring service, friendly tone." },
  ];
  const flow = ["Requested", "Accepted", "In Progress", "Delivered", "Completed"];
  let newOrders = 0, newReviews = 0;
  for (const o of sample) {
    const svc = services[o.svc], buyer = users[o.buyer];
    if (await Order.exists({ service: svc._id, buyer: buyer._id, requirements: o.req })) continue;
    const idx = flow.indexOf(o.status);
    const t0 = Date.now() - 6 * 86400000;
    const timeline = flow.slice(0, idx + 1).map((status, i) => ({ status, at: new Date(t0 + i * 86400000), by: i % 2 === 0 && status !== "In Progress" && status !== "Accepted" ? buyer._id : svc.seller }));
    const order = await Order.create({
      service: svc._id, buyer: buyer._id, seller: svc.seller, serviceTitle: svc.title, price: svc.price, deliveryDays: svc.deliveryDays,
      requirements: o.req, status: o.status, timeline,
      ...(idx >= 3 ? { delivery: { message: "Delivered the finished work. Check the link and tell me if anything should change.", link: "https://example.com/demo-delivery", at: new Date(t0 + 3 * 86400000) } } : {}),
    });
    newOrders += 1;
    await Message.create({ order: order._id, sender: buyer._id, text: "Hi! Looking forward to working together." });
    await Message.create({ order: order._id, sender: svc.seller, text: "Thanks for the request — I have everything I need." });
    if (o.status === "Requested") await Notification.create({ user: svc.seller, type: "order_new", text: `${buyer.fullName} requested "${svc.title}".`, link: `/orders/${order._id}` });
    if (o.review) {
      await Review.create({ order: order._id, service: svc._id, seller: svc.seller, buyer: buyer._id, rating: o.review[0], comment: o.review[1] });
      await refreshRatings({ serviceId: svc._id, sellerId: svc.seller });
      newReviews += 1;
    }
  }
  log(`demo data: ${newUsers} students, ${newServices} services, ${newOrders} orders, ${newReviews} reviews created (existing records left untouched)`);
}

async function main() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not set (copy Backend/.env.example to Backend/.env)");
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  await seedCategories();
  await seedAdmin();
  if (process.env.SEED_DEMO_DATA !== "false") await seedDemo();
  log("done");
}

main()
  .catch((err) => { console.error("[seed] failed:", err.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
