/**
 * Middleware d'authentification JWT
 */
import jwt from 'jsonwebtoken';

/**
 * Vérifie le token JWT admin — bloque si absent/invalide
 */
export function requireAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expiré' : 'Token invalide';
    return res.status(401).json({ error: msg });
  }
}

/**
 * Vérifie un token optionnel — ne bloque pas mais enrichit req.guest si présent
 */
export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
      req.guest = payload;
    } catch { /* silencieux */ }
  }
  next();
}

/**
 * Génère un JWT admin
 */
export function signAdminToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });
}

/**
 * Génère un JWT invité (léger, pour identification table)
 */
export function signGuestToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });
}
