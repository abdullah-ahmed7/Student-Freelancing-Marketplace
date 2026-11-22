import { Router } from "express";
import { listUsers, getUser, updateUser, listServices } from "../controllers/admin.js";
import { adminOnly, protect } from "../middleware/auth.js";
import { validateId } from "../middleware/validateId.js";

const router = Router();
router.use(protect, adminOnly); // every /api/admin/* route is admin-only, enforced on the server
router.get("/users", listUsers);
router.get("/users/:id", validateId("id"), getUser);
router.patch("/users/:id", validateId("id"), updateUser);
router.get("/services", listServices);
export default router;
