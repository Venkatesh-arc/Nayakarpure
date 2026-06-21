import mongoose from 'mongoose';

const trackingEventSchema = new mongoose.Schema({
  shipment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', required: true },
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  status: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  location: String,
  event_time: { type: Date, default: Date.now },
  raw_event: { type: mongoose.Schema.Types.Mixed }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

trackingEventSchema.index({ shipment_id: 1 });
trackingEventSchema.index({ order_id: 1 });

export default mongoose.model('TrackingEvent', trackingEventSchema);
