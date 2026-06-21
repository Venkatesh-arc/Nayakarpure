import mongoose from 'mongoose';

const emailLogSchema = new mongoose.Schema({
  messageId: String,
  from: String,
  to: [String],
  cc: [String],
  bcc: [String],
  subject: String,
  template: String,
  relatedType: { type: String, enum: ['user', 'order', 'invoice', 'notification'], default: 'notification' },
  relatedId: { type: mongoose.Schema.Types.ObjectId, refPath: 'relatedType' },
  status: { type: String, enum: ['sent', 'failed', 'queued'], default: 'queued' },
  error: String,
  smtpResponse: mongoose.Schema.Types.Mixed,
  sentAt: Date,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('EmailLog', emailLogSchema);
