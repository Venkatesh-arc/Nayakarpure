import config from '../config.js';
import DeliveryCharge from '../models/DeliveryCharge.js';
import Shipment from '../models/Shipment.js';
import TrackingEvent from '../models/TrackingEvent.js';
import Order from '../models/Order.js';

const SHADOWFAX_BASE_URL = config.shadowfax.url;
const SHADOWFAX_API_KEY = config.shadowfax.apiKey;
const SHADOWFAX_API_SECRET = config.shadowfax.apiSecret;

function parseWeightString(weight) {
  if (!weight) return 0;
  const normalized = String(weight).trim().toLowerCase();
  const gramsMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(kg|g|gm)/);
  if (!gramsMatch) {
    const numberMatch = normalized.match(/\d+(?:\.\d+)?/);
    return numberMatch ? Math.round(parseFloat(numberMatch) * 1000) : 0;
  }
  const value = parseFloat(gramsMatch[1]);
  const unit = gramsMatch[2];
  return unit.startsWith('kg') ? Math.round(value * 1000) : Math.round(value);
}

function formatDimensions({ length_cm, width_cm, height_cm }) {
  return {
    length_cm: Number(length_cm) || 10,
    width_cm: Number(width_cm) || 10,
    height_cm: Number(height_cm) || 10
  };
}

function toShadowfaxHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${SHADOWFAX_API_KEY}`
  };
}

function fallbackCharge({ weightGrams, dimensions, paymentType }) {
  const weightKg = Math.max(weightGrams / 1000, 0.5);
  const volumetric = (dimensions.length_cm * dimensions.width_cm * dimensions.height_cm) / 5000;
  const base = 50;
  const weightCharge = Math.ceil(Math.max(weightKg, volumetric)) * 20;
  const paymentSurcharge = paymentType === 'cod' ? 25 : 0;
  const charge = Math.max(base + weightCharge + paymentSurcharge, 45);
  return {
    charge,
    currency: 'INR',
    estimatedDeliveryDays: 3 + Math.ceil(weightKg / 2),
    provider: 'shadowfax-fallback'
  };
}

async function shadowfaxFetch(path, method = 'GET', body = null, retries = 2) {
  if (!SHADOWFAX_API_KEY || !SHADOWFAX_API_SECRET) {
    throw new Error('Shadowfax API credentials are not configured.');
  }

  const url = `${SHADOWFAX_BASE_URL}${path}`;
  const options = {
    method,
    headers: toShadowfaxHeaders(),
    body: body ? JSON.stringify(body) : undefined
  };

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      if (!response.ok) {
        const message = data?.message || data?.error || `Shadowfax responded with ${response.status}`;
        throw new Error(message);
      }
      return data;
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
}

export async function calculateShippingCharge({ pickupPincode, deliveryPincode, weightGrams, dimensions, paymentType }) {
  const normalized = {
    pickup_pincode: pickupPincode,
    delivery_pincode: deliveryPincode,
    weight_grams: Number(weightGrams) || 0,
    payment_type: paymentType === 'cod' ? 'cod' : 'prepaid',
    ...formatDimensions(dimensions)
  };

  const existing = await DeliveryCharge.findOne({
    pickup_pincode: normalized.pickup_pincode,
    delivery_pincode: normalized.delivery_pincode,
    weight_grams: normalized.weight_grams,
    payment_type: normalized.payment_type
  });

  if (existing) {
    return {
      charge: existing.charge,
      currency: existing.currency,
      estimatedDeliveryDays: existing.estimated_delivery_days,
      provider: existing.provider
    };
  }

  let chargeResult;
  if (config.shadowfax.enabled) {
    try {
      const payload = {
        pickup_pincode: normalized.pickup_pincode,
        delivery_pincode: normalized.delivery_pincode,
        weight_grams: normalized.weight_grams,
        length_cm: normalized.length_cm,
        width_cm: normalized.width_cm,
        height_cm: normalized.height_cm,
        payment_type: normalized.payment_type,
        service_type: 'standard'
      };
      const response = await shadowfaxFetch('/rates', 'POST', payload);
      chargeResult = {
        charge: Number(response.charge || response.rate || response.amount || 0),
        currency: response.currency || 'INR',
        estimatedDeliveryDays: Number(response.estimated_delivery_days || response.delivery_days || 3),
        provider: 'shadowfax',
        raw_response: response
      };
    } catch (error) {
      chargeResult = { ...fallbackCharge({ weightGrams: normalized.weight_grams, dimensions: normalized, paymentType: normalized.payment_type }), raw_response: { error: error.message } };
    }
  } else {
    chargeResult = fallbackCharge({ weightGrams: normalized.weight_grams, dimensions: normalized, paymentType: normalized.payment_type });
  }

  await DeliveryCharge.create({
    ...normalized,
    charge: chargeResult.charge,
    currency: chargeResult.currency,
    estimated_delivery_days: chargeResult.estimatedDeliveryDays,
    provider: chargeResult.provider,
    raw_response: chargeResult.raw_response
  });

  return chargeResult;
}

function formatOrderDimensions(order) {
  const dimensions = order.items.reduce((best, item) => {
    const itemLength = Number(item.length_cm) || 10;
    const itemWidth = Number(item.width_cm) || 10;
    const itemHeight = Number(item.height_cm) || 10;
    return {
      length_cm: Math.max(best.length_cm, itemLength),
      width_cm: Math.max(best.width_cm, itemWidth),
      height_cm: Math.max(best.height_cm, itemHeight),
    };
  }, { length_cm: 10, width_cm: 10, height_cm: 10 });
  return dimensions;
}

export async function createShipmentForOrder(order) {
  if (!order || order.shipment_id) {
    return order;
  }

  const dimensions = formatOrderDimensions(order);
  const weightGrams = order.items.reduce((sum, item) => {
    const parsed = parseWeightString(item.weight);
    return sum + parsed * item.quantity;
  }, 0);

  const paymentType = order.payment_method === 'cod' ? 'cod' : 'prepaid';
  let chargeResult;
  try {
    chargeResult = await calculateShippingCharge({
      pickupPincode: config.shadowfax.pickupPincode,
      deliveryPincode: order.shipping_pincode,
      weightGrams,
      dimensions,
      paymentType
    });
  } catch (error) {
    order.shipment_error = `Delivery charge calculation failed: ${error.message}`;
    await order.save();
    throw error;
  }

  const shipmentPayload = {
    pickup_pincode: config.shadowfax.pickupPincode,
    delivery_pincode: order.shipping_pincode,
    payment_type: paymentType,
    service_type: 'standard',
    package: {
      weight_grams: weightGrams,
      length_cm: dimensions.length_cm,
      width_cm: dimensions.width_cm,
      height_cm: dimensions.height_cm,
      items: order.items.map((item) => ({ name: item.name, quantity: item.quantity, price: item.price }))
    },
    customer: {
      name: order.shipping_name,
      phone: order.shipping_phone,
      email: order.shipping_email,
      address: order.shipping_address,
      city: order.shipping_city,
      state: order.shipping_state,
      pincode: order.shipping_pincode
    },
    order_reference: order.order_number,
    total_amount: order.total
  };

  let response;
  if (config.shadowfax.enabled) {
    response = await shadowfaxFetch('/shipments', 'POST', shipmentPayload);
  } else {
    response = {
      shipment_id: `SHDWFX-${Date.now().toString(36).toUpperCase()}`,
      awb_number: `AWB${Math.floor(100000 + Math.random() * 900000)}`,
      tracking_id: `TRK${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'created',
      estimated_delivery_date: new Date(Date.now() + (chargeResult.estimatedDeliveryDays || 3) * 24 * 60 * 60 * 1000).toISOString(),
      label_url: null,
      events: [
        { status: 'created', title: 'Shipment created', description: 'Your shipment has been registered with Shadowfax.' }
      ]
    };
  }

  const shipment = await Shipment.create({
    order_id: order._id,
    shipment_id: response.shipment_id || response.id || `SHDWFX-${Date.now().toString(36).toUpperCase()}`,
    awb_number: response.awb_number || response.airway_bill || '',
    tracking_id: response.tracking_id || response.tracking_number || response.awb_number || '',
    courier_name: 'Shadowfax',
    pickup_pincode: config.shadowfax.pickupPincode,
    delivery_pincode: order.shipping_pincode,
    service_type: 'standard',
    payment_type: paymentType,
    weight_grams: weightGrams,
    length_cm: dimensions.length_cm,
    width_cm: dimensions.width_cm,
    height_cm: dimensions.height_cm,
    charge: chargeResult.charge,
    currency: chargeResult.currency,
    status: response.status || 'created',
    estimated_delivery_date: response.estimated_delivery_date ? new Date(response.estimated_delivery_date) : new Date(Date.now() + (chargeResult.estimatedDeliveryDays || 3) * 86400000),
    label_url: response.label_url || null,
    raw_response: response
  });

  order.shipment_id = shipment.shipment_id;
  order.awb_number = shipment.awb_number;
  order.tracking_id = shipment.tracking_id;
  order.courier_name = shipment.courier_name;
  order.shipping_charge = shipment.charge;
  order.estimated_delivery_date = shipment.estimated_delivery_date;
  order.delivery_fee = shipment.charge;
  order.status = order.status || 'confirmed';
  order.shipment_error = undefined;
  await order.save();

  const events = (response.events || []).map((event) => ({
    shipment_id: shipment._id,
    order_id: order._id,
    status: event.status || event.stage || 'created',
    title: event.title || event.name || event.status || 'Shipment event',
    description: event.description || event.details || '',
    location: event.location || undefined,
    event_time: event.timestamp ? new Date(event.timestamp) : new Date(),
    raw_event: event
  }));

  if (events.length > 0) {
    await TrackingEvent.deleteMany({ shipment_id: shipment._id });
    await TrackingEvent.insertMany(events);
  }

  return shipment;
}

