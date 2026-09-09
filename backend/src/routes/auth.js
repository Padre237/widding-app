import { Router } from 'express';
import { validate, adminLoginSchema } from '../middleware/validation.js';
import { requireAdmin } from '../middleware/auth.js';
import { login, logout, me } from '../controllers/adminController.js';

const router = Router();

router.post('/login',  validate(adminLoginSchema), login);
router.post('/logout', logout);
router.get('/me',      requireAdmin, me);

export default router;
