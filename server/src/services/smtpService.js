import nodemailer from 'nodemailer';
import config from '../config.js';
import EmailLog from '../models/EmailLog.js';

const transportOptions = {
  host: config.smtp.host,
  port: Number(config.smtp.port),
  secure: Boolean(config.smtp.secure),
  requireTLS: !config.smtp.secure,
  auth: config.smtp.user && config.smtp.appPassword ? { user: config.smtp.user, pass: config.smtp.appPassword } : undefined,
  tls: { rejectUnauthorized: config.smtp.rejectUnauthorized }
};

const transporter = nodemailer.createTransport(transportOptions);

export async function verifySmtpConnection() {
  return transporter.verify();
}

async function logEmail({ info, mailOptions, status, error }) {
  try {
    await EmailLog.create({
      messageId: info?.messageId,
      from: mailOptions.from,
      to: Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to],
      cc: Array.isArray(mailOptions.cc) ? mailOptions.cc : mailOptions.cc ? [mailOptions.cc] : [],
      bcc: Array.isArray(mailOptions.bcc) ? mailOptions.bcc : mailOptions.bcc ? [mailOptions.bcc] : [],
      subject: mailOptions.subject,
      template: mailOptions.templateName,
      relatedType: mailOptions.relatedType,
      relatedId: mailOptions.relatedId,
      status,
      error: error?.message || error?.stack,
      smtpResponse: info || null,
      sentAt: status === 'sent' ? new Date() : undefined
    });
  } catch (err) {
    console.error('Email log save failed', err);
  }
}

export async function sendEmail(mailOptions) {
  if (!config.smtp.user || !config.smtp.appPassword) {
    throw new Error('Missing SMTP credentials in configuration');
  }

  // Choose default from based on relatedType (order emails use orders address)
  const defaultFromAddress = mailOptions.relatedType === 'order'
    ? config.smtp.fromOrders
    : config.smtp.fromHelp;

  const baseOptions = {
    from: mailOptions.from || `Nayakar Pure <${defaultFromAddress}>`,
    headers: {
      'X-Brand': 'Nayakar Pure',
      'X-Env': config.env
    }
  };

  const mergedOptions = { ...baseOptions, ...mailOptions };
  let info;

  try {
    info = await transporter.sendMail(mergedOptions);
    await logEmail({ info, mailOptions: mergedOptions, status: 'sent' });
    return info;
  } catch (error) {
    await logEmail({ info: null, mailOptions: mergedOptions, status: 'failed', error });

    const retryCount = Number(process.env.SMTP_RETRY_COUNT || 2);
    const retryDelay = Number(process.env.SMTP_RETRY_DELAY_MS || 3000);
    if (process.env.SMTP_RETRY === 'true') {
      for (let attempt = 1; attempt <= retryCount; attempt += 1) {
        try {
          info = await transporter.sendMail(mergedOptions);
          await logEmail({ info, mailOptions: mergedOptions, status: 'sent' });
          return info;
        } catch (retryError) {
          await logEmail({ info: null, mailOptions: mergedOptions, status: 'failed', error: retryError });
          if (attempt < retryCount) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }
        }
      }
    }

    const finalError = new Error(`SMTP email send failed: ${error.message || 'unknown error'}`);
    finalError.originalError = error;
    finalError.mailOptions = mergedOptions;
    throw finalError;
  }
}
