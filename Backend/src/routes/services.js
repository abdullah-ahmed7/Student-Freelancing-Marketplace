import { Router } from "express";
import { search, getOne, listMine, create, update, setStatus, remove } from "../controllers/services.js";
import { optionalAuth, protect, studentOnly } from "../middleware/auth.js";
import { validateId } from "../middleware/validateId.js";

const router = Router();
router.get("/", search);
router.get("/mine", protect, studentOnly, listMine);
router.get("/:id", validateId("id"), optionalAuth, getOne);
router.post("/", protect, studentOnly, create);
router.put("/:id", protect, studentOnly, validateId("id"), update);
router.patch("/:id/status", protect, validateId("id"), setStatus); // owner or admin (checked in controller)
router.delete("/:id", protect, validateId("id"), remove); // owner or admin (checked in controller)
export default router;
