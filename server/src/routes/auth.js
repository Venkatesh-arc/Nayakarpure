import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { toApi } from '../utils/format.js';
import { authenticate } from '../middleware/auth.js';
import config from '../config.js';
import { sendWelcomeEmail, sendRegistrationOtpEmail, sendVerificationEmail, sendLoginAlertEmail, sendPasswordResetLinkEmail, sendProfileUpdateOtpEmail } from '../services/notificationService.js';

const router = Router();
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000;
const PROFILE_OTP_EXPIRY_MS = 10 * 60 * 1000;

function setTokenCookie(res, token) {
  res.cookie(config.auth.cookieName, token, {
    ...config.auth.cookieOptions,
    maxAge: config.auth.cookieOptions.maxAge
  });
}

function buildSafeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role || 'customer'
  };
}

function createSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').trim().isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number'),
  body('phone').optional().trim().matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit Indian phone number required')
];

const loginValidation = [
  body('email').trim().isEmail().normalizeEmail(),
  body('password').notEmpty()
];

async function generateUniqueRegistrationOtp() {
  let otp;
  let exists;
  do {
    otp = crypto.randomInt(100000, 999999).toString();
    exists = await User.exists({ registrationOtpCode: otp, registrationOtpExpires: { $gt: Date.now() } });
  } while (exists);
  return otp;
}

const profileUpdateRequestValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').optional().trim().isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').optional().trim().matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit Indian phone number required'),
  body('currentPassword').optional().isLength({ min: 8 }).withMessage('Current password must be at least 8 characters'),
  body('newPassword')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number')
];

const confirmProfileUpdateValidation = [
  body('token').notEmpty().withMessage('OTP token required')
];

const profileValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').optional().trim().isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').optional().trim().matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit Indian phone number required'),
  body('currentPassword').optional().isLength({ min: 8 }).withMessage('Current password must be at least 8 characters'),
  body('newPassword')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number')
];

const forgotPasswordValidation = [
  body('email').trim().isEmail().normalizeEmail().withMessage('Valid email required')
];

const resetPasswordValidation = [
  body('email').trim().isEmail().normalizeEmail().withMessage('Valid email required'),
  body('token').notEmpty().withMessage('Reset token required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number')
];

router.post('/register', registerValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, phone } = req.body;
  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const otp = await generateUniqueRegistrationOtp();
  const otpExpires = Date.now() + 10 * 60 * 1000;
  const hashed = await bcrypt.hash(password, 12);
  const user = await User.create({
    name,
    email,
    password: hashed,
    phone: phone || undefined,
    emailVerified: false,
    registrationOtpCode: otp,
    registrationOtpExpires: otpExpires
  });

  const safeUser = { id: user._id.toString(), name, email, phone: user.phone, role: user.role || 'customer' };
  try {
    await sendRegistrationOtpEmail(user, otp);
  } catch (err) {
    console.error('Registration OTP email failed', err);
    return res.status(502).json({ error: 'Registration OTP email failed. Please try again later.' });
  }

  const response = {
    user: safeUser,
    message: 'Registration successful. Please verify your email with the OTP sent to your inbox.',
    needsVerification: true
  };

  if (!config.isProduction) {
    response.otp = otp;
  }

  res.status(201).json(response);
});

router.post('/login', loginValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (!user.emailVerified) {
    return res.status(403).json({ error: 'Please verify your email using the registration OTP before logging in.' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const safeUser = buildSafeUser(user);
  const sessionId = createSessionId();
  const tokenPayload = { ...safeUser, sessionId };
  const token = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: config.auth.cookieOptions.maxAge / 1000 + 's' });
  setTokenCookie(res, token);

  const ipAddress = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'Unknown IP';
  const agent = req.headers['user-agent'] || 'Unknown device';
  user.lastLoginIp = ipAddress;
  user.lastLoginAgent = agent;
  user.sessionIp = ipAddress;
  user.sessionAgent = agent;
  user.sessionId = sessionId;
  await user.save();
  sendLoginAlertEmail(user, req).catch((err) => console.error('Login alert email failed', err));
  res.json({ user: safeUser, token });
});

