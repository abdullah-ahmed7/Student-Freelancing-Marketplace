import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import serviceRoutes from "./routes/services.js";
import orderRoutes from "./routes/orders.js";
import reviewRoutes from "./routes/reviews.js";
import { notFound, errorHandler } from "./middleware/error.js";

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
