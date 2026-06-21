import mongoose from 'mongoose';

const deliveryChargeSchema = new mongoose.Schema({
  pickup_pincode: { type: String, required: true },
  delivery_pincode: { type: String, required: true },
  weight_grams: { type: Number, required: true },
  length_cm: { type: Number, required: true },
  width_cm: { type: Number, required: true },
  height_cm: { type: Number, required: true },
  payment_type: { type: String, enum: ['prepaid', 'cod'], required: true },
  service_type: { type: String, default: 'standard' },
  charge: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  estimated_delivery_days: { type: Number, required: true },
  provider: { type: String, default: 'shadowfax' },
  raw_response: { type: mongoose.Schema.Types.Mixed },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

deliveryChargeSchema.index({ pickup_pincode: 1, delivery_pincode: 1, weight_grams: 1, payment_type: 1 });

export default mongoose.model('DeliveryCharge', deliveryChargeSchema);
