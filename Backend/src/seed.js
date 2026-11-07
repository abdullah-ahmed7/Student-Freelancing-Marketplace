// Seeds the 8 demo services from the frontend's mock data.
// Usage: npm run seed            (skips if services already exist)
//        npm run seed -- --force (wipes services + previous seed users first)
import "dotenv/config";
import mongoose from "mongoose";
import User from "./models/User.js";
import Service from "./models/Service.js";

const data = [
  ["React Website Development", "Ali Hassan", "Programming", 5000, "I will build a responsive website using React.", 5],
  ["Professional Logo Design", "Sara Ahmed", "Graphic Design", 2000, "Clean and modern logo designs for your brand.", 3],
  ["Python Data Analysis", "Usman Khan", "Data Science", 3500, "Data cleaning, visualization and analysis using Python.", 4],
  ["Assignment and Article Writing", "Ayesha Noor", "Content Writing", 1500, "Clear, well-structured original content and articles.", 2],
  ["Machine Learning Model", "Hamza Tariq", "Data Science", 6000, "Build and evaluate a basic machine learning model.", 7],
  ["Frontend Bug Fixing", "Bilal Ahmed", "Programming", 2500, "Fix layout issues and frontend React bugs.", 3],
  ["Social Media Post Design", "Fatima Khan", "Graphic Design", 1800, "Eye-catching graphics for social media posts.", 2],
  ["Website Content Writing", "Zain Ali", "Content Writing", 2200, "Website copy for landing pages and business websites.", 3],
];

await mongoose.connect(process.env.MONGO_URI);

if (await Service.countDocuments()) {
  if (!process.argv.includes("--force")) {
    console.log("Services already exist. Use --force to reseed.");
    await mongoose.disconnect();
    process.exit(0);
  }
  await Service.deleteMany({});
  await User.deleteMany({ email: /@seed\.studenthub$/ });
}

for (const [title, name, category, price, description, deliveryDays] of data) {
  const email = `${name.toLowerCase().replace(/\s+/g, ".")}@seed.studenthub`;
  const user = await User.create({ name, email, password: "password123", role: "seller" });
  await Service.create({ title, category, price, description, deliveryDays, seller: name, sellerId: user._id });
}

console.log(`Seeded ${data.length} services. Seed seller logins: <first.last>@seed.studenthub / password123`);
await mongoose.disconnect();
