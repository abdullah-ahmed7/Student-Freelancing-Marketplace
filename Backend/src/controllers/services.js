import Service from "../models/Service.js";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /api/services  -> plain array (same shape as the frontend's mock data)
// Query: search, category, minPrice, maxPrice, sort (newest|price_asc|price_desc|rating)
export async function getServices(req, res, next) {
  try {
    const { search, category, minPrice, maxPrice, sort } = req.query;
    const filter = { isActive: true };

    if (search && search.trim()) {
      const rx = new RegExp(escapeRegex(search.trim()), "i");
      filter.$or = [{ title: rx }, { description: rx }, { seller: rx }];
    }
    if (category && category !== "All") filter.category = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const sortMap = {
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      rating: { avgRating: -1 },
      newest: { createdAt: -1 },
    };

    const services = await Service.find(filter).sort(sortMap[sort] || { createdAt: -1 });
    res.json(services);
  } catch (err) {
    next(err);
  }
}

export async function getService(req, res, next) {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ message: "Service not found" });
    res.json(service);
  } catch (err) {
    next(err);
  }
}

// GET /api/services/mine -> the logged-in user's own listings
export async function getMyServices(req, res, next) {
  try {
    const services = await Service.find({ sellerId: req.user._id }).sort({ createdAt: -1 });
    res.json(services);
  } catch (err) {
    next(err);
  }
}

export async function createService(req, res, next) {
  try {
    const { title, description, category, price, deliveryDays } = req.body;
    const service = await Service.create({
      title,
      description,
      category,
      price: Number(price),
      deliveryDays: Number(deliveryDays),
      seller: req.user.name,
      sellerId: req.user._id,
    });
    res.status(201).json(service);
  } catch (err) {
    next(err);
  }
}

export async function updateService(req, res, next) {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ message: "Service not found" });
    if (!service.sellerId.equals(req.user._id)) {
      return res.status(403).json({ message: "You can only edit your own services" });
    }
    ["title", "description", "category", "price", "deliveryDays", "isActive"].forEach((f) => {
      if (req.body[f] !== undefined) service[f] = req.body[f];
    });
    await service.save();
    res.json(service);
  } catch (err) {
    next(err);
  }
}

export async function deleteService(req, res, next) {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ message: "Service not found" });
    if (!service.sellerId.equals(req.user._id)) {
      return res.status(403).json({ message: "You can only delete your own services" });
    }
    await service.deleteOne();
    res.json({ message: "Service deleted" });
  } catch (err) {
    next(err);
  }
}
