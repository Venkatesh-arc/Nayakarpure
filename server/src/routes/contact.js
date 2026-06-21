import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import ContactMessage from '../models/ContactMessage.js';

const router = Router();

router.post('/', [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('email').trim().isEmail().normalizeEmail(),
  body('phone').optional().trim().matches(/^[6-9]\d{9}$/),
  body('subject').trim().isLength({ min: 3, max: 200 }),
  body('message').trim().isLength({ min: 10, max: 2000 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, phone, subject, message } = req.body;
  await ContactMessage.create({ name, email, phone: phone || undefined, subject, message });

  res.status(201).json({ message: 'Thank you! We will get back to you within 24 hours.' });
});

export default router;
