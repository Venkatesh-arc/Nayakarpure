import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  key: { type: String, required: true },
  period: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 }
}, {
  timestamps: false
});

counterSchema.index({ key: 1, period: 1 }, { unique: true });

export default mongoose.model('Counter', counterSchema);
