import { Router } from "express";
import { create, list, resolve } from "../controllers/reports.js";
import { adminOnly, protect, studentOnly } from "../middleware/auth.js";
import { validateId } from "../middleware/validateId.js";

const router = Router();
router.post("/", protect, studentOnly, create);
router.get("/", protect, adminOnly, list);
router.patch("/:id", protect, adminOnly, validateId("id"), resolve);
export default router;
