import { sendEmail } from './smtpService.js';

export async function sendOtp(to, otp, opts = {}) {
  const subject = opts.subject || 'Your Nayakar OTP';
  const text = opts.text || `Your OTP is ${otp}. It expires in 10 minutes.`;

  return sendEmail({
    to,
    subject,
    text,
    relatedType: 'otp',
    relatedId: opts.relatedId
  });
}

export async function sendOrderInvoice(to, orderId, invoiceUrl, opts = {}) {
  const subject = opts.subject || `Your Nayakar Order ${orderId}`;
  const text = opts.text || `Thanks for your order ${orderId}. Download your invoice: ${invoiceUrl}`;

  return sendEmail({
    to,
    subject,
    text,
    relatedType: 'order',
    relatedId: orderId
  });
}

export async function sendNotification(to, title, message, opts = {}) {
  const subject = opts.subject || title || 'Nayakar Notification';
  const text = opts.text || message || 'You have a new notification from Nayakar.';

  return sendEmail({
    to,
    subject,
    text,
    relatedType: 'notification',
    relatedId: opts.relatedId
  });
}

export default {
  sendOtp,
  sendOrderInvoice,
  sendNotification
};
