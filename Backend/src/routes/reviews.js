import { Router } from "express";
import { createReview, getServiceReviews } from "../controllers/reviews.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.get("/service/:serviceId", getServiceReviews);
router.post("/", protect, createReview);
export default router;
