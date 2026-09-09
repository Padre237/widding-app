/**
 * Reactions — Système de 4 réactions par média
 * heart | star | bravo | fire — 1 par invité par type par média
 */
import { useState, useEffect, useCallback } from 'react';
import { IconHeart, IconStar, IconHandStop, IconFlame } from '@tabler/icons-react';
import { reactionsAPI } from '@/utils/api';
import useAuthStore from '@/store/authStore';
import useGalleryStore from '@/store/galleryStore';
import { useToast } from '@/components/Shared/Toast';

const REACTION_CONFIG = [
  { type: 'heart', Icon: IconHeart,    label: 'Cœur'     },
  { type: 'star',  Icon: IconStar,     label: 'Étoile'   },
  { type: 'bravo', Icon: IconHandStop, label: 'Bravo'    },
  { type: 'fire',  Icon: IconFlame,    label: 'Feu'      },
];

export default function Reactions({ mediaId }) {
  const { guestData } = useAuthStore();
  const { selectedMedia, updateItemReactions } = useGalleryStore();
  const toast = useToast();

  // État local des réactions: { heart: { count: N, myReaction: bool }, ... }
  const [reactions, setReactions] = useState({
    heart: { count: 0, active: false },
    star:  { count: 0, active: false },
    bravo: { count: 0, active: false },
    fire:  { count: 0, active: false },
  });
  const [loading, setLoading] = useState(null); // type en cours

  // Charger réactions initiales
  useEffect(() => {
    if (!mediaId) return;
    const fetchReactions = async () => {
      try {
        const res = await reactionsAPI.getByMedia(mediaId, guestData?.id);
        const data = res.data;
        setReactions({
          heart: { count: data.heartCount  || 0, active: data.myReactions?.includes('heart')  || false },
          star:  { count: data.starCount   || 0, active: data.myReactions?.includes('star')   || false },
          bravo: { count: data.bravoCount  || 0, active: data.myReactions?.includes('bravo')  || false },
          fire:  { count: data.fireCount   || 0, active: data.myReactions?.includes('fire')   || false },
        });
      } catch {
        // Utiliser les données du média déjà chargé
        if (selectedMedia) {
          setReactions({
            heart: { count: selectedMedia.heartCount  || 0, active: false },
            star:  { count: selectedMedia.starCount   || 0, active: false },
            bravo: { count: selectedMedia.bravoCount  || 0, active: false },
            fire:  { count: selectedMedia.fireCount   || 0, active: false },
          });
        }
      }
    };
    fetchReactions();
  }, [mediaId, guestData?.id, selectedMedia]);

  const handleReaction = useCallback(async (type) => {
    if (!guestData?.id) {
      toast.warning('Identifiez-vous via votre QR code de table');
      return;
    }
    if (loading) return;

    const current = reactions[type];
    const isActive = current.active;

    // Mise à jour optimiste
    setReactions((prev) => ({
      ...prev,
      [type]: {
        count: isActive ? Math.max(0, prev[type].count - 1) : prev[type].count + 1,
        active: !isActive,
      },
    }));
    setLoading(type);

    try {
      if (isActive) {
        await reactionsAPI.remove(mediaId, type, guestData.id);
      } else {
        await reactionsAPI.add(mediaId, type, guestData.id);
      }
      // Sync store galerie
      updateItemReactions(mediaId, {
        [`${type}Count`]: isActive
          ? Math.max(0, current.count - 1)
          : current.count + 1,
      });
    } catch (err) {
      // Rollback en cas d'erreur
      setReactions((prev) => ({
        ...prev,
        [type]: current,
      }));
      toast.error('Impossible d\'enregistrer la réaction');
    } finally {
      setLoading(null);
    }
  }, [reactions, guestData, mediaId, loading, toast, updateItemReactions]);

  return (
    <section
      aria-label="Réactions"
      className="bg-surface-container-lowest rounded-xl p-space-sm shadow-sm"
    >
      <div className="flex items-center justify-between gap-space-xs">
        {REACTION_CONFIG.map(({ type, Icon, label }) => {
          const { count, active } = reactions[type];
          const isLoading = loading === type;

          return (
            <button
              key={type}
              onClick={() => handleReaction(type)}
              disabled={!!loading}
              aria-label={`${active ? 'Retirer' : 'Ajouter'} réaction ${label} (${count})`}
              aria-pressed={active}
              className={[
                'reaction-btn',
                active ? 'reaction-btn-active' : '',
                'transition-all duration-150',
              ].join(' ')}
            >
              {isLoading ? (
                <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              ) : (
                <Icon
                  size={20}
                  stroke={active ? 2 : 1.5}
                  className={`transition-transform ${active ? 'scale-110' : ''}`}
                  fill={active ? 'currentColor' : 'none'}
                />
              )}
              <span className="font-body text-label-md text-on-surface mt-1">
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
