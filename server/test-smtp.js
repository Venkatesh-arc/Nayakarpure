import dotenv from 'dotenv';
import { verifySmtpConnection, sendEmail } from './src/services/smtpService.js';

dotenv.config();

async function run() {
  try {
    await verifySmtpConnection();
    console.log('SMTP connection verified');
  } catch (err) {
    console.error('SMTP verify failed:', err);
  }

  try {
    const info = await sendEmail({
      to: process.env.TEST_TO || 'your-email@example.com',
      subject: 'Nayakar Pure - SMTP test',
      text: 'This is a test email from server/test-smtp.js'
    });
    console.log('Email sent:', info?.messageId || info);
  } catch (err) {
    console.error('Send failed:', err);
  }
}

run();
