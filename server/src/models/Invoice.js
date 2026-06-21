import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  invoice_number: { type: String, required: true, unique: true },
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
  order_number: { type: String, required: true },
  payment_id: { type: String },
  invoice_date: { type: Date, required: true },
  invoice_amount: { type: Number, required: true },
  gst_amount: { type: Number, required: true },
  invoice_url: { type: String },
  status: { type: String, required: true, enum: ['issued', 'cancelled'], default: 'issued' },
  buyer_name: { type: String, required: true },
  buyer_email: { type: String, required: true },
  buyer_phone: { type: String, required: true },
  billing_address: { type: String, required: true },
  shipping_address: { type: String, required: true },
  items: [{
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    total: { type: Number, required: true }
  }]
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export default mongoose.model('Invoice', invoiceSchema);
