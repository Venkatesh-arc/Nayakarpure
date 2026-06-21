export const TRACKING_STEPS = [
  { key: 'placed', label: 'Order Placed', description: 'Your order has been received.' },
  { key: 'confirmed', label: 'Confirmed', description: 'Order confirmed and being prepared.' },
  { key: 'packed', label: 'Packed', description: 'Items packed and ready to ship.' },
  { key: 'shipped', label: 'Shipped', description: 'Order handed to courier.' },
  { key: 'out_for_delivery', label: 'Out for Delivery', description: 'Courier is on the way.' },
  { key: 'delivered', label: 'Delivered', description: 'Order delivered successfully.' }
];

const STATUS_ORDER = TRACKING_STEPS.map((s) => s.key);

const CANCELLABLE = new Set(['placed', 'confirmed', 'packed']);

export function generateTrackingNumber() {
  return `NPT${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function canCancelOrder(order) {
  return CANCELLABLE.has(order.status);
}

export function getDisplayStatus(order) {
  return order.status;
}

export function getTrackingTimeline(order) {
  if (order.status === 'cancelled') {
    return {
      trackingNumber: order.tracking_number,
      currentStatus: 'cancelled',
      steps: TRACKING_STEPS.map((step) => ({
        ...step,
        completed: false,
        active: false
      })),
      cancelled: true,
      cancelledAt: order.cancelled_at
    };
  }

  const displayStatus = getDisplayStatus(order);
  const currentIdx = STATUS_ORDER.indexOf(displayStatus);

  return {
    trackingNumber: order.tracking_number,
    currentStatus: displayStatus,
    steps: TRACKING_STEPS.map((step, idx) => ({
      ...step,
      completed: idx < currentIdx,
      active: idx === currentIdx
    })),
    cancelled: false
  };
}

export function formatOrderForClient(order) {
  const api = order.toObject ? order.toObject() : { ...order };
  api.id = (api._id ?? api.id)?.toString();
  delete api._id;
  delete api.__v;
  api.canCancel = canCancelOrder(api);
  api.displayStatus = api.status === 'cancelled' ? 'cancelled' : getDisplayStatus(api);
  return api;
}
