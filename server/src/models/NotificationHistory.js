import mongoose from 'mongoose';

const notificationHistorySchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true, enum: ['welcome', 'verification', 'registration_otp', 'login_alert', 'password_reset', 'profile_update_otp', 'order_confirmation', 'payment_receipt', 'invoice', 'order_update', 'shipping', 'delivery', 'cancellation', 'refund_initiated', 'refund_completed'] },
  email: String,
  subject: String,
  body: String,
  relatedOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  relatedInvoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
  error: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('NotificationHistory', notificationHistorySchema);
