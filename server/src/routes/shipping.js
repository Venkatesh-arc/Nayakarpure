import { Router } from 'express';
import { query, body, validationResult } from 'express-validator';
import config from '../config.js';
import Order from '../models/Order.js';
import Shipment from '../models/Shipment.js';
import DeliveryCharge from '../models/DeliveryCharge.js';
import User from '../models/User.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { calculateShippingCharge, createShipmentForOrder, getShipmentStatus, cancelShipment, generateShipmentLabel } from '../services/shadowfaxService.js';
import { sendOrderStatusEmail } from '../services/notificationService.js';

const router = Router();

router.get('/charges', [
  query('deliveryPincode').trim().matches(/^\d{6}$/).withMessage('Valid delivery pincode required'),
  query('paymentType').trim().isIn(['cod', 'prepaid', 'razorpay']).withMessage('Payment type must be cod, prepaid, or razorpay'),
  query('weightGrams').optional().isInt({ min: 1 }).withMessage('Weight in grams required'),
  query('lengthCm').optional().isFloat({ min: 1 }),
  query('widthCm').optional().isFloat({ min: 1 }),
  query('heightCm').optional().isFloat({ min: 1 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { deliveryPincode, paymentType, weightGrams, lengthCm, widthCm, heightCm } = req.query;
  try {
    const normalizedPaymentType = paymentType === 'cod' ? 'cod' : 'prepaid';
    const charge = await calculateShippingCharge({
      pickupPincode: config.shadowfax.pickupPincode,
      deliveryPincode,
      weightGrams: Number(weightGrams) || 500,
      dimensions: { length_cm: Number(lengthCm) || 10, width_cm: Number(widthCm) || 10, height_cm: Number(heightCm) || 10 },
      paymentType: normalizedPaymentType
    });
    res.json({ charge });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to calculate delivery charges' });
  }
});

router.post('/create', authenticate, [
  body('orderId').notEmpty().withMessage('Order ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { orderId } = req.body;
  const order = await Order.findById(orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.user_id.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to create shipment for this order' });
  }

  try {
    const shipment = await createShipmentForOrder(order);
    const user = await User.findById(order.user_id).select('name email');
    await sendOrderStatusEmail(order, user, 'shipped', `Your shipment has been created. AWB: ${shipment.awb_number}`);
    res.json({ shipment });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Shipment creation failed' });
  }
});

router.get('/track', async (req, res) => {
  const { ref } = req.query;
  if (!ref) return res.status(400).json({ error: 'Tracking reference is required' });

  try {
    const result = await getShipmentStatus({ trackingId: ref, shipmentId: ref, orderId: ref });
    res.json(result);
  } catch (err) {
    res.status(404).json({ error: err.message || 'Tracking data not found' });
  }
});

router.get('/charges/history', requireAdmin, async (_req, res) => {
  const charges = await DeliveryCharge.find().sort({ created_at: -1 }).limit(100);
  res.json({ charges });
});

router.get('/:id/status', authenticate, async (req, res) => {
  const shipmentId = req.params.id;
  try {
    const status = await getShipmentStatus({ shipmentId });
    res.json(status);
  } catch (err) {
    res.status(404).json({ error: err.message || 'Shipment not found' });
  }
});

router.post('/:id/cancel', authenticate, async (req, res) => {
  const shipmentId = req.params.id;
  try {
    const shipment = await cancelShipment(shipmentId);
    res.json({ shipment });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to cancel shipment' });
  }
});

router.get('/:id/label', authenticate, async (req, res) => {
  try {
    const shipment = await generateShipmentLabel(req.params.id);
    res.json({ shipment });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to generate label' });
  }
});

export default router;
