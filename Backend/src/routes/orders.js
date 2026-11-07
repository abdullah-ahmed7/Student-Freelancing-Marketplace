import { Router } from "express";
import { createOrder, getMyOrders, getOrder, updateOrderStatus } from "../controllers/orders.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);
router.post("/", createOrder);
router.get("/", getMyOrders);
router.get("/:id", getOrder);
router.patch("/:id/status", updateOrderStatus);
export default router;
