import dotenv from 'dotenv';

dotenv.config();

const env = process.env.NODE_ENV?.trim() || 'development';
const clientUrl = process.env.CLIENT_URL?.trim() || 'http://localhost:5173';
const jwtSecret = process.env.JWT_SECRET?.trim();
const mongoUri = process.env.MONGODB_URI?.trim();
const razorpayKeyId = process.env.RAZORPAY_KEY_ID?.trim();
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();

function requireEnv(value, name) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

if (!mongoUri) {
  throw new Error('MONGODB_URI is required');
}

if (!jwtSecret) {
  throw new Error('JWT_SECRET is required');
}

if (env === 'production' && !process.env.CLIENT_URL) {
  throw new Error('CLIENT_URL is required in production');
}

if ((razorpayKeyId && !razorpayKeySecret) || (!razorpayKeyId && razorpayKeySecret)) {
  throw new Error('Both RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set together');
}

const allowedLocalOrigins = ['http://localhost:5173', 'http://localhost:5174'];

const config = {
  env,
  isProduction: env === 'production',
  port: Number(process.env.PORT) || 5000,
  clientUrl,
  allowedOrigins: env === 'production' ? [clientUrl] : [...new Set([clientUrl, ...allowedLocalOrigins])],
  jwtSecret,
  mongoUri,
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || null,
    fromHelp: process.env.SMTP_FROM_HELP || 'help@nayakarpure.com',
    fromOrders: process.env.SMTP_FROM_ORDERS || 'orders@nayakarpure.com',
    appPassword: process.env.SMTP_PASS || null,
    rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
    retry: process.env.SMTP_RETRY === 'true',
    retryCount: Number(process.env.SMTP_RETRY_COUNT || 2),
    retryDelayMs: Number(process.env.SMTP_RETRY_DELAY_MS || 3000)
  },
  google: {
    clientId: googleClientId || null,
    enabled: Boolean(googleClientId)
  },
  razorpay: {
    keyId: razorpayKeyId || null,
    keySecret: razorpayKeySecret || null,
    enabled: Boolean(razorpayKeyId && razorpayKeySecret)
  },
  auth: {
    cookieName: 'token',
    tokenExpiry: '7d',
    cookieOptions: {
      httpOnly: true,
      sameSite: 'lax',
      secure: env === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    }
  },
  shadowfax: {
    enabled: process.env.SHADOWFAX_ENABLED === 'true',
    url: process.env.SHADOWFAX_API_URL?.trim() || 'https://api.shadowfax.in/v1',
    apiKey: process.env.SHADOWFAX_API_KEY?.trim() || null,
    apiSecret: process.env.SHADOWFAX_API_SECRET?.trim() || null,
    pickupPincode: process.env.SHADOWFAX_PICKUP_PINCODE?.trim() || '560001'
  }
};

export default config;
