import { Router } from "express";
import { create, list, getOne, act, listMessages, sendMessage } from "../controllers/orders.js";
import { protect, studentOnly } from "../middleware/auth.js";
import { validateId } from "../middleware/validateId.js";

const router = Router();
router.use(protect);
router.post("/", studentOnly, create);
router.get("/", studentOnly, list);
router.get("/:id", validateId("id"), getOne); // participants + admin (read-only)
router.patch("/:id/status", studentOnly, validateId("id"), act);
router.get("/:id/messages", studentOnly, validateId("id"), listMessages);
router.post("/:id/messages", studentOnly, validateId("id"), sendMessage);
export default router;
