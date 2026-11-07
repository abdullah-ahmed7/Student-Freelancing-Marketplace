import Order from "../models/Order.js";
import Service from "../models/Service.js";

export async function createOrder(req, res, next) {
  try {
    const { serviceId, requirements } = req.body;
    const service = await Service.findById(serviceId);
    if (!service || !service.isActive) {
      return res.status(404).json({ message: "Service not found or unavailable" });
    }
    if (service.sellerId.equals(req.user._id)) {
      return res.status(400).json({ message: "You cannot order your own service" });
    }
    const order = await Order.create({
      service: service._id,
      buyer: req.user._id,
      seller: service.sellerId,
      price: service.price,
      requirements,
    });
    res.status(201).json({ order });
  } catch (err) {
    next(err);
  }
}

// Orders where the user is the buyer (default) or the seller (?as=seller)
export async function getMyOrders(req, res, next) {
  try {
    const asSeller = req.query.as === "seller";
    const orders = await Order.find(asSeller ? { seller: req.user._id } : { buyer: req.user._id })
      .populate("service", "title image price")
      .populate("buyer", "name email")
      .populate("seller", "name email")
      .sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    next(err);
  }
}

export async function getOrder(req, res, next) {
  try {
    const order = await Order.findById(req.params.id)
      .populate("service", "title image price")
      .populate("buyer", "name email")
      .populate("seller", "name email");
    if (!order) return res.status(404).json({ message: "Order not found" });
    const uid = req.user._id;
    if (!order.buyer._id.equals(uid) && !order.seller._id.equals(uid)) {
      return res.status(403).json({ message: "Not your order" });
    }
    res.json({ order });
  } catch (err) {
    next(err);
  }
}

// Who may move an order to each status, and from which states
const transitions = {
  accepted: { by: "seller", from: ["pending"] },
  rejected: { by: "seller", from: ["pending"] },
  completed: { by: "seller", from: ["accepted"] },
  cancelled: { by: "buyer", from: ["pending"] },
};

export async function updateOrderStatus(req, res, next) {
  try {
    const { status } = req.body;
    const rule = transitions[status];
    if (!rule) return res.status(400).json({ message: "Invalid status" });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!order[rule.by].equals(req.user._id)) {
      return res.status(403).json({ message: `Only the ${rule.by} can set this status` });
    }
    if (!rule.from.includes(order.status)) {
      return res.status(400).json({ message: `Cannot go from ${order.status} to ${status}` });
    }
    order.status = status;
    await order.save();
    res.json({ order });
  } catch (err) {
    next(err);
  }
}
