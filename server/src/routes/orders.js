import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import config from '../config.js';
import CartItem from '../models/CartItem.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import {
  canCancelOrder,
  formatOrderForClient,
  generateTrackingNumber,
  getTrackingTimeline
} from '../utils/orders.js';
import { authenticate } from '../middleware/auth.js';
import { getNextSequence, buildOrderNumber, formatOrderSequence } from '../utils/invoices.js';
import { createInvoiceForOrder } from '../controllers/invoiceController.js';
import { sendOrderConfirmationEmail, sendPaymentReceiptEmail, sendOrderStatusEmail } from '../services/notificationService.js';
import { calculateShippingCharge, createShipmentForOrder } from '../services/shadowfaxService.js';

const router = Router();

const DELIVERY_FEE = 0;

const PAYMENT_METHODS = ['cod'];

router.get('/payment-methods', (_req, res) => {
  res.json({
    methods: [
      { id: 'cod', name: 'Cash on Delivery', available: true }
    ]
  });
});

const orderValidation = [
  body('paymentMethod').trim().isIn(PAYMENT_METHODS).withMessage('Invalid payment method'),
  body('shipping').exists().withMessage('Shipping details are required'),
  body('shipping.name').trim().isLength({ min: 2, max: 100 }).withMessage('Valid recipient name is required'),
  body('shipping.email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('shipping.phone').trim().matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit phone number is required'),
  body('shipping.address').trim().isLength({ min: 10, max: 300 }).withMessage('Valid shipping address is required'),
  body('shipping.city').trim().isLength({ min: 2, max: 100 }).withMessage('City is required'),
  body('shipping.state').trim().isLength({ min: 2, max: 100 }).withMessage('State is required'),
  body('shipping.pincode').trim().matches(/^\d{6}$/).withMessage('Valid 6-digit pincode is required')
];

async function getCartItems(userId) {
  const cartItems = await CartItem.find({ user_id: userId }).populate('product_id');
  return cartItems
    .filter((ci) => ci.product_id)
    .map((ci) => ({
      quantity: ci.quantity,
      id: ci.product_id._id,
      name: ci.product_id.name,
      price: ci.product_id.price,
      stock: ci.product_id.stock,
      image: ci.product_id.image,
      weight: ci.product_id.weight
    }));
}

async function finalizeOrder(userId, items) {
  for (const item of items) {
    const productId = item.id ?? item.productId;
    const updated = await Product.findOneAndUpdate(
      { _id: productId, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } }
    );
    if (!updated) {
      throw new Error(`Insufficient stock for ${item.name}`);
    }
  }
  await CartItem.deleteMany({ user_id: userId });
}

async function restoreStock(items, session = null) {
  for (const item of items) {
    const productId = item.productId?._id ?? item.productId;
    await Product.findByIdAndUpdate(productId, { $inc: { stock: item.quantity } });
  }
}

async function findUserOrder(orderId, userId) {
  if (!mongoose.isValidObjectId(orderId) || !mongoose.isValidObjectId(userId)) return null;
  return Order.findOne({ _id: orderId, user_id: userId });
}

router.post('/create', authenticate, orderValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { paymentMethod, shipping } = req.body;
  const cartItems = await getCartItems(req.user.id);

  if (cartItems.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  for (const item of cartItems) {
    if (item.quantity > item.stock) {
      return res.status(400).json({ error: `Insufficient stock for ${item.name}` });
    }
  }

  const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const invoiceDate = new Date();
  const orderSeq = await getNextSequence('order', `${invoiceDate.getFullYear()}${String(invoiceDate.getMonth() + 1).padStart(2, '0')}${String(invoiceDate.getDate()).padStart(2, '0')}`);
  const orderNumber = `${buildOrderNumber(invoiceDate)}-${formatOrderSequence(orderSeq, 4)}`;
  const trackingNumber = generateTrackingNumber();

  const orderItems = cartItems.map((i) => ({
    productId: i.id,
    name: i.name,
    price: i.price,
    quantity: i.quantity,
    image: i.image,
    weight: i.weight
  }));

  const shippingDimensions = { length_cm: 20, width_cm: 15, height_cm: 10 };
  const weightGrams = cartItems.reduce((sum, item) => {
    const numericWeight = Number(item.weight?.replace(/[^0-9.]/g, '')) || 0;
    return sum + numericWeight * item.quantity;
  }, 0) || 500;

  let deliveryFee = DELIVERY_FEE;
  try {
    const shippingResult = await calculateShippingCharge({
      pickupPincode: config.shadowfax.pickupPincode,
      deliveryPincode: shipping.pincode,
      weightGrams,
      dimensions: shippingDimensions,
      paymentType: 'cod'
    });
    if (typeof shippingResult.charge !== 'number' || Number.isNaN(shippingResult.charge) || shippingResult.charge < 0) {
      throw new Error('Invalid delivery charge received');
    }
    deliveryFee = shippingResult.charge;
  } catch (err) {
    return res.status(502).json({ error: 'Unable to calculate delivery charge. Please try again later.' });
  }

  const total = subtotal + deliveryFee;

  const paymentStatus = 'pending';
  const paymentId = null;

  const order = await Order.create({
    user_id: req.user.id,
    order_number: orderNumber,
    items: orderItems,
    subtotal,
    delivery_fee: deliveryFee,
    total,
    delivery_partner: 'shadowfax',
    payment_method: paymentMethod,
    payment_status: paymentStatus,
    payment_id: paymentId,
    stock_reserved: true,
    shipping_name: shipping.name,
    shipping_email: shipping.email,
    shipping_phone: shipping.phone,
    shipping_address: shipping.address,
    shipping_city: shipping.city,
    shipping_state: shipping.state,
    shipping_pincode: shipping.pincode,
    status: 'confirmed',
    tracking_number: trackingNumber,
    shipping_charge: deliveryFee,
    estimated_delivery_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)
  });

  try {
    await finalizeOrder(req.user.id, cartItems);
    const user = await User.findById(req.user.id).select('name email');
    createInvoiceForOrder(order)
      .then(({ invoice, invoicePath }) => sendOrderConfirmationEmail(order, user, invoice, invoicePath))
      .catch((err) => {
        console.error('Order invoice email failed', err);
        return sendOrderConfirmationEmail(order, user);
      })
      .catch((err) => console.error('Order confirmation email failed', err));
    try {
      const shipment = await createShipmentForOrder(order);
      await sendOrderStatusEmail(order, user, 'shipped', `Your order has been shipped with AWB ${shipment.awb_number}.`)
        .catch((err) => console.error('Shipment email failed', err));
    } catch (shipmentError) {
      console.error('Shipment creation failed after order placement:', shipmentError);
    }
  } catch (err) {
    await Order.deleteOne({ _id: order._id });
    if (err.message?.includes('Insufficient stock')) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }

  res.status(201).json({
    orderId: order._id.toString(),
    orderNumber,
    paymentStatus,
    paymentId,
    message: 'Order placed! Pay on delivery.'
  });
});

