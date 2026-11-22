// Single source of truth for the order state machine (enforced server-side on every request).
// TRANSITIONS[currentStatus][action] = { to, actor, type } — `actor` is who may perform it.
export const TRANSITIONS = {
  Requested: {
    accept: { to: "Accepted", actor: "seller", type: "order_accepted" },
    reject: { to: "Rejected", actor: "seller", type: "order_rejected" },
    cancel: { to: "Cancelled", actor: "buyer", type: "order_cancelled" },
  },
  // The buyer may cancel until the seller actually starts the work (business rule).
  Accepted: {
    start: { to: "In Progress", actor: "seller", type: "order_started" },
    cancel: { to: "Cancelled", actor: "buyer", type: "order_cancelled" },
  },
  "In Progress": { deliver: { to: "Delivered", actor: "seller", type: "order_delivered" } },
  Delivered: {
    complete: { to: "Completed", actor: "buyer", type: "order_completed" },
    revise: { to: "Revision Requested", actor: "buyer", type: "order_revision_requested" },
  },
  "Revision Requested": { start: { to: "In Progress", actor: "seller", type: "order_started" } },
};

export const ACTIONS = ["accept", "reject", "start", "deliver", "complete", "revise", "cancel"];
