/**
 * TablePage — Hub média de chaque table (Gallery / Upload / Audio / Voeux)
 */
import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IconDiamond } from '@tabler/icons-react';
import useAuthStore from '@/store/authStore';
import Header from '@/components/Shared/Header';
import BottomNav from '@/components/Shared/BottomNav';
import Gallery from '@/components/Table/Gallery';
import UploadPhoto from '@/components/Table/UploadPhoto';
import UploadVideo from '@/components/Table/UploadVideo';
import UploadAudio from '@/components/Table/UploadAudio';
import MediaDetail from '@/components/Table/MediaDetail';
import { useGallery } from '@/hooks/useGallery';
import { useRealtime } from '@/hooks/useRealtime';

export default function TablePage({ tab = 'gallery' }) {
  const { tableNumber } = useParams();
  const navigate = useNavigate();
  const { setTableNumber, tableNumber: storedTable } = useAuthStore();
  const tableNum = parseInt(tableNumber, 10) || storedTable || 1;

  // Synchroniser le numéro de table dans le store
  useEffect(() => {
    if (tableNum) setTableNumber(tableNum);
  }, [tableNum, setTableNumber]);

  // Charger la galerie initiale
  const { load } = useGallery(tableNum);
  useEffect(() => { load(); }, [tableNum]); // eslint-disable-line

  // Sync temps réel Supabase
  useRealtime(tableNum);

  const handleContribute = useCallback(() => {
    navigate(`/table/${tableNum}/photo`);
  }, [tableNum, navigate]);

  const getSubtitle = () => {
    const labels = {
      gallery: `Table ${tableNum} · Galerie`,
      photo:   `Table ${tableNum} · Photo`,
      video:   `Table ${tableNum} · Vidéo`,
      audio:   `Table ${tableNum} · Audio`,
      voeux:   `Table ${tableNum} · Vœux`,
    };
    return labels[tab] || `Table ${tableNum}`;
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header fixe */}
      <Header
        title="Notre Mariage"
        subtitle={getSubtitle()}
        rightSlot={
          <div className="flex items-center gap-space-xs">
            <IconDiamond size={16} className="text-primary" stroke={1.5} />
          </div>
        }
      />

      {/* Contenu principal */}
      <main className="flex-1 overflow-y-auto pt-16 pb-28 px-screen-gutter">
        <div className="flex flex-col w-full max-w-2xl mx-auto">

          {tab === 'gallery' && (
            <>
              {/* Indicateur pull-to-refresh */}
              <div className="flex items-center justify-between py-space-xs text-on-surface-variant mb-space-sm">
                <div className="flex items-center gap-space-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="font-body text-label-sm uppercase tracking-widest">
                    En direct
                  </span>
                </div>
              </div>
              <Gallery />

              {/* CTA contribuer */}
              <ContributionCTA onPhoto={handleContribute} onAudio={() => navigate(`/table/${tableNum}/audio`)} />
            </>
          )}

          {tab === 'photo' && <UploadPhoto />}
          {tab === 'video' && <UploadVideo />}
          {tab === 'audio' && <UploadAudio />}

          {tab === 'voeux' && (
            <div className="flex flex-col gap-space-md pt-space-xs">
              <div className="flex flex-col gap-space-2xs text-center">
                <span className="section-label">Message aux Mariés</span>
                <h1 className="font-display text-headline-lg text-on-surface">
                  Laisser un Vœu
                </h1>
                <p className="font-body text-body-md text-secondary">
                  Choisissez votre format de message
                </p>
              </div>
              <div className="grid grid-cols-1 gap-space-sm">
                <button
                  onClick={() => navigate(`/table/${tableNum}/video`)}
                  className="card p-space-lg flex items-center gap-space-md hover:bg-surface-container-low transition-colors active:scale-[0.98]"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <IconDiamond size={24} stroke={1.5} />
                  </div>
                  <div className="text-left">
                    <p className="font-display text-headline-sm text-on-surface">Message Vidéo</p>
                    <p className="font-body text-body-sm text-secondary">Max 45 secondes · Caméra HD</p>
                  </div>
                </button>
                <button
                  onClick={() => navigate(`/table/${tableNum}/audio`)}
                  className="card p-space-lg flex items-center gap-space-md hover:bg-surface-container-low transition-colors active:scale-[0.98]"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <IconDiamond size={24} stroke={1.5} />
                  </div>
                  <div className="text-left">
                    <p className="font-display text-headline-sm text-on-surface">Message Audio</p>
                    <p className="font-body text-body-sm text-secondary">Max 2 minutes · Micro</p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Navigation bas */}
      <BottomNav />

      {/* Lightbox média (global) */}
      <MediaDetail />
    </div>
  );
}

// ── Bannière d'invitation à contribuer ────────────────────────────────────
function ContributionCTA({ onPhoto, onAudio }) {
  return (
    <div className="relative overflow-hidden bg-primary text-on-primary rounded-xl p-space-lg shadow-md mt-space-md mb-space-lg">
      <div className="relative z-10 flex flex-col gap-space-sm">
        <div className="flex items-center gap-space-xs">
          <IconDiamond size={20} className="text-primary-fixed" stroke={1.5} />
          <span className="font-body text-label-sm uppercase tracking-widest text-primary-fixed">
            Votre Instant Précieux
          </span>
        </div>
        <div>
          <h3 className="font-display text-headline-md leading-tight text-on-primary">
            Partager un instant aux mariés
          </h3>
          <p className="font-body text-body-sm text-primary-fixed mt-space-2xs opacity-95">
            Vos clichés et notes vocales enrichissent l&apos;album de la soirée.
          </p>
        </div>
        <div className="flex items-center gap-space-sm pt-space-xs">
          <button
            onClick={onPhoto}
            className="flex-1 min-h-touch-target-min bg-surface text-primary rounded px-space-md font-body text-label-lg uppercase tracking-wider flex items-center justify-center gap-space-xs shadow-sm active:bg-surface-container-high transition-colors"
          >
            <IconDiamond size={16} stroke={1.5} />
            <span>Contribuer</span>
          </button>
          <button
            onClick={onAudio}
            className="w-12 h-12 rounded bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 active:scale-95 transition-transform"
          >
            <IconDiamond size={18} stroke={1.5} />
          </button>
        </div>
      </div>
      {/* Décoration cercles */}
      <svg className="absolute -right-6 -bottom-8 w-44 h-44 text-on-primary opacity-10 pointer-events-none" fill="currentColor" viewBox="0 0 100 100">
        <circle cx="50" cy="50" fill="none" r="48" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="50" cy="50" fill="none" r="36" stroke="currentColor" strokeWidth="1" />
        <circle cx="50" cy="50" fill="none" r="24" stroke="currentColor" strokeWidth="1" />
      </svg>
    </div>
  );
}
