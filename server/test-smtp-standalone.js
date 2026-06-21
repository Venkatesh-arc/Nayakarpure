import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import path from 'path';

// Load the server/.env explicitly so this standalone test doesn't require full app config
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const transportOptions = {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER && process.env.SMTP_PASS ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  tls: { rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false' }
};

const transporter = nodemailer.createTransport(transportOptions);

async function sendSimple(mail) {
  try {
    const info = await transporter.sendMail(mail);
    console.log('Email sent to', mail.to, info.messageId || info);
  } catch (err) {
    console.error('Send failed to', mail.to, err.message || err);
  }
}

async function run() {
  try {
    await transporter.verify();
    console.log('SMTP connection verified');
  } catch (err) {
    console.error('SMTP verify failed:', err.message || err);
    return;
  }

  const to = process.env.TEST_TO || 'your-email@example.com';

  // OTP / support email
  await sendSimple({
    from: `Nayakar Support <${process.env.SMTP_FROM_HELP || process.env.SMTP_USER || 'support@nayakarpure.com'}>`,
    to,
    subject: 'Your Nayakar OTP',
    text: 'Your OTP is 123456 (test)'
  });

  // Order / invoice email
  await sendSimple({
    from: `Nayakar Orders <${process.env.SMTP_FROM_ORDERS || 'orders@nayakarpure.com'}>`,
    to,
    subject: 'Your Nayakar Order Invoice',
    text: 'This is a test order invoice email.'
  });
}

run();
