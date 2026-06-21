import { Router } from 'express';
import emailController from '../controllers/emailController.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();

router.use('/', emailController);

export default router;