router.post('/google', [
  body('token').notEmpty().withMessage('Google token required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  if (!config.google.enabled) {
    return res.status(503).json({ error: 'Google authentication is not configured on the server.' });
  }

  try {
    const { token } = req.body;
    const client = new OAuth2Client(config.google.clientId);
    const ticket = await client.verifyIdToken({ idToken: token, audience: config.google.clientId });
    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Google token did not contain an email address.' });
    }

    const email = payload.email;
    const name = payload.name || email.split('@')[0];

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12),
        emailVerified: true,
        role: 'customer'
      });
      sendWelcomeEmail(user).catch((err) => console.error('Welcome email failed', err));
    } else if (!user.emailVerified) {
      user.emailVerified = true;
      await user.save();
    }

    const safeUser = buildSafeUser(user);
    const sessionId = createSessionId();
    const jwtToken = jwt.sign({ ...safeUser, sessionId }, config.jwtSecret, { expiresIn: config.auth.cookieOptions.maxAge / 1000 + 's' });
    setTokenCookie(res, jwtToken);

    const ipAddress = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'Unknown IP';
    const agent = req.headers['user-agent'] || 'Unknown device';
    user.lastLoginIp = ipAddress;
    user.lastLoginAgent = agent;
    user.sessionIp = ipAddress;
    user.sessionAgent = agent;
    user.sessionId = sessionId;
    await user.save();

    sendLoginAlertEmail(user, req).catch((err) => console.error('Login alert email failed', err));
    res.json({ user: safeUser, token: jwtToken });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(401).json({ error: 'Google authentication failed' });
  }
});

router.post('/logout', authenticate, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (user) {
    user.sessionId = undefined;
    user.sessionAgent = undefined;
    user.sessionIp = undefined;
    await user.save();
  }
  res.clearCookie(config.auth.cookieName, config.auth.cookieOptions);
  res.json({ message: 'Logged out' });
});

router.post('/verify-email', [
  body('email').trim().isEmail().normalizeEmail().withMessage('Valid email required'),
  body('token').notEmpty().withMessage('Verification token required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, token } = req.body;
  const user = await User.findOne({ email, emailVerificationToken: token, emailVerificationExpires: { $gt: Date.now() } });
  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired verification token' });
  }

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  res.json({ message: 'Email verified successfully' });
});

router.post('/verify-registration-otp', [
  body('email').trim().isEmail().normalizeEmail().withMessage('Valid email required'),
  body('otp').trim().isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, otp } = req.body;
  const user = await User.findOne({ email, registrationOtpCode: otp, registrationOtpExpires: { $gt: Date.now() } });
  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired registration OTP' });
  }

  user.emailVerified = true;
  user.registrationOtpCode = undefined;
  user.registrationOtpExpires = undefined;
  await user.save();

  sendWelcomeEmail(user).catch((err) => console.error('Welcome email failed after OTP verification', err));

  res.json({ message: 'Registration OTP verified successfully' });
});

router.get('/me', authenticate, async (req, res) => {
  const user = await User.findById(req.user.id).select('name email phone role created_at');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: toApi(user) });
});

router.put('/me', authenticate, profileValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, phone, currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (email && email !== user.email) {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    user.email = email;
  }

  if (name) {
    user.name = name;
  }

  if (phone !== undefined) {
    user.phone = phone || undefined;
  }

  if (newPassword) {
    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password required to change password' });
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    user.password = await bcrypt.hash(newPassword, 12);
  }

  await user.save();

  const safeUser = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role || 'customer'
  };
  res.json({ user: safeUser });
});

router.post('/me/request-update', authenticate, profileUpdateRequestValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, phone, currentPassword, newPassword } = req.body;
  if (!name && !email && !phone && !newPassword) {
    return res.status(400).json({ error: 'No update fields provided' });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const payload = {};
  if (name && name !== user.name) payload.name = name;
  if (email && email !== user.email) {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    payload.email = email;
  }
  if (phone !== undefined && phone !== user.phone) {
    payload.phone = phone || undefined;
  }

  if (newPassword) {
    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password required to change password' });
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    payload.password = await bcrypt.hash(newPassword, 12);
  }

  if (Object.keys(payload).length === 0) {
    return res.status(400).json({ error: 'No changes detected' });
  }

  const token = crypto.randomInt(100000, 999999).toString();
  user.profileOtpCode = token;
  user.profileOtpExpires = Date.now() + PROFILE_OTP_EXPIRY_MS;
  user.profileUpdatePayload = payload;
  await user.save();

  sendProfileUpdateOtpEmail(user, token).catch((err) => console.error('Profile update OTP email failed', err));

  const response = {
    message: 'OTP sent to your registered email or phone. Use it to confirm the profile update.'
  };
  if (!config.isProduction) {
    response.otp = token;
  }

  res.json(response);
});

