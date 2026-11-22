import { Router } from "express";
import { student, admin } from "../controllers/dashboard.js";
import { adminOnly, protect, studentOnly } from "../middleware/auth.js";

const router = Router();
router.get("/student", protect, studentOnly, student);
router.get("/admin", protect, adminOnly, admin);
export default router;
