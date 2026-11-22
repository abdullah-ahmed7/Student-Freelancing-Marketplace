import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profiles.js";
import portfolioRoutes from "./routes/portfolio.js";
import categoryRoutes from "./routes/categories.js";
import serviceRoutes from "./routes/services.js";
import favoriteRoutes from "./routes/favorites.js";
import orderRoutes from "./routes/orders.js";
import reviewRoutes from "./routes/reviews.js";
import reportRoutes from "./routes/reports.js";
import notificationRoutes from "./routes/notifications.js";
import dashboardRoutes from "./routes/dashboard.js";
import adminRoutes from "./routes/admin.js";
import { notFound, errorHandler } from "./middleware/error.js";

const app = express();
app.disable("x-powered-by");

app.use(cors({
  origin(origin, cb) {
    // no Origin header = curl / server-to-server; browsers must come from CLIENT_URL
    if (!origin || env.clientUrls.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
}));
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  res.json({ status: "ok", db: states[mongoose.connection.readyState] || "unknown" });
});

app.use("/api/auth", authRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
