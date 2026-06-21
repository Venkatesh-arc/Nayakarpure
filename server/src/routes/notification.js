import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import NotificationHistory from '../models/NotificationHistory.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  const notifications = await NotificationHistory.find({ user_id: req.user.id }).sort({ createdAt: -1 }).limit(50);
  res.json({ notifications });
});

export default router;
