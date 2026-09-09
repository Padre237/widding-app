/**
 * Middleware Multer — upload fichiers en mémoire + rate limiting par table
 */
import multer from 'multer';
import rateLimit from 'express-rate-limit';

// ── Multer mémoire (pas de fichiers temporaires sur disque) ───────────────
const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const allowed = [
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v',
    'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Format non supporté : ${file.mimetype}`), false);
  }
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB max brut (compression côté client)
    files:    1,
  },
}).single('file');

// ── Rate limiting upload : 5 uploads/min par IP ───────────────────────────
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max:      parseInt(process.env.UPLOAD_RATE_LIMIT_PER_MIN || '5', 10),
  keyGenerator: (req) => req.ip + (req.body?.tableNumber || ''),
  message: { error: 'Trop d\'uploads — attendez 1 minute avant de réessayer' },
  standardHeaders: true,
  legacyHeaders:   false,
});
