/**
 * MediaGallery — Vue admin de tous les médias avec suppression
 */
import { useState, useEffect, useCallback } from 'react';
import {
  IconTrash, IconPhoto, IconVideo, IconMicrophone,
  IconPlayerPlay, IconDownload,
} from '@tabler/icons-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { mediaAPI } from '@/utils/api';
import { GallerySkeleton } from '@/components/Shared/LoadingSpinner';
import { useToast } from '@/components/Shared/Toast';

export default function MediaGallery() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState(null);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const [mediaRes, statsRes] = await Promise.all([
        mediaAPI.list({ type: filter === 'all' ? undefined : filter, limit: 60 }),
        mediaAPI.stats(),
      ]);
      setItems(mediaRes.data.media || []);
      setStats(statsRes.data);
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [filter, toast]);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Supprimer le média de ${name} ?`)) return;
    try {
      await mediaAPI.delete(id);
      setItems((prev) => prev.filter((m) => m.id !== id));
      toast.success('Média supprimé');
    } catch {
      toast.error('Impossible de supprimer');
    }
  };

  const FILTERS = [
    { key: 'all',   label: 'Tout',   count: stats?.total },
    { key: 'photo', label: 'Photos', count: stats?.photos },
    { key: 'video', label: 'Vidéos', count: stats?.videos },
    { key: 'audio', label: 'Audios', count: stats?.audios },
  ];

  return (
    <div className="flex flex-col gap-space-lg w-full pb-space-2xl">
      <div>
        <h2 className="font-display text-headline-lg text-on-surface">Médiathèque</h2>
        <p className="font-body text-body-sm text-secondary">
          {stats?.total ?? 0} médias collectés · {stats?.totalSize ?? '—'} utilisés
        </p>
      </div>

      {/* Stats rapides */}
      {stats && (
        <div className="grid grid-cols-3 gap-space-sm">
          {[
            { Icon: IconPhoto,      label: 'Photos',  val: stats.photos  },
            { Icon: IconVideo,      label: 'Vidéos',  val: stats.videos  },
            { Icon: IconMicrophone, label: 'Audios',  val: stats.audios  },
          ].map(({ Icon, label, val }) => (
            <div key={label} className="card p-space-sm flex flex-col items-center gap-1">
              <Icon size={20} className="text-primary" stroke={1.5} />
              <span className="font-display text-headline-sm text-on-surface">{val ?? 0}</span>
              <span className="font-body text-label-sm text-secondary uppercase tracking-wider">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-space-2xs overflow-x-auto no-scrollbar">
        {FILTERS.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={filter === key ? 'filter-pill-active' : 'filter-pill'}
          >
            {label}
            {count !== undefined && (
              <span className="ml-1 font-body text-[10px] opacity-70">({count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Grille */}
      {loading ? (
        <GallerySkeleton count={8} />
      ) : items.length === 0 ? (
        <div className="text-center py-space-xl font-body text-body-md text-secondary">
          Aucun média pour ce filtre
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((item) => (
            <AdminMediaCard key={item.id} item={item} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminMediaCard({ item, onDelete }) {
  const timeAgo = item.createdAt
    ? formatDistanceToNow(new Date(item.createdAt), { locale: fr, addSuffix: true })
    : '';

  return (
    <div className="media-card group relative">
      {/* Thumbnail */}
      <div className="relative aspect-portrait bg-surface-container overflow-hidden">
        {item.type === 'audio' ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-surface-container-low">
            <IconMicrophone size={28} className="text-primary" stroke={1.5} />
            <span className="font-body text-label-sm text-secondary">
              {item.duration ? `${Math.floor(item.duration / 60)}:${String(item.duration % 60).padStart(2, '0')}` : 'Audio'}
            </span>
          </div>
        ) : (
          <>
            <img
              src={item.thumbnailUrl || item.cloudinaryUrl}
              alt={`Média de ${item.guestName}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {item.type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-9 h-9 rounded-full bg-surface/80 flex items-center justify-center text-primary">
                  <IconPlayerPlay size={18} stroke={1.5} />
                </div>
              </div>
            )}
          </>
        )}

        {/* Actions overlay */}
        <div className="absolute inset-0 bg-on-surface/0 group-hover:bg-on-surface/30 transition-colors flex items-end justify-end p-1.5 gap-1 opacity-0 group-hover:opacity-100">
          <a
            href={item.cloudinaryUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Télécharger"
            className="w-7 h-7 rounded bg-surface/90 flex items-center justify-center text-on-surface"
            onClick={(e) => e.stopPropagation()}
          >
            <IconDownload size={14} stroke={1.5} />
          </a>
          <button
            onClick={() => onDelete(item.id, item.guestName)}
            aria-label="Supprimer"
            className="w-7 h-7 rounded bg-error/90 flex items-center justify-center text-white"
          >
            <IconTrash size={14} stroke={1.5} />
          </button>
        </div>
      </div>

      {/* Infos */}
      <div className="p-space-xs flex flex-col gap-0.5">
        <span className="font-body text-label-md text-on-surface truncate">{item.guestName}</span>
        <div className="flex items-center justify-between">
          <span className="font-body text-body-sm text-secondary text-[10px]">{timeAgo}</span>
          <TypeBadge type={item.type} />
        </div>
      </div>
    </div>
  );
}

function TypeBadge({ type }) {
  const cfg = {
    photo: { Icon: IconPhoto,      color: 'text-primary' },
    video: { Icon: IconVideo,      color: 'text-primary' },
    audio: { Icon: IconMicrophone, color: 'text-primary' },
  };
  const { Icon, color } = cfg[type] || cfg.photo;
  return <Icon size={12} className={color} stroke={1.5} />;
}
