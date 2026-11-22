// Allowed transitions: [from status][action] = { to, actor, needsNote? }
// The backend enforces the same table on every request (Backend/src/utils/orderWorkflow.js); the UI uses it only to decide which buttons to show.
export const TRANSITIONS = {
  Requested: {
    accept: { to: 'Accepted', actor: 'seller' },
    reject: { to: 'Rejected', actor: 'seller' },
    cancel: { to: 'Cancelled', actor: 'buyer' },
  },
  Accepted: {
    start: { to: 'In Progress', actor: 'seller' },
    cancel: { to: 'Cancelled', actor: 'buyer' },
  },
  'In Progress': { deliver: { to: 'Delivered', actor: 'seller' } },
  Delivered: {
    complete: { to: 'Completed', actor: 'buyer' },
    revise: { to: 'Revision Requested', actor: 'buyer' },
  },
  'Revision Requested': { start: { to: 'In Progress', actor: 'seller' } },
};

export function allowedActions(order, userId) {
  const role = order.buyerId === userId ? 'buyer' : order.sellerId === userId ? 'seller' : null;
  if (!role) return [];
  return Object.entries(TRANSITIONS[order.status] || {})
    .filter(([, t]) => t.actor === role).map(([action]) => action);
}

