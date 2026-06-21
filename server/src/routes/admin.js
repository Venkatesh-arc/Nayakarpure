import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import ContactMessage from '../models/ContactMessage.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { toApi } from '../utils/format.js';
import {
  formatOrderForClient,
  generateTrackingNumber,
  TRACKING_STEPS
} from '../utils/orders.js';
import { sendOrderStatusEmail, sendPaymentReceiptEmail, sendRefundEmail } from '../services/notificationService.js';

const router = Router();
const admin = [authenticate, requireAdmin];

const VALID_STATUSES = [...TRACKING_STEPS.map((s) => s.key), 'cancelled'];

async function restoreStock(items) {
  for (const item of items) {
    const productId = item.productId?._id ?? item.productId;
    await Product.findByIdAndUpdate(productId, { $inc: { stock: item.quantity } });
  }
}

router.get('/dashboard', admin, async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalProducts,
    totalCustomers,
    totalOrders,
    ordersToday,
    revenueAgg,
    lowStock,
    unreadMessages,
    recentOrders
  ] = await Promise.all([
    Product.countDocuments(),
    User.countDocuments({ role: { $ne: 'admin' } }),
    Order.countDocuments(),
    Order.countDocuments({ created_at: { $gte: today } }),
    Order.aggregate([
      { $match: { status: { $ne: 'cancelled' }, payment_status: { $in: ['paid', 'cod'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]),
    Product.find({ stock: { $lte: 20 } }).sort({ stock: 1 }).limit(5),
    ContactMessage.countDocuments({ read: false }),
    Order.find().sort({ created_at: -1 }).limit(5).populate('user_id', 'name email')
  ]);

  res.json({
    stats: {
      totalProducts,
      totalCustomers,
      totalOrders,
      ordersToday,
      totalRevenue: revenueAgg[0]?.total ?? 0,
      lowStockCount: lowStock.length,
      unreadMessages
    },
    lowStock: lowStock.map(toApi),
    recentOrders: recentOrders.map((o) => {
      const formatted = formatOrderForClient(o);
      formatted.customer = o.user_id ? { name: o.user_id.name, email: o.user_id.email } : null;
      return formatted;
    })
  });
});

router.get('/products', admin, async (_req, res) => {
  const products = await Product.find().sort({ created_at: -1 });
  res.json({ products: products.map(toApi) });
});

const productValidation = [
  body('name').trim().isLength({ min: 2, max: 200 }),
  body('description').trim().isLength({ min: 10, max: 2000 }),
  body('price').isFloat({ min: 1 }),
  body('category').trim().notEmpty(),
  body('stock').isInt({ min: 0 }),
  body('image').optional().trim(),
  body('weight').optional().trim(),
  body('features').optional().isArray()
];

router.post('/products', admin, productValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const product = await Product.create(req.body);
  res.status(201).json({ product: toApi(product) });
});

router.put('/products/:id', admin, productValidation, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ product: toApi(product) });
});

router.delete('/products/:id', admin, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ message: 'Product deleted' });
});

router.get('/orders', admin, async (req, res) => {
  const filter = {};
  if (req.query.status && VALID_STATUSES.includes(req.query.status)) {
    filter.status = req.query.status;
  }

  const orders = await Order.find(filter)
    .sort({ created_at: -1 })
    .populate('user_id', 'name email phone');

  res.json({
    orders: orders.map((o) => {
      const formatted = formatOrderForClient(o);
      formatted.customer = o.user_id
        ? { name: o.user_id.name, email: o.user_id.email, phone: o.user_id.phone }
        : null;
      return formatted;
    })
  });
});

router.get('/orders/:id', admin, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid order ID' });
  }
  const order = await Order.findById(req.params.id).populate('user_id', 'name email phone');
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const formatted = formatOrderForClient(order);
  formatted.customer = order.user_id
    ? { name: order.user_id.name, email: order.user_id.email, phone: order.user_id.phone }
    : null;
  res.json({ order: formatted });
});

router.patch('/orders/:id', admin, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid order ID' });
  }

  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const { status, tracking_number, payment_status, refund_status } = req.body;
  const previousStatus = order.status;
  const previousRefundStatus = order.refund_status;

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    if (status === 'cancelled' && order.status !== 'cancelled') {
      await restoreStock(order.items);
      order.cancelled_at = new Date();
    }
    order.status = status;
  }

  if (tracking_number !== undefined) {
    order.tracking_number = tracking_number || undefined;
  } else if (['shipped', 'out_for_delivery', 'delivered'].includes(order.status) && !order.tracking_number) {
    order.tracking_number = generateTrackingNumber();
  }

  if (payment_status !== undefined) {
    if (!['pending', 'paid', 'failed', 'cod', 'cancelled'].includes(payment_status)) {
      return res.status(400).json({ error: 'Invalid payment status' });
    }
    order.payment_status = payment_status;
  }

  if (refund_status !== undefined) {
    if (!['none', 'initiated', 'completed'].includes(refund_status)) {
      return res.status(400).json({ error: 'Invalid refund status' });
    }
    order.refund_status = refund_status;
  }

  await order.save();

  const user = await User.findById(order.user_id).select('name email');
  if (status && status !== previousStatus) {
    if (status === 'shipped') {
      sendOrderStatusEmail(order, user, 'shipped', 'Your order is on the way.').catch((err) => console.error('Order shipped email failed', err));
    } else if (status === 'out_for_delivery') {
      sendOrderStatusEmail(order, user, 'out_for_delivery', 'Your order is out for delivery.').catch((err) => console.error('Order out for delivery email failed', err));
    } else if (status === 'delivered') {
      sendOrderStatusEmail(order, user, 'delivered', 'Your order has been delivered.').catch((err) => console.error('Order delivered email failed', err));
    } else if (status === 'cancelled') {
      sendOrderStatusEmail(order, user, 'cancelled', 'Your order has been cancelled.').catch((err) => console.error('Order cancellation email failed', err));
    }
  }

  if (refund_status !== undefined && refund_status !== previousRefundStatus) {
    const refundState = refund_status === 'completed' ? 'completed' : 'initiated';
    sendRefundEmail(order, user, refundState).catch((err) => console.error('Refund email failed', err));
  }

  res.json({ order: formatOrderForClient(order) });
});

router.get('/customers', admin, async (_req, res) => {
  const customers = await User.find({ role: { $ne: 'admin' } })
    .select('name email phone created_at')
    .sort({ created_at: -1 });

  const orderCounts = await Order.aggregate([
    { $group: { _id: '$user_id', count: { $sum: 1 }, totalSpent: { $sum: '$total' } } }
  ]);
  const statsMap = Object.fromEntries(
    orderCounts.map((s) => [s._id.toString(), { orders: s.count, totalSpent: s.totalSpent }])
  );

  res.json({
    customers: customers.map((c) => {
      const api = toApi(c);
      const stats = statsMap[c._id.toString()] || { orders: 0, totalSpent: 0 };
      return { ...api, ...stats };
    })
  });
});

router.get('/contact', admin, async (_req, res) => {
  const messages = await ContactMessage.find().sort({ created_at: -1 });
  res.json({ messages: messages.map(toApi) });
});

router.patch('/contact/:id', admin, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid message ID' });
  }
  const message = await ContactMessage.findByIdAndUpdate(
    req.params.id,
    { read: req.body.read ?? true },
    { new: true }
  );
  if (!message) return res.status(404).json({ error: 'Message not found' });
  res.json({ message: toApi(message) });
});

export default router;