export async function getShipmentStatus({ shipmentId, trackingId, orderId }) {
  const query = {};
  if (shipmentId) query.shipment_id = shipmentId;
  if (trackingId) query.tracking_id = trackingId;
  if (orderId) query.order_id = orderId;

  const shipment = await Shipment.findOne(query);
  if (!shipment) {
    throw new Error('Shipment not found');
  }

  let response;
  if (config.shadowfax.enabled) {
    response = await shadowfaxFetch(`/shipments/${encodeURIComponent(shipment.shipment_id)}/status`, 'GET');
  } else {
    response = {
      status: shipment.status,
      events: await TrackingEvent.find({ shipment_id: shipment._id }).sort({ event_time: 1 }).lean(),
      estimated_delivery_date: shipment.estimated_delivery_date
    };
  }

  const events = response.events || [];
  if (!Array.isArray(events)) {
    throw new Error('Unexpected tracking response from Shadowfax');
  }

  return {
    shipment: {
      shipment_id: shipment.shipment_id,
      awb_number: shipment.awb_number,
      tracking_id: shipment.tracking_id,
      courier_name: shipment.courier_name,
      status: response.status || shipment.status,
      estimated_delivery_date: response.estimated_delivery_date ? new Date(response.estimated_delivery_date) : shipment.estimated_delivery_date,
      label_url: shipment.label_url
    },
    events: events.map((event) => ({
      status: event.status || event.stage || 'unknown',
      title: event.title || event.name || event.status || 'Updated',
      description: event.description || event.details || '',
      location: event.location || undefined,
      event_time: event.event_time ? new Date(event.event_time) : new Date()
    }))
  };
}

export async function cancelShipment(shipmentId) {
  const shipment = await Shipment.findOne({ shipment_id: shipmentId });
  if (!shipment) throw new Error('Shipment not found');

  let response;
  if (config.shadowfax.enabled) {
    response = await shadowfaxFetch(`/shipments/${encodeURIComponent(shipment.shipment_id)}/cancel`, 'POST', {});
  } else {
    response = { status: 'cancelled', message: 'Mock cancellation completed' };
  }

  shipment.status = response.status || 'cancelled';
  shipment.raw_response = response;
  await shipment.save();
  await TrackingEvent.create({
    shipment_id: shipment._id,
    order_id: shipment.order_id,
    status: shipment.status,
    title: 'Shipment cancelled',
    description: response.message || 'Shipment cancelled successfully',
    event_time: new Date(),
    raw_event: response
  });

  const order = await Order.findById(shipment.order_id);
  if (order) {
    order.status = 'cancelled';
    order.payment_status = order.payment_status === 'paid' ? 'cancelled' : order.payment_status;
    await order.save();
  }

  return shipment;
}

export async function generateShipmentLabel(shipmentId) {
  const shipment = await Shipment.findOne({ shipment_id: shipmentId });
  if (!shipment) throw new Error('Shipment not found');

  let response;
  if (config.shadowfax.enabled) {
    response = await shadowfaxFetch(`/shipments/${encodeURIComponent(shipment.shipment_id)}/label`, 'GET');
  } else {
    response = { label_url: shipment.label_url || null };
  }

  shipment.label_url = response.label_url || shipment.label_url;
  shipment.raw_response = response;
  await shipment.save();

  return shipment;
}
