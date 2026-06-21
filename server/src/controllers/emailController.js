import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import EmailLog from '../models/EmailLog.js';
import NotificationHistory from '../models/NotificationHistory.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { sendEmail } from '../services/smtpService.js';

const router = Router();

router.post('/send', authenticate, [
  body('to').isArray({ min: 1 }),
  body('subject').notEmpty(),
  body('html').notEmpty(),
  body('template').optional().isString()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { to, cc, bcc, subject, html, template, relatedType, relatedId } = req.body;

  try {
    const info = await sendEmail({
      to,
      cc,
      bcc,
      subject,
      html,
      templateName: template,
      relatedType,
      relatedId
    });

    await NotificationHistory.create({
      user_id: req.user.id,
      type: relatedType || 'notification',
      email: (Array.isArray(to) ? to[0] : to) || req.user.email,
      subject,
      body: html,
      relatedOrder: relatedType === 'order' ? relatedId : undefined,
      relatedInvoice: relatedType === 'invoice' ? relatedId : undefined,
      status: 'sent'
    });

    res.json({ message: 'Email sent', info });
  } catch (error) {
    await NotificationHistory.create({
      user_id: req.user.id,
      type: relatedType || 'notification',
      email: (Array.isArray(to) ? to[0] : to) || req.user.email,
      subject,
      body: html,
      relatedOrder: relatedType === 'order' ? relatedId : undefined,
      relatedInvoice: relatedType === 'invoice' ? relatedId : undefined,
      status: 'failed',
      error: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

router.post('/send-invoice', authenticate, [
  body('to').isEmail(),
  body('subject').notEmpty(),
  body('html').notEmpty(),
  body('invoiceNumber').notEmpty(),
  body('invoicePath').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { to, subject, html, invoiceNumber, invoicePath, template } = req.body;

  try {
    const info = await sendEmail({
      to,
      subject,
      html,
      templateName: template,
      relatedType: 'invoice',
      relatedId: invoiceNumber,
      attachments: [{ filename: `${invoiceNumber}.pdf`, path: invoicePath }]
    });

    await NotificationHistory.create({
      user_id: req.user.id,
      type: 'invoice',
      email: to,
      subject,
      body: html,
      relatedInvoice: invoiceNumber,
      status: 'sent'
    });

    res.json({ message: 'Invoice email sent', info });
  } catch (error) {
    await NotificationHistory.create({
      user_id: req.user.id,
      type: 'invoice',
      email: to,
      subject,
      body: html,
      relatedInvoice: invoiceNumber,
      status: 'failed',
      error: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

router.post('/resend/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const emailLog = await EmailLog.findById(req.params.id);
    if (!emailLog) return res.status(404).json({ error: 'Email record not found' });

    const info = await sendEmail({
      to: emailLog.to,
      cc: emailLog.cc,
      bcc: emailLog.bcc,
      subject: emailLog.subject,
      html: emailLog.body,
      templateName: emailLog.template,
      relatedType: emailLog.relatedType,
      relatedId: emailLog.relatedId
    });

    res.json({ message: 'Email resent', info });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/history', authenticate, requireAdmin, async (req, res) => {
  const { page = 1, limit = 25, search } = req.query;
  const filter = {};
  if (search) {
    filter.$or = [
      { subject: new RegExp(search, 'i') },
      { to: new RegExp(search, 'i') },
      { relatedId: new RegExp(search, 'i') }
    ];
  }

  const emails = await EmailLog.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const count = await EmailLog.countDocuments(filter);

  res.json({ emails, total: count, page: Number(page), limit: Number(limit) });
});

router.get('/notifications', authenticate, async (req, res) => {
  const notifications = await NotificationHistory.find({ user_id: req.user.id }).sort({ createdAt: -1 }).limit(50);
  res.json({ notifications });
});

export default router;
