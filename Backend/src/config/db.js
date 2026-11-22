import mongoose from "mongoose";
import { env } from "./env.js";
import "../models/index.js";

export default async function connectDB() {
  if (!env.mongoUri) throw new Error("MONGO_URI is not set");
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 });
  // Build indexes (unique email, one review per order, unique favorites...) before serving traffic.
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  console.log(`MongoDB connected (${mongoose.connection.host}/${mongoose.connection.name})`);
}
