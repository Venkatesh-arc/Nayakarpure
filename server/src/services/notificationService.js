import { sendEmail } from './smtpService.js';
import NotificationHistory from '../models/NotificationHistory.js';
import { userWelcomeEmail, registrationOtpTemplate, verifyEmailTemplate, loginAlertTemplate, passwordResetOtpTemplate, passwordResetLinkTemplate, profileUpdateOtpTemplate, orderConfirmationTemplate, paymentReceiptTemplate, orderStatusUpdateTemplate, shippingUpdateTemplate, deliveryConfirmationTemplate, cancellationTemplate, refundUpdateTemplate } from './emailTemplates.js';

const HELP_FROM = process.env.SMTP_FROM_HELP || 'Nayakar Pure <help@nayakarpure.com>';
const ORDERS_FROM = process.env.SMTP_FROM_ORDERS || 'Nayakar Pure Orders <orders@nayakarpure.com>';

async function logHistory({ userId, email, type, subject, body, relatedOrder, relatedInvoice, status, error }) {
  await NotificationHistory.create({
    user_id: userId,
    type,
    email,
    subject,
    body,
    relatedOrder,
    relatedInvoice,
    status,
    error: error?.message || error?.stack || undefined
  });
}

async function sendTemplate({ to, subject, html, type, userId, relatedOrder, relatedInvoice, from = HELP_FROM, attachments = [] }) {
  const orderTypes = ['order_confirmation', 'payment_receipt', 'invoice', 'order_update', 'shipping', 'delivery', 'cancellation', 'refund_initiated', 'refund_completed'];
  const relatedType = type === 'invoice' ? 'invoice' : orderTypes.includes(type) ? 'order' : 'notification';

  try {
    const info = await sendEmail({ to, from, subject, html, attachments, relatedType, relatedId: relatedOrder || relatedInvoice });
    await logHistory({ userId, email: to, type, subject, body: html, relatedOrder, relatedInvoice, status: 'sent' });
    return info;
  } catch (error) {
    await logHistory({ userId, email: to, type, subject, body: html, relatedOrder, relatedInvoice, status: 'failed', error });
    throw error;
  }
}

export async function sendWelcomeEmail(user) {
  const html = userWelcomeEmail({ name: user.name });
  return sendTemplate({
    to: user.email,
    from: HELP_FROM,
    subject: 'Welcome to Nayakar Pure',
    html,
    type: 'welcome',
    userId: user._id || user.id
  });
}

export async function sendRegistrationOtpEmail(user, otp) {
  const html = registrationOtpTemplate({ name: user.name, otp });
  return sendTemplate({
    to: user.email,
    from: HELP_FROM,
    subject: 'Your Nayakar Pure registration OTP',
    html,
    type: 'registration_otp',
    userId: user._id || user.id
  });
}

export async function sendVerificationEmail(user, verifyUrl) {
  const html = verifyEmailTemplate({ name: user.name, verifyUrl });
  return sendTemplate({
    to: user.email,
    from: HELP_FROM,
    subject: 'Verify your Nayakar Pure email',
    html,
    type: 'verification',
    userId: user._id || user.id
  });
}

export async function sendLoginAlertEmail(user, req) {
  const device = req.headers['user-agent'] || 'Unknown device';
  const ipAddress = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'Unknown IP';
  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const html = loginAlertTemplate({ name: user.name, device, ipAddress, time });
  return sendTemplate({
    to: user.email,
    from: HELP_FROM,
    subject: 'New login alert for your Nayakar Pure account',
    html,
    type: 'login_alert',
    userId: user._id || user.id
  });
}

export async function sendPasswordResetOtpEmail(user, otp) {
  const html = passwordResetOtpTemplate({ name: user.name, otp });
  return sendTemplate({
    to: user.email,
    from: HELP_FROM,
    subject: 'Your Nayakar Pure password reset OTP',
    html,
    type: 'password_reset',
    userId: user._id || user.id
  });
}

export async function sendPasswordResetLinkEmail(user, resetUrl) {
  const html = passwordResetLinkTemplate({ name: user.name, resetUrl });
  return sendTemplate({
    to: user.email,
    from: HELP_FROM,
    subject: 'Reset your Nayakar Pure password',
    html,
    type: 'password_reset',
    userId: user._id || user.id
  });
}

export async function sendProfileUpdateOtpEmail(user, otp) {
  const html = profileUpdateOtpTemplate({ name: user.name, otp });
  return sendTemplate({
    to: user.email,
    from: HELP_FROM,
    subject: 'Confirm your Nayakar Pure profile update',
    html,
    type: 'profile_update_otp',
    userId: user._id || user.id
  });
}

