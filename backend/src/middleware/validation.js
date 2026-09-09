/**
 * Schémas de validation Zod + middleware validate()
 */
import { z } from 'zod';

// ── Middleware factory ────────────────────────────────────────────────────
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        error:  'Données invalides',
        fields: result.error.errors.map((e) => ({
          path:    e.path.join('.'),
          message: e.message,
        })),
      });
    }
    req[source] = result.data; // données nettoyées
    next();
  };
}

// ── Schémas ───────────────────────────────────────────────────────────────

export const adminLoginSchema = z.object({
  email:    z.string().email('Email invalide').max(200),
  password: z.string().min(8, 'Mot de passe trop court').max(128),
});

export const guestCreateSchema = z.object({
  name:                z.string().min(2).max(200).trim(),
  email:               z.string().email().max(200).optional().or(z.literal('')),
  phone:               z.string().max(50).optional(),
  tableNumber:         z.number().int().min(1).max(999).optional(),
  tableName:           z.string().max(100).optional(),
  companions:          z.number().int().min(0).max(20).default(0),
  dietaryRestrictions: z.string().max(500).optional(),
  zone:                z.string().max(50).optional(),
  notes:               z.string().max(500).optional(),
});

export const guestUpdateSchema = guestCreateSchema.partial();

export const verifyQRSchema = z.object({
  qrCode: z.string().min(5).max(200).trim(),
});

export const markArrivalSchema = z.object({
  scannedBy: z.string().max(100).optional(),
});

export const mediaUploadSchema = z.object({
  type:        z.enum(['photo', 'video', 'audio']),
  guestName:   z.string().min(1).max(200).trim(),
  caption:     z.string().max(500).trim().optional().default(''),
  tableNumber: z.coerce.number().int().min(1).max(999),
  guestId:     z.string().uuid().optional(),
  duration:    z.coerce.number().int().min(0).max(300).optional(),
});

export const reactionSchema = z.object({
  mediaId:      z.string().uuid(),
  reactionType: z.enum(['heart', 'star', 'bravo', 'fire']),
  guestId:      z.string().uuid(),
});

export const commentCreateSchema = z.object({
  mediaId:   z.string().uuid(),
  text:      z.string().min(1).max(500).trim(),
  guestId:   z.string().uuid().optional(),
  guestName: z.string().min(1).max(200).trim(),
});

export const settingsUpdateSchema = z.record(z.string(), z.union([z.string(), z.boolean(), z.number()]));
