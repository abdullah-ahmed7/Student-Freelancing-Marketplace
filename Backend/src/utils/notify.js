import Notification from "../models/Notification.js";

// Notifications are a side effect: a failure here must never fail the action that triggered it.
export async function notify(userId, type, text, link = "") {
  try {
    await Notification.create({ user: userId, type, text, link });
  } catch (err) {
    console.error("notification failed:", err.message);
  }
}
