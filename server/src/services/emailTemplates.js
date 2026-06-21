export function renderBaseTemplate({ headline, content, actionUrl, actionText, footerText, previewText = '' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nayakar Pure</title>
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f4f8; color: #333; }
    .wrapper { width: 100%; background: #f4f4f8; padding: 20px 0; }
    .container { max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.08); }
    .header { background: #003300; color: #fff; padding: 24px; text-align: center; }
    .header img { width: 90px; height: auto; margin-bottom: 12px; }
    .content { padding: 30px 28px; }
    .headline { font-size: 24px; margin: 0 0 16px; }
    .body-copy { font-size: 16px; line-height: 1.7; margin: 0 0 24px; color: #4a4a4a; }
    .button { display: inline-block; padding: 14px 24px; background: #005500; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .footer { padding: 24px 28px; font-size: 14px; color: #777; background: #fafafa; }
    .footer a { color: #005500; text-decoration: none; }
    .divider { height: 1px; background: #e5e5e5; margin: 24px 0; }
    .small { font-size: 13px; color: #888; }
    @media (max-width: 600px) {
      .container { margin: 0 12px; }
      .content { padding: 20px; }
      .headline { font-size: 20px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <img src="https://nayakarpure.com/logo.png" alt="Nayakar Pure" />
        <h1 style="margin:0;font-size:28px;">Nayakar Pure</h1>
      </div>
      <div class="content">
        <p class="small" style="margin-bottom:24px;color:#8a8a8a;">${previewText}</p>
        <h2 class="headline">${headline}</h2>
        <div class="body-copy">${content}</div>
        ${actionUrl ? `<a href="${actionUrl}" class="button">${actionText}</a>` : ''}
      </div>
      <div class="divider"></div>
      <div class="footer">
        <p>${footerText}</p>
        <p style="margin:8px 0 0;">Need help? Email <a href="mailto:help@nayakarpure.com">help@nayakarpure.com</a> or <a href="mailto:support@nayakarpure.com">support@nayakarpure.com</a></p>
        <p class="small" style="margin-top:12px;">This email was sent from <strong>help@nayakarpure.com</strong> and <strong>orders@nayakarpure.com</strong>.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function userWelcomeEmail({ name }) {
  return renderBaseTemplate({
    headline: `Welcome to Nayakar Pure, ${name}!`,
    content: `<p>Thank you for joining the Nayakar Pure family. You can now shop premium products and track your orders from your account.</p><p>We&apos;re excited to have you on board.</p>`,
    actionUrl: 'https://nayakarpure.com/login',
    actionText: 'Start Shopping',
    footerText: 'If you need support, we are here to help every day.'
  });
}

export function verifyEmailTemplate({ name, verifyUrl }) {
  return renderBaseTemplate({
    headline: `Verify your Nayakar Pure email, ${name}`,
    content: `<p>Click the button below to confirm your email address and activate your account.</p><p>If you did not request this, please ignore this message.</p>`,
    actionUrl: verifyUrl,
    actionText: 'Verify Email',
    footerText: 'This link will expire soon. Contact support if you need help.'
  });
}

export function loginAlertTemplate({ name, device, ipAddress, time }) {
  return renderBaseTemplate({
    headline: 'New login detected',
    previewText: 'A new sign-in to your account was detected.',
    content: `<p>Hello ${name},</p><p>We detected a new login to your Nayakar Pure account from <strong>${device}</strong> at <strong>${time}</strong> from IP address <strong>${ipAddress}</strong>.</p><p>If this was you, no action is needed. If you do not recognize this sign-in, please reset your password immediately.</p>`,
    actionUrl: 'https://nayakarpure.com/profile',
    actionText: 'Review Account',
    footerText: 'Secure your account by changing your password if this wasn’t you.'
  });
}

export function passwordResetOtpTemplate({ name, otp }) {
  return renderBaseTemplate({
    headline: 'Your Nayakar Pure OTP code',
    previewText: 'Use this code to reset your password.',
    content: `<p>Hello ${name},</p><p>Your one-time password for Nayakar Pure is:</p><p style="font-size:20px;font-weight:700;">${otp}</p><p>This code is valid for 10 minutes.</p>`,
    footerText: 'If you did not request a password reset, please ignore this email.'
  });
}

export function registrationOtpTemplate({ name, otp }) {
  return renderBaseTemplate({
    headline: 'Welcome to Nayakar Pure — confirm your account',
    previewText: 'Use this code to complete your registration.',
    content: `<p>Hello ${name},</p><p>Welcome to Nayakar Pure! Your registration OTP is:</p><p style="font-size:20px;font-weight:700;">${otp}</p><p>This code is valid for 10 minutes.</p>`,
    footerText: 'Enter this code on the verification page to complete your registration.'
  });
}

export function passwordResetLinkTemplate({ name, resetUrl }) {
  return renderBaseTemplate({
    headline: 'Reset your Nayakar Pure password',
    previewText: 'Use the link below to choose a new password.',
    content: `<p>Hello ${name},</p><p>Click the button below to reset your password.</p>`,
    actionUrl: resetUrl,
    actionText: 'Reset Password',
    footerText: 'If you did not request this password reset, ignore this email.'
  });
}

export function profileUpdateOtpTemplate({ name, otp }) {
  return renderBaseTemplate({
    headline: 'Confirm your profile update',
    previewText: 'Use the one-time verification code below to confirm your profile change.',
    content: `<p>Hello ${name},</p><p>Use the code below to confirm your Nayakar Pure profile update request.</p><p style="font-size:20px;font-weight:700;">${otp}</p><p>This code expires in 10 minutes.</p>`,
    footerText: 'If you did not request this update, please contact support immediately.'
  });
}

export function orderConfirmationTemplate({ name, orderNumber, total, items }) {
  const itemRows = items.map((item) => `<li>${item.quantity} x ${item.name} - ₹${item.price.toFixed(2)}</li>`).join('');
  return renderBaseTemplate({
    headline: `Order confirmed: ${orderNumber}`,
    previewText: 'Your order has been placed successfully.',
    content: `<p>Hi ${name},</p><p>Thanks for your order! We’re preparing it for shipment.</p><ul style="margin-bottom:20px;">${itemRows}</ul><p><strong>Total:</strong> ₹${total.toFixed(2)}</p>`,
    actionUrl: `https://nayakarpure.com/orders`,
    actionText: 'View Order',
    footerText: 'We’ll send you updates as your order moves through processing and shipping.'
  });
}

export function paymentReceiptTemplate({ name, orderNumber, total, paymentMethod, paymentId }) {
  return renderBaseTemplate({
    headline: `Payment received for order ${orderNumber}`,
    previewText: 'Your payment has been successfully processed.',
    content: `<p>Hi ${name},</p><p>We have received your payment of <strong>₹${total.toFixed(2)}</strong> via <strong>${paymentMethod}</strong>.</p><p>Payment reference: <strong>${paymentId}</strong></p>`,
    actionUrl: `https://nayakarpure.com/orders/${orderNumber}`,
    actionText: 'View Receipt',
    footerText: 'Keep this email for your records.'
  });
}

export function orderStatusUpdateTemplate({ name, orderNumber, status, message }) {
  return renderBaseTemplate({
    headline: `Order ${orderNumber} is now ${status}`,
    previewText: `Your order status has been updated to ${status}.`,
    content: `<p>Hi ${name},</p><p>Your order <strong>${orderNumber}</strong> is now <strong>${status}</strong>.</p><p>${message}</p>`,
    actionUrl: `https://nayakarpure.com/orders/${orderNumber}`,
    actionText: 'View Order Status',
    footerText: 'Thank you for shopping with Nayakar Pure.'
  });
}

export function shippingUpdateTemplate({ name, orderNumber, trackingNumber, carrier, estimatedDelivery }) {
  return renderBaseTemplate({
    headline: `Your order ${orderNumber} has shipped`,
    previewText: 'Your package is on the way.',
    content: `<p>Hi ${name},</p><p>Your order has been shipped and is on the way.</p><p><strong>Tracking number:</strong> ${trackingNumber}</p><p><strong>Carrier:</strong> ${carrier}</p><p><strong>Estimated delivery:</strong> ${estimatedDelivery}</p>`,
    actionUrl: `https://nayakarpure.com/track/${trackingNumber}`,
    actionText: 'Track Shipment',
    footerText: 'We’ll notify you again when it’s out for delivery.'
  });
}

export function deliveryConfirmationTemplate({ name, orderNumber }) {
  return renderBaseTemplate({
    headline: `Order ${orderNumber} delivered`,
    previewText: 'Your package has been delivered successfully.',
    content: `<p>Hi ${name},</p><p>Great news — your order <strong>${orderNumber}</strong> has been delivered.</p><p>If you have any questions, our support team is ready to help.</p>`,
    actionUrl: `https://nayakarpure.com/orders/${orderNumber}`,
    actionText: 'View Order',
    footerText: 'Thanks for choosing Nayakar Pure.'
  });
}

export function cancellationTemplate({ name, orderNumber, refundPending }) {
  return renderBaseTemplate({
    headline: `Order ${orderNumber} cancelled`,
    previewText: 'Your order has been cancelled.',
    content: `<p>Hi ${name},</p><p>Your order <strong>${orderNumber}</strong> has been cancelled.</p><p>${refundPending ? 'If a payment was made, refund processing will begin shortly.' : 'If you paid by card, the refund will be processed soon.'}</p>`,
    actionUrl: `https://nayakarpure.com/orders/${orderNumber}`,
    actionText: 'View Order',
    footerText: 'Contact support if you need any assistance.'
  });
}

export function refundUpdateTemplate({ name, orderNumber, status }) {
  return renderBaseTemplate({
    headline: `Refund ${status} for order ${orderNumber}`,
    previewText: 'Your refund status has been updated.',
    content: `<p>Hi ${name},</p><p>Your refund for order <strong>${orderNumber}</strong> is now <strong>${status}</strong>.</p>`,
    actionUrl: `https://nayakarpure.com/orders/${orderNumber}`,
    actionText: 'View Refund Status',
    footerText: 'If you have questions, reply to support@nayakarpure.com.'
  });
}
