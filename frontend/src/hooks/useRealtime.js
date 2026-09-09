/**
 * useRealtime — Abonnement Supabase WebSocket pour la galerie
 * Met à jour le store en temps réel quand un nouveau média est uploadé
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/utils/api';
import useGalleryStore from '@/store/galleryStore';

export function useRealtime(tableNumber) {
  const { prependItem, updateItemReactions } = useGalleryStore();
  const channelRef = useRef(null);

  useEffect(() => {
    if (!supabase || !tableNumber) return;

    // Canal dédié à cette table
    const channel = supabase
      .channel(`table_${tableNumber}_media`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'media',
          filter: `table_number=eq.${tableNumber}`,
        },
        (payload) => {
          if (payload.new) {
            prependItem({
              id:            payload.new.id,
              type:          payload.new.type,
              cloudinaryUrl: payload.new.cloudinary_url,
              thumbnailUrl:  payload.new.thumbnail_url,
              guestName:     payload.new.guest_name,
              guestId:       payload.new.guest_id,
              tableNumber:   payload.new.table_number,
              caption:       payload.new.caption,
              duration:      payload.new.duration,
              createdAt:     payload.new.created_at,
              heartCount: 0, starCount: 0, bravoCount: 0, fireCount: 0,
              commentCount: 0,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reactions',
        },
        (payload) => {
          if (payload.new) {
            // Rafraîchir les réactions du média concerné
            updateItemReactions(payload.new.media_id, {
              [`${payload.new.reaction_type}Count`]: undefined, // force refetch
            });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [tableNumber, prependItem, updateItemReactions]);
}
