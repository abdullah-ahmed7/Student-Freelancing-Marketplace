import { Router } from "express";
import { list, markAllRead, markRead } from "../controllers/notifications.js";
import { protect } from "../middleware/auth.js";
import { validateId } from "../middleware/validateId.js";

const router = Router();
router.use(protect);
router.get("/", list);
router.patch("/read", markAllRead);
router.patch("/:id/read", validateId("id"), markRead);
export default router;