/**
 * MediaDetail — Lightbox plein écran
 * Affiche photo/vidéo/audio avec réactions et commentaires
 */
import { useEffect, useRef, useCallback } from 'react';
import {
  IconX, IconShare, IconBookmark,
  IconPlayerPlay, IconPlayerPause,
  IconVolume, IconVolumeOff,
  IconMicrophone, IconClock,
} from '@tabler/icons-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import useGalleryStore from '@/store/galleryStore';
import Reactions from './Reactions';
import Comments from './Comments';
import { useToast } from '@/components/Shared/Toast';

export default function MediaDetail() {
  const { selectedMedia, lightboxOpen, closeLightbox } = useGalleryStore();
  const scrollRef = useRef(null);

  // Fermer avec Échap
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') closeLightbox(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [closeLightbox]);

  // Bloquer le scroll du body pendant l'ouverture
  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [lightboxOpen]);

  if (!lightboxOpen || !selectedMedia) return null;

  const timeAgo = selectedMedia.createdAt
    ? formatDistanceToNow(new Date(selectedMedia.createdAt), { locale: fr, addSuffix: true })
    : '';

  return (
    <div
      className="fixed inset-0 z-[100] bg-surface flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Détail du média"
    >
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-screen-gutter py-space-sm pt-safe bg-surface/80 backdrop-blur-xl shadow-sm shrink-0">
        <button
          onClick={closeLightbox}
          aria-label="Fermer"
          className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors touch-target"
        >
          <IconX size={20} stroke={1.5} />
        </button>
        <div className="flex flex-col items-center">
          <span className="font-display text-headline-sm text-on-surface">Détail Média</span>
          <span className="font-body text-label-sm uppercase tracking-widest text-primary">
            Table {selectedMedia.tableNumber}
          </span>
        </div>
        <div className="flex items-center gap-space-2xs">
          <ActionButton icon={IconShare} label="Partager" onClick={() => handleShare(selectedMedia)} />
          <ActionButton icon={IconBookmark} label="Sauvegarder" />
        </div>
      </header>

      {/* ── Contenu scrollable ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-safe">
        <div className="flex flex-col w-full pb-space-2xl px-screen-gutter">

          {/* ── Média principal ── */}
          <div className="relative w-full rounded-xl overflow-hidden shadow-xl bg-surface-container-lowest -mx-0 mb-space-md">
            {selectedMedia.type === 'photo' && (
              <PhotoViewer media={selectedMedia} timeAgo={timeAgo} />
            )}
            {selectedMedia.type === 'video' && (
              <VideoViewer media={selectedMedia} timeAgo={timeAgo} />
            )}
            {selectedMedia.type === 'audio' && (
              <AudioViewer media={selectedMedia} timeAgo={timeAgo} />
            )}
          </div>

          {/* ── Réactions ── */}
          <Reactions mediaId={selectedMedia.id} />

          {/* ── Commentaires ── */}
          <Comments mediaId={selectedMedia.id} />
        </div>
      </div>
    </div>
  );
}

// ── Bouton action header ───────────────────────────────────────────────────
function ActionButton({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors touch-target"
    >
      <Icon size={20} stroke={1.5} />
    </button>
  );
}

// ── Viewer Photo ───────────────────────────────────────────────────────────
function PhotoViewer({ media, timeAgo }) {
  return (
    <div className="relative aspect-portrait w-full">
      <img
        src={media.cloudinaryUrl}
        alt={`Photo de ${media.guestName}`}
        className="w-full h-full object-cover"
        loading="eager"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-on-surface/85 via-transparent to-black/20 pointer-events-none" />

      {/* Badge officiel */}
      <div className="absolute top-space-md left-space-md bg-surface-container-lowest/90 backdrop-blur-md px-3 py-1 rounded-full shadow-sm">
        <span className="font-body text-label-sm uppercase tracking-widest text-primary flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Instantané Officiel
        </span>
      </div>

      {/* Auteur */}
      <AuthorOverlay media={media} timeAgo={timeAgo} />
    </div>
  );
}

