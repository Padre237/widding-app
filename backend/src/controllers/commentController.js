/**
 * Controller Commentaires — liste, création, suppression
 */
import { v4 as uuid } from 'uuid';
import supabase from '../services/supabaseService.js';

// ── GET /comments/:mediaId ────────────────────────────────────────────────
export async function listComments(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('id, guest_id, guest_name, text, created_at')
      .eq('media_id', req.params.mediaId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json({
      comments: (data || []).map((c) => ({
        id:        c.id,
        guestId:   c.guest_id,
        guestName: c.guest_name,
        text:      c.text,
        createdAt: c.created_at,
      })),
    });
  } catch (err) { next(err); }
}

// ── POST /comments ────────────────────────────────────────────────────────
export async function addComment(req, res, next) {
  try {
    const { mediaId, text, guestId, guestName } = req.body;

    const { data, error } = await supabase
      .from('comments')
      .insert({
        id:        uuid(),
        media_id:  mediaId,
        guest_id:  guestId || null,
        guest_name:guestName,
        text:      text.trim().slice(0, 500),
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({
      comment: {
        id:        data.id,
        guestId:   data.guest_id,
        guestName: data.guest_name,
        text:      data.text,
        createdAt: data.created_at,
      },
    });
  } catch (err) { next(err); }
}

// ── DELETE /comments/:id ──────────────────────────────────────────────────
export async function deleteComment(req, res, next) {
  try {
    const { guestId } = req.body;
    const { id }      = req.params;

    // Vérifier que c'est bien le bon invité (ou admin)
    let query = supabase.from('comments').update({ is_deleted: true }).eq('id', id);
    if (guestId && !req.admin) {
      query = query.eq('guest_id', guestId);
    }

    const { error } = await query;
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { next(err); }
}
