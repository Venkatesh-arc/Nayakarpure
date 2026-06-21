import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  image: String,
  weight: String
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order_number: { type: String, required: true, unique: true },
  items: { type: [orderItemSchema], required: true },
  subtotal: { type: Number, required: true },
  delivery_fee: { type: Number, required: true },
  shipping_charge: { type: Number, default: 0 },
  estimated_delivery_date: Date,
  shipment_id: { type: String, sparse: true, unique: true },
  awb_number: String,
  tracking_id: { type: String, sparse: true, unique: true },
  courier_name: String,
  total: { type: Number, required: true },
  delivery_partner: { type: String, required: true },
  payment_method: { type: String, required: true },
  payment_status: { type: String, required: true, default: 'pending' },
  payment_id: { type: String, unique: true, sparse: true },
  razorpay_order_id: { type: String, unique: true, sparse: true },
  refund_status: { type: String, enum: ['none', 'initiated', 'completed'], default: 'none' },
  stock_reserved: { type: Boolean, default: false },
  shipping_name: { type: String, required: true },
  shipping_email: { type: String, required: true },
  shipping_phone: { type: String, required: true },
  shipping_address: { type: String, required: true },
  shipping_city: { type: String, required: true },
  shipping_state: { type: String, required: true },
  shipping_pincode: { type: String, required: true },
  status: { type: String, required: true, default: 'placed' },
  tracking_number: { type: String, unique: true, sparse: true },
  cancelled_at: Date,
  cancellation_reason: String,
  cancellation_rating: { type: Number, min: 1, max: 5 },
  cancellation_feedback: String
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

export default mongoose.model('Order', orderSchema);
