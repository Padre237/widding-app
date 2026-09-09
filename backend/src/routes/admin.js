import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { validate, settingsUpdateSchema } from '../middleware/validation.js';
import {
  getDashboard, getSettings, updateSettings,
  resetPresence, generateQRCodes, downloadMediaArchive,
} from '../controllers/adminController.js';

const router = Router();

// Toutes les routes admin nécessitent un token valide
router.use(requireAdmin);

router.get('/dashboard',     getDashboard);
router.get('/settings',      getSettings);
router.put('/settings',      validate(settingsUpdateSchema), updateSettings);
router.post('/reset-presence',    resetPresence);
router.post('/generate-qr',       generateQRCodes);
router.get('/media-archive',      downloadMediaArchive);

export default router;
