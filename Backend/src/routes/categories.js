import { Router } from "express";
import { list, create, update, remove } from "../controllers/categories.js";
import { adminOnly, optionalAuth, protect } from "../middleware/auth.js";
import { validateId } from "../middleware/validateId.js";

const router = Router();
router.get("/", optionalAuth, list);
router.post("/", protect, adminOnly, create);
router.patch("/:id", protect, adminOnly, validateId("id"), update);
router.put("/:id", protect, adminOnly, validateId("id"), update);
router.delete("/:id", protect, adminOnly, validateId("id"), remove);
export default router;
