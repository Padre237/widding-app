/**
 * Controller Médias — upload Cloudinary, liste, suppression
 */
import { v4 as uuid } from 'uuid';
import supabase   from '../services/supabaseService.js';
import { uploadMedia, deleteMedia } from '../services/cloudinaryService.js';
import { logger } from '../server.js';

// ── GET /media — liste avec pagination ───────────────────────────────────
export async function listMedia(req, res, next) {
  try {
    const {
      tableNumber,
      type,
      page  = 1,
      limit = 20,
      sort  = 'created_at',
      order = 'desc',
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query = supabase
      .from('media_with_stats')
      .select('*', { count: 'exact' })
      .order(sort, { ascending: order === 'asc' })
      .range(offset, offset + parseInt(limit, 10) - 1);

    if (tableNumber) query = query.eq('table_number', parseInt(tableNumber, 10));
    if (type)        query = query.eq('type', type);

    const { data, error, count } = await query;
    if (error) throw error;

    // Compter par type (pour compteurs filtres)
    let counts = { total: count, photos: 0, videos: 0, audios: 0 };
    if (tableNumber) {
      const { data: c } = await supabase
        .from('media')
        .select('type')
        .eq('table_number', parseInt(tableNumber, 10))
        .eq('is_deleted', false);
      if (c) {
        counts.photos = c.filter((m) => m.type === 'photo').length;
        counts.videos = c.filter((m) => m.type === 'video').length;
        counts.audios = c.filter((m) => m.type === 'audio').length;
        counts.total  = c.length;
      }
    }

    res.json({
      media: data.map(normalizeMedia),
      total: count,
      counts,
      page:  parseInt(page, 10),
    });
  } catch (err) { next(err); }
}

// ── POST /media/upload ────────────────────────────────────────────────────
export async function uploadMediaFile(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Fichier manquant' });
    }

    const { type, guestName, caption, tableNumber, guestId, duration } = req.body;
    const publicId = `guest_${Date.now()}_${uuid().slice(0, 8)}`;

    // Upload vers Cloudinary
    const uploaded = await uploadMedia(req.file.buffer, { type, publicId });

    // Enregistrer en base
    const mediaRecord = {
      id:                  uuid(),
      guest_id:            guestId || null,
      guest_name:          guestName,
      type,
      cloudinary_url:      uploaded.url,
      cloudinary_public_id:uploaded.publicId,
      thumbnail_url:       uploaded.thumbnailUrl,
      duration:            duration || uploaded.duration || null,
      file_size:           uploaded.bytes || req.file.size,
      caption:             caption || '',
      table_number:        parseInt(tableNumber, 10),
    };

    const { data, error } = await supabase
      .from('media')
      .insert(mediaRecord)
      .select()
      .single();

    if (error) throw error;

    logger.info({ mediaId: data.id, type, guestName }, '[Media] Upload réussi');
    res.status(201).json({ media: normalizeMedia(data) });
  } catch (err) { next(err); }
}

// ── GET /media/:id ────────────────────────────────────────────────────────
export async function getMedia(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('media_with_stats')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Média introuvable' });
    res.json({ media: normalizeMedia(data) });
  } catch (err) { next(err); }
}

// ── DELETE /media/:id (admin) ─────────────────────────────────────────────
export async function deleteMediaFile(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('media')
      .select('cloudinary_public_id, type')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Média introuvable' });

    // Suppression logique en BDD
    await supabase
      .from('media')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', req.params.id);

    // Suppression Cloudinary (async, non bloquante)
    const resourceType = data.type === 'photo' ? 'image' : 'video';
    deleteMedia(data.cloudinary_public_id, resourceType).catch(() => {});

    res.json({ success: true });
  } catch (err) { next(err); }
}

// ── GET /media/stats (admin) ──────────────────────────────────────────────
export async function getMediaStats(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('stats_overview')
      .select('total_media, photos, videos, audios')
      .single();

    if (error) throw error;
    res.json({
      total:  parseInt(data.total_media, 10),
      photos: parseInt(data.photos, 10),
      videos: parseInt(data.videos, 10),
      audios: parseInt(data.audios, 10),
    });
  } catch (err) { next(err); }
}

// ── Normalisation snake_case → camelCase ──────────────────────────────────
function normalizeMedia(m) {
  return {
    id:            m.id,
    type:          m.type,
    guestId:       m.guest_id,
    guestName:     m.guest_name,
    cloudinaryUrl: m.cloudinary_url,
    thumbnailUrl:  m.thumbnail_url,
    duration:      m.duration,
    fileSize:      m.file_size,
    caption:       m.caption,
    tableNumber:   m.table_number,
    createdAt:     m.created_at,
    heartCount:    m.heart_count  || 0,
    starCount:     m.star_count   || 0,
    bravoCount:    m.bravo_count  || 0,
    fireCount:     m.fire_count   || 0,
    commentCount:  m.comment_count|| 0,
  };
}
