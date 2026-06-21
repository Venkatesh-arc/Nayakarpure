import path from 'path';
import fs from 'fs';
import { renderBaseTemplate, userWelcomeEmail, verifyEmailTemplate, loginAlertTemplate, passwordResetOtpTemplate, passwordResetLinkTemplate, orderConfirmationTemplate, paymentReceiptTemplate, orderStatusUpdateTemplate, shippingUpdateTemplate, deliveryConfirmationTemplate, cancellationTemplate, refundUpdateTemplate } from '../services/emailTemplates.js';

export function buildOrderEmailData(order) {
  return {
    orderNumber: order.order_number,
    total: order.total,
    items: order.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price
    }))
  };
}

export async function attachInvoice(order, invoicePath) {
  if (!fs.existsSync(invoicePath)) return [];
  return [{ filename: path.basename(invoicePath), path: invoicePath }];
}

export function getLoginSource(req) {
  return {
    device: req.headers['user-agent'] || 'Unknown device',
    ipAddress: req.ip || req.connection?.remoteAddress || 'Unknown',
    time: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  };
}

export { userWelcomeEmail, verifyEmailTemplate, loginAlertTemplate, passwordResetOtpTemplate, passwordResetLinkTemplate, orderConfirmationTemplate, paymentReceiptTemplate, orderStatusUpdateTemplate, shippingUpdateTemplate, deliveryConfirmationTemplate, cancellationTemplate, refundUpdateTemplate };
