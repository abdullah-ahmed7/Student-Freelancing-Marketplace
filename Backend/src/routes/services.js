import { Router } from "express";
import {
  getServices, getService, getMyServices, createService, updateService, deleteService,
} from "../controllers/services.js";
import { protect, restrictTo } from "../middleware/auth.js";

const router = Router();
router.get("/", getServices);
router.get("/mine", protect, restrictTo("seller", "both"), getMyServices);
router.get("/:id", getService);
router.post("/", protect, restrictTo("seller", "both"), createService);
router.put("/:id", protect, restrictTo("seller", "both"), updateService);
router.delete("/:id", protect, restrictTo("seller", "both"), deleteService);
export default router;
