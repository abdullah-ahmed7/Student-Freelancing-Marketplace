import { Router } from "express";
import { getMine, updateMine, listStudents, getPublic } from "../controllers/profiles.js";
import { optionalAuth, protect } from "../middleware/auth.js";
import { validateId } from "../middleware/validateId.js";

const router = Router();
router.get("/me", protect, getMine);
router.put("/me", protect, updateMine);
router.get("/students", listStudents);
router.get("/:id", validateId("id"), optionalAuth, getPublic);
export default router;
