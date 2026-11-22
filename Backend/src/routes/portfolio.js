import { Router } from "express";
import { list, create, update, remove } from "../controllers/portfolio.js";
import { protect, studentOnly } from "../middleware/auth.js";
import { validateId } from "../middleware/validateId.js";

const router = Router();
router.use(protect, studentOnly);
router.get("/", list);
router.post("/", create);
router.put("/:id", validateId("id"), update);
router.delete("/:id", validateId("id"), remove);
export default router;
