/**
 * Controller Réactions — ajout, suppression, liste
 */
import { v4 as uuid } from 'uuid';
import supabase from '../services/supabaseService.js';

// ── GET /reactions/:mediaId ───────────────────────────────────────────────
export async function getReactions(req, res, next) {
  try {
    const { mediaId } = req.params;
    const { guestId } = req.query;

    // Compteurs agrégés
    const { data: counts, error } = await supabase
      .from('reactions')
      .select('reaction_type')
      .eq('media_id', mediaId);

    if (error) throw error;

    const heartCount = counts.filter((r) => r.reaction_type === 'heart').length;
    const starCount  = counts.filter((r) => r.reaction_type === 'star' ).length;
    const bravoCount = counts.filter((r) => r.reaction_type === 'bravo').length;
    const fireCount  = counts.filter((r) => r.reaction_type === 'fire' ).length;

    // Réactions de CET invité
    let myReactions = [];
    if (guestId) {
      const { data: mine } = await supabase
        .from('reactions')
        .select('reaction_type')
        .eq('media_id', mediaId)
        .eq('guest_id', guestId);
      myReactions = (mine || []).map((r) => r.reaction_type);
    }

    res.json({ heartCount, starCount, bravoCount, fireCount, myReactions });
  } catch (err) { next(err); }
}

// ── POST /reactions — ajouter ─────────────────────────────────────────────
export async function addReaction(req, res, next) {
  try {
    const { mediaId, reactionType, guestId } = req.body;

    const { data, error } = await supabase
      .from('reactions')
      .upsert(
        { id: uuid(), media_id: mediaId, guest_id: guestId, reaction_type: reactionType },
        { onConflict: 'media_id,guest_id,reaction_type', ignoreDuplicates: true }
      )
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ reaction: data, success: true });
  } catch (err) { next(err); }
}

// ── DELETE /reactions — retirer ───────────────────────────────────────────
export async function removeReaction(req, res, next) {
  try {
    const { mediaId, reactionType, guestId } = req.body;

    const { error } = await supabase
      .from('reactions')
      .delete()
      .eq('media_id', mediaId)
      .eq('guest_id', guestId)
      .eq('reaction_type', reactionType);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) { next(err); }
}
