/**
 * Gallery — Galerie média temps réel de la table
 * Grille 2 colonnes, lazy loading, filtres, pull-to-refresh
 */
import { useEffect, useCallback, useRef } from 'react';
import {
  IconPhoto, IconVideo, IconMicrophone,
  IconRefresh, IconSparkles, IconHeart,
  IconPlayerPlay,
} from '@tabler/icons-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import useGalleryStore from '@/store/galleryStore';
import useAuthStore from '@/store/authStore';
import { GallerySkeleton } from '@/components/Shared/LoadingSpinner';
import { useGallery } from '@/hooks/useGallery';

export default function Gallery() {
  const { tableNumber } = useAuthStore();
  const {
    items, isLoading, hasMore, activeFilter, counts,
    setFilter, openLightbox,
  } = useGalleryStore();
  const { loadMore, refresh } = useGallery(tableNumber);

  // Sentinel pour infinite scroll
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    if (!sentinelRef.current) return;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, isLoading, loadMore]);

  const filters = [
    { key: 'all',   label: 'Tout',    count: counts.total },
    { key: 'photo', label: 'Photos',  count: counts.photos },
    { key: 'video', label: 'Vidéos',  count: counts.videos },
    { key: 'audio', label: 'Audios',  count: counts.audios },
  ];

  return (
    <div className="flex flex-col gap-space-lg w-full">
      {/* ── Résumé table ── */}
      <div className="bg-surface-container-low rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="font-display text-headline-sm text-on-surface">Livre d&apos;Or Partagé</p>
            <p className="font-body text-body-sm text-on-surface-variant">
              Moments capturés — Table {tableNumber}
            </p>
          </div>
          <button
            onClick={refresh}
            aria-label="Rafraîchir la galerie"
            className="w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center text-primary hover:bg-surface-variant transition-colors"
          >
            <IconSparkles size={20} stroke={1.5} />
          </button>
        </div>

        {/* Compteurs */}
        <div className="flex items-center justify-between bg-surface-container rounded-lg px-space-md py-space-xs">
          <div className="flex items-center gap-space-2xs">
            <IconPhoto size={16} className="text-primary" stroke={1.5} />
            <span className="font-body text-label-md text-on-surface">{counts.photos} Photos</span>
          </div>
          <span className="w-1 h-1 rounded-full bg-outline-variant" />
          <div className="flex items-center gap-space-2xs">
            <IconVideo size={16} className="text-primary" stroke={1.5} />
            <span className="font-body text-label-md text-on-surface">{counts.videos} Vidéos</span>
          </div>
          <span className="w-1 h-1 rounded-full bg-outline-variant" />
          <div className="flex items-center gap-space-2xs">
            <IconMicrophone size={16} className="text-primary" stroke={1.5} />
            <span className="font-body text-label-md text-on-surface">{counts.audios} Audios</span>
          </div>
        </div>
      </div>

      {/* ── Filtres ── */}
      <div className="flex items-center gap-space-2xs overflow-x-auto no-scrollbar py-space-2xs">
        {filters.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={activeFilter === key ? 'filter-pill-active' : 'filter-pill'}
          >
            {label}
            {count > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full font-body text-[10px] ${
                activeFilter === key
                  ? 'bg-surface/20'
                  : 'bg-surface-container text-secondary'
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Grille médias ── */}
      {isLoading && items.length === 0 ? (
        <GallerySkeleton count={6} />
      ) : items.length === 0 ? (
        <EmptyGallery />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 w-full items-start">
            {items.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                onClick={() => openLightbox(item)}
              />
            ))}
          </div>

          {/* Sentinel infinite scroll */}
          <div ref={sentinelRef} className="h-4 w-full" />

          {/* Chargement page suivante */}
          {isLoading && (
            <div className="flex justify-center py-space-md">
              <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          )}

          {!hasMore && items.length > 0 && (
            <p className="text-center font-body text-label-sm text-secondary uppercase tracking-wider py-space-md">
              Tous les souvenirs chargés
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── Carte média ────────────────────────────────────────────────────────────
function MediaCard({ item, onClick }) {
  const timeAgo = formatDistanceToNow(new Date(item.createdAt), {
    locale: fr, addSuffix: true,
  });

  if (item.type === 'audio') {
    return <AudioCard item={item} timeAgo={timeAgo} onClick={onClick} />;
  }

  return (
    <button
      onClick={onClick}
      className="media-card text-left w-full"
      aria-label={`Voir le média de ${item.guestName}`}
    >
      <div className="relative w-full aspect-portrait bg-surface-container">
        <img
          src={item.thumbnailUrl || item.cloudinaryUrl}
          alt={`Photo de ${item.guestName}`}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-on-surface/75 via-transparent to-black/10 pointer-events-none" />

        {/* Vidéo badge + play */}
        {item.type === 'video' && (
          <>
            <div className="absolute top-2 left-2 bg-on-surface/75 backdrop-blur-md text-surface px-2 py-0.5 rounded-full flex items-center gap-1">
              <IconVideo size={12} className="text-primary-fixed" stroke={1.5} />
              <span className="font-body text-label-sm text-surface tracking-wider">
                {item.duration ? `${Math.floor(item.duration / 60)}:${String(item.duration % 60).padStart(2, '0')}` : ''}
              </span>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-11 h-11 rounded-full bg-surface/90 backdrop-blur-md flex items-center justify-center text-primary shadow-md">
                <IconPlayerPlay size={22} stroke={1.5} />
              </div>
            </div>
          </>
        )}

        {/* Photo — heure */}
        {item.type === 'photo' && (
          <div className="absolute top-2 left-2 bg-surface/90 backdrop-blur-md px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="font-body text-label-sm text-on-surface">{timeAgo}</span>
          </div>
        )}

        {/* Réactions rapides */}
        <div className="absolute bottom-2 right-2 bg-surface-container-lowest/90 backdrop-blur-md px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
          <IconHeart size={14} className="text-primary" stroke={1.5} />
          <span className="font-body text-label-sm text-on-surface font-medium">
            {(item.heartCount || 0) + (item.starCount || 0) + (item.bravoCount || 0) + (item.fireCount || 0)}
          </span>
        </div>
      </div>

      <div className="p-space-xs flex flex-col gap-0.5">
        <span className="font-body text-label-md text-on-surface truncate">
          Par {item.guestName}
        </span>
        {item.caption && (
          <span className="font-body text-body-sm text-on-surface-variant text-[11px] line-clamp-2">
            {item.caption}
          </span>
        )}
      </div>
    </button>
  );
}

// ── Carte audio ────────────────────────────────────────────────────────────
function AudioCard({ item, timeAgo, onClick }) {
  const BARS = [3, 6, 10, 8, 12, 11, 9, 4, 7, 10, 11, 8, 5, 7, 9];

  return (
    <button
      onClick={onClick}
      className="flex flex-col bg-surface-container-low rounded-xl p-space-sm shadow-sm justify-between aspect-portrait relative overflow-hidden text-left w-full"
      aria-label={`Message audio de ${item.guestName}`}
    >
      <div className="flex items-center justify-between">
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <IconMicrophone size={16} stroke={1.5} />
        </div>
        <span className="font-body text-label-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
          {item.duration
            ? `${Math.floor(item.duration / 60)}:${String(item.duration % 60).padStart(2, '0')}`
            : '--:--'}
        </span>
      </div>

      {/* Waveform décorative */}
      <div className="flex flex-col gap-space-2xs my-auto">
        <div className="flex items-end justify-between gap-[3px] h-12 w-full px-1">
          {BARS.map((h, i) => (
            <div
              key={i}
              className="w-1 bg-primary rounded-full opacity-80"
              style={{ height: `${(h / 12) * 100}%` }}
            />
          ))}
        </div>
        <p className="font-display text-[13px] text-on-surface text-center italic">
          {item.caption || 'Message audio'}
        </p>
      </div>

      <div className="flex items-center justify-between pt-space-xs">
        <div className="min-w-0 pr-1">
          <p className="font-body text-label-md text-on-surface truncate">{item.guestName}</p>
          <p className="font-body text-[10px] text-on-surface-variant">{timeAgo}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-sm">
          <IconPlayerPlay size={18} stroke={1.5} />
        </div>
      </div>
    </button>
  );
}

// ── État vide ──────────────────────────────────────────────────────────────
function EmptyGallery() {
  return (
    <div className="flex flex-col items-center justify-center gap-space-md py-space-3xl text-center">
      <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center">
        <IconPhoto size={28} className="text-outline" stroke={1} />
      </div>
      <div>
        <p className="font-display text-headline-sm text-on-surface">Galerie vide</p>
        <p className="font-body text-body-md text-secondary mt-1">
          Soyez le premier à partager un souvenir !
        </p>
      </div>
    </div>
  );
}
