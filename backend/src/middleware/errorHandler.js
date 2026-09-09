/**
 * Gestionnaire d'erreurs global Express
 */
import { logger } from '../server.js';

export default function errorHandler(err, req, res, _next) {
  // Log de l'erreur
  logger.error({
    err: { message: err.message, stack: err.stack, code: err.code },
    req: { method: req.method, url: req.url, ip: req.ip },
  }, '[ErrorHandler]');

  // Erreurs Zod (validation)
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error:  'Données invalides',
      fields: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
  }

  // Erreurs multer
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Fichier trop volumineux' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Champ fichier inattendu' });
  }

  // Erreurs CORS
  if (err.message?.includes('CORS')) {
    return res.status(403).json({ error: err.message });
  }

  // Erreur générique — ne pas exposer la stack en production
  const statusCode = err.statusCode || err.status || 500;
  const message    = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Erreur interne — contactez le support'
    : err.message || 'Erreur interne';

  res.status(statusCode).json({ error: message });
}
