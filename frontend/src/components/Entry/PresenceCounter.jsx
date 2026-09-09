/**
 * PresenceCounter — Compteur d'arrivées temps réel
 * Barre de progression + stats + historique récent
 */
import { useEffect } from 'react';
import { IconRefresh, IconUserCheck, IconClock } from '@tabler/icons-react';
import usePresenceStore from '@/store/presenceStore';
import { guestsAPI } from '@/utils/api';

export default function PresenceCounter() {
  const {
    totalGuests,
    arrivedCount,
    pendingCount,
    recentScans,
    isOffline,
    setStats,
    getArrivalPercentage,
  } = usePresenceStore();

  const percentage = getArrivalPercentage();

  // Charger les stats au montage
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await guestsAPI.stats();
        setStats({ total: res.data.total, arrived: res.data.arrived });
      } catch {
        // Silencieux — on garde les stats locales
      }
    };
    fetchStats();
    // Rafraîchissement toutes les 30s
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [setStats]);

  return (
    <div className="flex flex-col gap-space-md w-full">
      {/* ── Barre de statut connexion ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-xs bg-surface-container px-space-sm py-space-2xs rounded-full shadow-sm">
          <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-error' : 'bg-primary'} ${!isOffline ? 'animate-pulse' : ''}`} />
          <span className="font-body text-label-md text-on-surface-variant uppercase tracking-wider">
            {isOffline ? 'Hors-ligne' : 'Synchronisé'}
          </span>
        </div>
        <div className="flex items-center gap-space-2xs text-secondary">
          <IconRefresh size={16} stroke={1.5} />
          <span className="font-body text-label-sm text-secondary">Auto (30s)</span>
        </div>
      </div>

      {/* ── Compteur principal ── */}
      <div className="card p-space-md">
        <div className="flex items-baseline justify-between mb-space-xs">
          <div>
            <span className="font-display text-display-lg-mobile text-on-surface">
              {arrivedCount}
            </span>
            <span className="font-display text-headline-sm text-secondary font-light">
              {' '}/ {totalGuests}
            </span>
          </div>
          <div className="text-right">
            <span className="font-body text-label-lg text-primary font-semibold">
              {percentage}%
            </span>
            <p className="font-body text-label-sm text-secondary uppercase tracking-widest">
              Invités Présents
            </p>
          </div>
        </div>

        {/* Barre progression orange */}
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>

        <div className="flex justify-between items-center mt-space-xs">
          <span className="font-body text-label-sm text-secondary">
            Attente : {pendingCount} convive{pendingCount > 1 ? 's' : ''}
          </span>
          <span className="font-body text-label-sm text-primary font-medium flex items-center gap-1">
            <IconUserCheck size={14} stroke={2} />
            {arrivedCount} arrivé{arrivedCount > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Historique scans récents ── */}
      {recentScans.length > 0 && (
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center justify-between px-space-2xs">
            <h3 className="font-display text-headline-sm text-on-surface">
              Derniers Accès Scannés
            </h3>
            <span className="font-body text-label-sm text-secondary uppercase tracking-wider">
              Temps Réel
            </span>
          </div>

          <div className="flex flex-col gap-space-2xs">
            {recentScans.map((scan, idx) => (
              <div
                key={`${scan.id}_${idx}`}
                className="flex items-center justify-between p-space-sm card shadow-sm animate-enter"
              >
                <div className="flex items-center gap-space-sm min-w-0">
                  {/* Avatar initiales */}
                  <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary shrink-0">
                    <span className="font-body text-label-sm font-semibold">
                      {scan.guestName.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-body text-body-md text-on-surface font-medium truncate">
                      {scan.guestName}
                    </p>
                    <p className="font-body text-label-sm text-secondary">
                      {scan.tableName}
                      {scan.companions > 0 ? ` • +${scan.companions}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-space-xs">
                  <div className="flex items-center gap-1 text-secondary justify-end mb-0.5">
                    <IconClock size={12} stroke={1.5} />
                    <span className="font-body text-label-sm">{scan.time}</span>
                  </div>
                  <span className={`font-body text-[10px] font-semibold uppercase tracking-wider flex items-center gap-0.5 justify-end ${scan.status === 'validated' ? 'text-success' : 'text-error'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${scan.status === 'validated' ? 'bg-success' : 'bg-error'}`} />
                    {scan.status === 'validated' ? 'Validé' : 'Doublon'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
