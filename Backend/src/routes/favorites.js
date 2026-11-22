import { Router } from "express";
import { list, ids, add, remove } from "../controllers/favorites.js";
import { protect, studentOnly } from "../middleware/auth.js";
import { validateId } from "../middleware/validateId.js";

const router = Router();
router.use(protect, studentOnly);
router.get("/", list);
router.get("/ids", ids);
router.post("/:serviceId", validateId("serviceId"), add);
router.delete("/:serviceId", validateId("serviceId"), remove);
export default router;
