import { Router } from "express";
import { create, listForService, listAll, remove } from "../controllers/reviews.js";
import { adminOnly, protect, studentOnly } from "../middleware/auth.js";
import { validateId } from "../middleware/validateId.js";

const router = Router();
router.get("/service/:serviceId", validateId("serviceId"), listForService);
router.get("/", protect, adminOnly, listAll);
router.post("/", protect, studentOnly, create);
router.delete("/:id", protect, adminOnly, validateId("id"), remove);
export default router;
