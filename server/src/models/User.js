import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  password: { type: String, required: true },
  phone: String,
  lastLoginIp: String,
  lastLoginAgent: String,
  sessionId: String,
  sessionIp: String,
  sessionAgent: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  registrationOtpCode: String,
  registrationOtpExpires: Date,
  profileOtpCode: String,
  profileOtpExpires: Date,
  profileUpdatePayload: { type: mongoose.Schema.Types.Mixed, default: {} },
  addresses: [{
    label: String,
    name: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
    default: { type: Boolean, default: false }
  }],
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

export default mongoose.model('User', userSchema);
