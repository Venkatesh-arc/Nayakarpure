import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  image: String,
  category: { type: String, required: true },
  stock: { type: Number, required: true, default: 100 },
  features: { type: [String], default: [] },
  weight: String
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

export default mongoose.model('Product', productSchema);
