import mongoose from 'mongoose';

const shipmentSchema = new mongoose.Schema({
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  shipment_id: { type: String, required: true, unique: true },
  awb_number: { type: String, required: true },
  tracking_id: { type: String, required: true, unique: true },
  courier_name: { type: String, default: 'Shadowfax' },
  pickup_pincode: { type: String, required: true },
  delivery_pincode: { type: String, required: true },
  service_type: { type: String, default: 'standard' },
  payment_type: { type: String, enum: ['prepaid', 'cod'], required: true },
  weight_grams: { type: Number, required: true },
  length_cm: Number,
  width_cm: Number,
  height_cm: Number,
  charge: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: { type: String, default: 'created' },
  estimated_delivery_date: Date,
  label_url: String,
  raw_response: { type: mongoose.Schema.Types.Mixed },
  error: String
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

shipmentSchema.index({ shipment_id: 1 });
shipmentSchema.index({ tracking_id: 1 });

export default mongoose.model('Shipment', shipmentSchema);
