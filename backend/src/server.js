/**
 * Serveur Express — App Mariage Luxe Yaoundé
 * Node.js + Express + Supabase + Cloudinary
 */
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pino from 'pino';

import authRoutes     from './routes/auth.js';
import guestRoutes    from './routes/guests.js';
import mediaRoutes    from './routes/media.js';
import reactionRoutes from './routes/reactions.js';
import commentRoutes  from './routes/comments.js';
import adminRoutes    from './routes/admin.js';
import errorHandler   from './middleware/errorHandler.js';

// ── Logger ────────────────────────────────────────────────────────────────
export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  ...(process.env.NODE_ENV !== 'production' && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
});

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Trust proxy (Render / Vercel / reverse proxies) ───────────────────────
app.set('trust proxy', 1);

// ── Sécurité headers ──────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ── CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origine ${origin} non autorisée`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate limiting global ──────────────────────────────────────────────────
app.use('/api', rateLimit({
  windowMs:  60 * 1000,
  max:       parseInt(process.env.API_RATE_LIMIT_PER_MIN || '300', 10),
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Trop de requêtes — réessayez dans une minute' },
  skip: (req) => req.path === '/health', // ne pas limiter le health check
}));

// ── Body parsers ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Health check ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/guests',    guestRoutes);
app.use('/api/media',     mediaRoutes);
app.use('/api/reactions', reactionRoutes);
app.use('/api/comments',  commentRoutes);
app.use('/api/admin',     adminRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route introuvable' }));

// ── Gestionnaire d'erreurs global ─────────────────────────────────────────
app.use(errorHandler);

// ── Démarrage ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV }, '🎊 Serveur Mariage démarré');
});

export default app;
