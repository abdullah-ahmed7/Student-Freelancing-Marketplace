import { Router } from "express";
import { register, login, getMe, updateMe, verify } from "../controllers/auth.js";
import { protect } from "../middleware/auth.js";
import { authRateLimit } from "../utils/rateLimit.js";

const router = Router();
const limit = authRateLimit();
router.post("/register", limit, register);
router.post("/login", limit, login);
router.post("/verify", limit, protect, verify);
router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);
export default router;