export async function sendOrderConfirmationEmail(order, user, invoice = null, invoicePath = null) {
  const html = orderConfirmationTemplate({ name: user.name, orderNumber: order.order_number, total: order.total, items: order.items });
  return sendTemplate({
    to: order.shipping_email,
    from: ORDERS_FROM,
    subject: `Order Confirmation - ${order.order_number}`,
    html,
    type: 'order_confirmation',
    userId: user._id || user.id,
    relatedOrder: order._id,
    relatedInvoice: invoice?._id,
    attachments: invoicePath ? [{ filename: `${invoice?.invoice_number || order.order_number}-invoice.pdf`, path: invoicePath }] : []
  });
}

export async function sendPaymentReceiptEmail(order, user, invoicePath) {
  const html = paymentReceiptTemplate({ name: user.name, orderNumber: order.order_number, total: order.total, paymentMethod: order.payment_method, paymentId: order.payment_id || order.razorpay_order_id });
  return sendTemplate({
    to: order.shipping_email,
    from: ORDERS_FROM,
    subject: `Payment Receipt - ${order.order_number}`,
    html,
    type: 'payment_receipt',
    userId: user._id || user.id,
    relatedOrder: order._id,
    attachments: invoicePath ? [{ filename: `${order.order_number}-invoice.pdf`, path: invoicePath }] : []
  });
}

export async function sendInvoiceEmail(order, user, invoice, invoicePath) {
  const html = paymentReceiptTemplate({ name: user.name, orderNumber: order.order_number, total: order.total, paymentMethod: order.payment_method, paymentId: order.payment_id || order.razorpay_order_id });
  return sendTemplate({
    to: user.email,
    from: ORDERS_FROM,
    subject: `Invoice for ${order.order_number}`,
    html,
    type: 'invoice',
    userId: user._id || user.id,
    relatedOrder: order._id,
    relatedInvoice: invoice._id,
    attachments: invoicePath ? [{ filename: `${invoice.invoice_number}.pdf`, path: invoicePath }] : []
  });
}

export async function sendOrderStatusEmail(order, user, status, message) {
  let html;
  let subject;
  let type;
  if (status === 'shipped') {
    html = shippingUpdateTemplate({ name: user.name, orderNumber: order.order_number, trackingNumber: order.tracking_number, carrier: 'Nayakar Pure Courier', estimatedDelivery: '2-4 business days' });
    subject = `Your order ${order.order_number} has shipped`;
    type = 'shipping';
  } else if (status === 'out_for_delivery') {
    html = orderStatusUpdateTemplate({ name: user.name, orderNumber: order.order_number, status: 'Out for Delivery', message: message || 'Your package is on its way.' });
    subject = `Order ${order.order_number} is out for delivery`;
    type = 'order_update';
  } else if (status === 'delivered') {
    html = deliveryConfirmationTemplate({ name: user.name, orderNumber: order.order_number });
    subject = `Order ${order.order_number} delivered`;
    type = 'delivered';
  } else if (status === 'cancelled') {
    const refundPending = order.payment_status === 'paid' || order.payment_status === 'refund_initiated';
    html = cancellationTemplate({ name: user.name, orderNumber: order.order_number, refundPending });
    subject = `Order ${order.order_number} cancelled`;
    type = 'cancellation';
  } else {
    html = orderStatusUpdateTemplate({ name: user.name, orderNumber: order.order_number, status, message: message || `Your order status is now ${status}.` });
    subject = `Order ${order.order_number} status updated`;
    type = 'order_update';
  }
  return sendTemplate({
    to: order.shipping_email,
    from: ORDERS_FROM,
    subject,
    html,
    type,
    userId: user._id || user.id,
    relatedOrder: order._id
  });
}

export async function sendRefundEmail(order, user, refundStatus) {
  const html = refundUpdateTemplate({ name: user.name, orderNumber: order.order_number, status: refundStatus });
  const subject = refundStatus === 'completed' ? `Refund completed for ${order.order_number}` : `Refund initiated for ${order.order_number}`;
  const type = refundStatus === 'completed' ? 'refund_completed' : 'refund_initiated';
  return sendTemplate({
    to: order.shipping_email,
    from: ORDERS_FROM,
    subject,
    html,
    type,
    userId: user._id || user.id,
    relatedOrder: order._id
  });
}
