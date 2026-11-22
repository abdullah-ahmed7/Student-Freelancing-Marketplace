import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";
import connectDB from "./config/db.js";
import { assertEnv, env } from "./config/env.js";

async function main() {
  assertEnv();
  await connectDB();
  const server = app.listen(env.port, () => console.log(`StudentHub API listening on http://localhost:${env.port}`));
  const shutdown = () => server.close(() => mongoose.disconnect().then(() => process.exit(0)));
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Startup failed:", err.message);
  process.exit(1);
});