router.get('/my-orders', authenticate, async (req, res) => {
  const orders = (await Order.find({ user_id: req.user.id }).sort({ created_at: -1 }))
    .map((o) => formatOrderForClient(o));
  res.json({ orders });
});

router.get('/:id/tracking', authenticate, async (req, res) => {
  const order = await findUserOrder(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const response = { order: formatOrderForClient(order), tracking: getTrackingTimeline(order) };
  if (order.shipment_id || order.tracking_id) {
    try {
      const shipmentStatus = await getShipmentStatus({
        shipmentId: order.shipment_id,
        trackingId: order.tracking_id,
        orderId: order._id.toString()
      });

      response.tracking = {
        ...response.tracking,
        currentStatus: shipmentStatus.shipment.status,
        estimatedDeliveryDate: shipmentStatus.shipment.estimated_delivery_date,
        shipment: shipmentStatus.shipment,
        events: shipmentStatus.events
      };
    } catch (err) {
      console.warn('Failed to fetch shipping carrier status:', err.message);
    }
  }

  res.json(response);
});

router.get('/:id/invoice', authenticate, async (req, res) => {
  const order = await findUserOrder(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  res.json({
    invoice: {
      invoiceNumber: `INV-${order.order_number}`,
      orderNumber: order.order_number,
      trackingNumber: order.tracking_number,
      date: order.created_at,
      status: order.status,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      paymentId: order.payment_id,
      customer: {
        name: order.shipping_name,
        email: order.shipping_email,
        phone: order.shipping_phone,
        address: order.shipping_address,
        city: order.shipping_city,
        state: order.shipping_state,
        pincode: order.shipping_pincode
      },
      items: order.items.map((item) => ({
        name: item.name,
        weight: item.weight,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity
      })),
      subtotal: order.subtotal,
      deliveryFee: order.delivery_fee,
      total: order.total,
      brand: 'Nayakar Pure',
      brandEmail: 'info@nayakarpure.com',
      brandPhone: '+91 98765 43210'
    }
  });
});

router.post('/:id/cancel', authenticate, async (req, res) => {
  try {
    const order = await findUserOrder(req.params.id, req.user.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!canCancelOrder(order)) {
      return res.status(400).json({ error: 'This order can no longer be cancelled.' });
    }

    const stockWasReduced = ['confirmed', 'packed'].includes(order.status)
      || order.payment_status === 'paid';

    if (stockWasReduced) {
      await restoreStock(order.items);
    }

    // Save cancellation feedback if provided
    const { reason, rating, feedback } = req.body;
    if (reason) order.cancellation_reason = reason;
    if (rating) order.cancellation_rating = parseInt(rating);
    if (feedback) order.cancellation_feedback = feedback;

    order.status = 'cancelled';
    order.cancelled_at = new Date();
    if (order.payment_status === 'pending') {
      order.payment_status = 'cancelled';
    }
    await order.save();

    const user = await User.findById(req.user.id).select('name email');
    sendOrderStatusEmail(order, user, 'cancelled', 'Your order has been cancelled.').catch((err) => console.error('Order cancellation email failed', err));

    res.json({
      message: 'Order cancelled successfully.',
      order: formatOrderForClient(order)
    });
  } catch (err) {
    console.error('Cancel order error:', err);
    res.status(500).json({ error: 'Failed to cancel order.' });
  }
});

export default router;
