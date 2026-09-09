/**
 * EntryPage — Interface des virgiles (scan QR à l'entrée)
 */
import { useEffect } from 'react';
import { IconShieldHalf, IconWifi, IconWifiOff } from '@tabler/icons-react';
import usePresenceStore from '@/store/presenceStore';
import ScanQR from '@/components/Entry/ScanQR';
import GuestDisplay from '@/components/Entry/GuestDisplay';
import PresenceCounter from '@/components/Entry/PresenceCounter';

export default function EntryPage() {
  const { isOffline, setOffline } = usePresenceStore();

  // Détecter l'état réseau
  useEffect(() => {
    const onOnline  = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    setOffline(!navigator.onLine);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [setOffline]);

  return (
    <div className="min-h-screen bg-surface flex flex-col pt-safe pb-safe">
      {/* ── Header virgiles ── */}
      <header className="px-screen-gutter py-space-sm pt-safe">
        <div className="flex items-center justify-between mb-space-sm">
          <div className="flex items-center gap-space-xs">
            <IconShieldHalf size={20} className="text-primary" stroke={1.5} />
            <span className="font-body text-label-sm uppercase tracking-wider text-primary font-semibold bg-primary-fixed/40 px-2 py-0.5 rounded-lg">
              Accès Sécurisé VIP
            </span>
          </div>
          <div className="flex items-center gap-1">
            {isOffline
              ? <IconWifiOff size={16} className="text-error" stroke={1.5} />
              : <IconWifi    size={16} className="text-success" stroke={1.5} />
            }
            <span className="font-body text-label-sm text-secondary">
              {isOffline ? 'Hors-ligne' : 'Connecté'}
            </span>
          </div>
        </div>
        <h1 className="font-display text-headline-lg text-on-surface">
          Contrôle d&apos;Entrée
        </h1>
        <p className="font-body text-body-sm text-secondary">
          Palais des Congrès · Réception Royale
        </p>
      </header>

      {/* ── Contenu ── */}
      <main className="flex-1 overflow-y-auto px-screen-gutter pb-space-2xl">
        <div className="flex flex-col gap-space-lg max-w-md mx-auto">
          {/* Compteur + barre progression */}
          <PresenceCounter />

          {/* Scanner QR */}
          <ScanQR />

          {/* Résultat scan + actions */}
          <GuestDisplay />
        </div>
      </main>
    </div>
  );
}
