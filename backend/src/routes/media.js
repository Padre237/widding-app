import { Router } from 'express';
import { requireAdmin, optionalAuth } from '../middleware/auth.js';
import { uploadMiddleware, uploadRateLimit } from '../middleware/upload.js';
import { validate, mediaUploadSchema } from '../middleware/validation.js';
import { listMedia, uploadMediaFile, getMedia, deleteMediaFile, getMediaStats } from '../controllers/mediaController.js';

const router = Router();

router.get('/',          listMedia);
router.get('/stats',     requireAdmin, getMediaStats);
router.get('/:id',       getMedia);
router.post('/upload',   uploadRateLimit, uploadMiddleware, (req, res, next) => {
  // Valider le body après multer
  const result = mediaUploadSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error:  'Données invalides',
      fields: result.error.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
  }
  req.body = result.data;
  next();
}, uploadMediaFile);
router.delete('/:id',    requireAdmin, deleteMediaFile);

export default router;