router.post('/me/confirm-update', authenticate, confirmProfileUpdateValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { token } = req.body;
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!user.profileOtpCode || user.profileOtpCode !== token || !user.profileOtpExpires || user.profileOtpExpires < Date.now()) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }

  const payload = user.profileUpdatePayload || {};
  if (payload.name) user.name = payload.name;
  if (payload.email) user.email = payload.email;
  if (payload.phone !== undefined) user.phone = payload.phone;
  if (payload.password) user.password = payload.password;

  user.profileOtpCode = undefined;
  user.profileOtpExpires = undefined;
  user.profileUpdatePayload = {};
  await user.save();

  const safeUser = buildSafeUser(user);
  const sessionId = createSessionId();
  const authToken = jwt.sign({ ...safeUser, sessionId }, config.jwtSecret, { expiresIn: config.auth.cookieOptions.maxAge / 1000 + 's' });
  setTokenCookie(res, authToken);

  const ipAddress = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'Unknown IP';
  const agent = req.headers['user-agent'] || 'Unknown device';
  user.lastLoginIp = ipAddress;
  user.lastLoginAgent = agent;
  user.sessionIp = ipAddress;
  user.sessionAgent = agent;
  user.sessionId = sessionId;
  await user.save();

  res.json({ message: 'Profile update confirmed', user: safeUser, token: authToken });
});

  const addressValidation = [
    body('label').optional().trim().isLength({ min: 1 }).withMessage('Label required'),
    body('name').trim().isLength({ min: 2 }).withMessage('Name required'),
    body('phone').trim().matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit phone required'),
    body('address').trim().isLength({ min: 10 }).withMessage('Full address required'),
    body('city').trim().notEmpty().withMessage('City required'),
    body('state').trim().notEmpty().withMessage('State required'),
    body('pincode').trim().matches(/^\d{6}$/).withMessage('Valid 6-digit pincode required')
  ];

  router.post('/me/addresses', authenticate, addressValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { label, name, phone, address, city, state, pincode } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const addr = { label, name, phone, address, city, state, pincode };
    if (!user.addresses || user.addresses.length === 0) addr.default = true;
    user.addresses.push(addr);
    await user.save();
    res.json({ message: 'Address added', user: toApi(user) });
  });

  router.put('/me/addresses/:id', authenticate, addressValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { id } = req.params;
    const { label, name, phone, address, city, state, pincode } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const addr = user.addresses.id(id);
    if (!addr) return res.status(404).json({ error: 'Address not found' });
    addr.label = label || addr.label;
    addr.name = name || addr.name;
    addr.phone = phone || addr.phone;
    addr.address = address || addr.address;
    addr.city = city || addr.city;
    addr.state = state || addr.state;
    addr.pincode = pincode || addr.pincode;
    await user.save();
    res.json({ message: 'Address updated', user: toApi(user) });
  });

  router.delete('/me/addresses/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const addr = user.addresses.id(id);
    if (!addr) return res.status(404).json({ error: 'Address not found' });
    const wasDefault = addr.default;
    addr.remove();
    if (wasDefault && user.addresses.length > 0) user.addresses[0].default = true;
    await user.save();
    res.json({ message: 'Address removed', user: toApi(user) });
  });

  router.patch('/me/addresses/:id/default', authenticate, async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const addr = user.addresses.id(id);
    if (!addr) return res.status(404).json({ error: 'Address not found' });
    user.addresses.forEach(a => { a.default = false; });
    addr.default = true;
    await user.save();
    res.json({ message: 'Default address set', user: toApi(user) });
  });

router.post('/forgot-password', forgotPasswordValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.json({ message: 'If that account exists, a reset link has been sent to the registered email.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = token;
  user.resetPasswordExpires = Date.now() + RESET_TOKEN_EXPIRY_MS;
  await user.save();
  const resetUrl = `${config.clientUrl}/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;

  try {
    await sendPasswordResetLinkEmail(user, resetUrl);
  } catch (err) {
    console.error('Password reset email failed', err);
  }

  const response = {
    message: 'If that account exists, a reset link has been sent to the registered email.'
  };
  if (!config.isProduction) {
    response.resetToken = token;
  }

  res.json(response);
});

router.post('/reset-password', resetPasswordValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, token, password } = req.body;
  const user = await User.findOne({
    email,
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({ error: 'Invalid email or reset token' });
  }

  user.password = await bcrypt.hash(password, 12);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  const safeUser = buildSafeUser(user);
  const sessionId = createSessionId();
  const authToken = jwt.sign({ ...safeUser, sessionId }, config.jwtSecret, { expiresIn: config.auth.cookieOptions.maxAge / 1000 + 's' });
  setTokenCookie(res, authToken);

  const ipAddress = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'Unknown IP';
  const agent = req.headers['user-agent'] || 'Unknown device';
  user.lastLoginIp = ipAddress;
  user.lastLoginAgent = agent;
  user.sessionIp = ipAddress;
  user.sessionAgent = agent;
  user.sessionId = sessionId;
  await user.save();

  res.json({ message: 'Password reset successful', user: safeUser, token: authToken });
});

export default router;