// ── Viewer Vidéo ───────────────────────────────────────────────────────────
function VideoViewer({ media, timeAgo }) {
  const videoRef = useRef(null);

  return (
    <div className="relative w-full bg-inverse-surface">
      <video
        ref={videoRef}
        src={media.cloudinaryUrl}
        className="w-full max-h-[70vh] object-contain"
        controls
        playsInline
        poster={media.thumbnailUrl}
        aria-label={`Vidéo de ${media.guestName}`}
      />
      <AuthorOverlay media={media} timeAgo={timeAgo} dark />
    </div>
  );
}

// ── Viewer Audio ───────────────────────────────────────────────────────────
function AudioViewer({ media, timeAgo }) {
  const audioRef = useRef(null);
  const BARS = [3, 6, 10, 8, 12, 11, 9, 4, 7, 10, 11, 8, 5, 9, 12, 7, 4, 8, 11];

  return (
    <div className="flex flex-col gap-space-md p-space-lg bg-surface-container-low rounded-xl">
      <div className="flex items-center gap-space-xs">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <IconMicrophone size={22} stroke={1.5} />
        </div>
        <div>
          <p className="font-display text-headline-sm text-on-surface">{media.guestName}</p>
          <div className="flex items-center gap-1 text-secondary">
            <IconClock size={12} stroke={1.5} />
            <span className="font-body text-label-sm">{timeAgo}</span>
            {media.duration && (
              <span className="font-body text-label-sm ml-2">
                {Math.floor(media.duration / 60)}:{String(media.duration % 60).padStart(2, '0')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Waveform */}
      <div className="flex items-end justify-between gap-[3px] h-16 w-full px-1">
        {BARS.map((h, i) => (
          <div
            key={i}
            className="flex-1 bg-primary rounded-full opacity-70"
            style={{ height: `${(h / 12) * 100}%` }}
          />
        ))}
      </div>

      {/* Lecteur audio natif */}
      <audio
        ref={audioRef}
        src={media.cloudinaryUrl}
        controls
        className="w-full"
        aria-label={`Audio de ${media.guestName}`}
      />

      {media.caption && (
        <p className="font-body text-body-md text-on-surface-variant italic text-center">
          &ldquo;{media.caption}&rdquo;
        </p>
      )}
    </div>
  );
}

// ── Overlay auteur (photo/vidéo) ───────────────────────────────────────────
function AuthorOverlay({ media, timeAgo, dark = false }) {
  return (
    <div className="absolute bottom-0 inset-x-0 p-space-md">
      <div className="flex items-end justify-between gap-space-sm">
        <div className="flex flex-col">
          <span className={`font-body text-label-sm uppercase tracking-wider ${dark ? 'text-surface-variant/80' : 'text-surface-variant/90'}`}>
            Auteur Invité
          </span>
          <h2 className={`font-display text-headline-sm tracking-tight leading-tight ${dark ? 'text-inverse-on-surface' : 'text-surface'}`}>
            {media.guestName}
          </h2>
          {media.tableNumber && (
            <p className={`font-body text-body-sm mt-0.5 ${dark ? 'text-surface-variant/70' : 'text-surface-variant/80'}`}>
              Table {media.tableNumber}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 bg-on-surface/40 backdrop-blur-md px-2.5 py-1 rounded-full">
          <IconClock size={14} className="text-surface-variant" stroke={1.5} />
          <span className="font-body text-label-sm text-surface-variant">{timeAgo}</span>
        </div>
      </div>
    </div>
  );
}

// ── Partage natif ──────────────────────────────────────────────────────────
function handleShare(media) {
  if (navigator.share) {
    navigator.share({
      title: `Photo de ${media.guestName} — Notre Mariage`,
      url: media.cloudinaryUrl,
    }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(media.cloudinaryUrl);
  }
}
