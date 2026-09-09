import { Router } from 'express';
import multer from 'multer';
import { requireAdmin } from '../middleware/auth.js';
import { validate, guestCreateSchema, guestUpdateSchema, verifyQRSchema, markArrivalSchema } from '../middleware/validation.js';
import {
  listGuests, createGuest, updateGuest, deleteGuest,
  verifyQR, markArrival, reportDuplicate, tableAccess,
  getStats, exportCSV, importCSV,
} from '../controllers/guestController.js';

const router  = Router();
const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }).single('file');

// Routes publiques (pour les virgiles / tables)
router.post('/verify-qr',          validate(verifyQRSchema),   verifyQR);
router.post('/table-access',        validate(verifyQRSchema),   tableAccess);
router.post('/:id/arrival',        validate(markArrivalSchema), markArrival);
router.post('/:id/duplicate',      validate(markArrivalSchema), reportDuplicate);

// Routes admin protégées
router.get('/',        requireAdmin, listGuests);
router.get('/stats',   getStats);           // accessible pour compteur virgiles
router.get('/export',  requireAdmin, exportCSV);
router.post('/import', requireAdmin, csvUpload, importCSV);
router.post('/',       requireAdmin, validate(guestCreateSchema), createGuest);
router.put('/:id',     requireAdmin, validate(guestUpdateSchema), updateGuest);
router.delete('/:id',  requireAdmin, deleteGuest);

export default router;
