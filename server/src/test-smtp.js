import { verifySmtpConnection } from './services/smtpService.js';

(async () => {
  try {
    const result = await verifySmtpConnection();
    console.log('SMTP verification success', result);
    process.exit(0);
  } catch (err) {
    console.error('SMTP verification failed', err);
    process.exit(1);
  }
})();