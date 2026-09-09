/**
 * GuestDisplay — Carte d'affichage des infos invité après scan
 * Montre nom, table, accompagnateurs, régime alimentaire
 */
import {
  IconShieldCheck,
  IconAlertTriangle,
  IconChairDirector,
  IconUsers,
  IconLeaf,
  IconClock,
} from '@tabler/icons-react';
import usePresenceStore from '@/store/presenceStore';
import { guestsAPI } from '@/utils/api';
import { useToast } from '@/components/Shared/Toast';

export default function GuestDisplay() {
  const {
    scanState,
    lastScannedGuest,
    scanError,
    isProcessing,
    setScanDuplicate,
    setScanSuccess,
    setScanError,
    resetScan,
  } = usePresenceStore();
  const toast = useToast();

  if (!lastScannedGuest && scanState === 'idle') return null;

  // ── Gestion bouton Valider ────────────────────────────────────────────
  const handleValidate = async () => {
    if (!lastScannedGuest || isProcessing) return;
    try {
      await guestsAPI.markArrival(lastScannedGuest.id, 'virgile');
      setScanSuccess(lastScannedGuest);
      toast.success(`Entrée de ${lastScannedGuest.name} confirmée`);
    } catch (err) {
      setScanError(err.message);
      toast.error(err.message);
    }
  };

  // ── Gestion bouton Signaler ───────────────────────────────────────────
  const handleReport = async () => {
    if (!lastScannedGuest) return;
    try {
      await guestsAPI.reportDuplicate(lastScannedGuest.id, 'virgile');
      setScanDuplicate(lastScannedGuest);
      toast.warning('Incident signalé');
    } catch {
      toast.error('Erreur lors du signalement');
    }
  };

  // ── Rendu état erreur ─────────────────────────────────────────────────
  if (scanState === 'error') {
    return (
      <div className="card p-space-md flex flex-col gap-space-sm animate-enter">
        <div className="flex items-center gap-space-xs text-error">
          <IconAlertTriangle size={20} stroke={1.5} />
          <span className="font-body text-label-lg uppercase tracking-wider">QR Non Reconnu</span>
        </div>
        <p className="font-body text-body-md text-on-surface-variant">{scanError}</p>
        <button onClick={resetScan} className="btn-secondary mt-space-xs">
          Réessayer
        </button>
      </div>
    );
  }

  if (!lastScannedGuest) return null;

  const isDuplicate = scanState === 'duplicate';
  const isSuccess = scanState === 'success';

  // Initiales pour avatar
  const initials = lastScannedGuest.name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="card p-space-md flex flex-col gap-space-sm animate-enter">
      {/* ── En-tête badge ── */}
      <div className="flex items-start justify-between gap-space-xs">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-space-2xs mb-1">
            {isSuccess ? (
              <IconShieldCheck size={16} className="text-primary shrink-0" stroke={2} />
            ) : isDuplicate ? (
              <IconAlertTriangle size={16} className="text-error shrink-0" stroke={2} />
            ) : (
              <IconShieldCheck size={16} className="text-primary shrink-0" stroke={1.5} />
            )}
            <span className={`font-body text-label-md uppercase tracking-wider ${isDuplicate ? 'text-error' : 'text-primary'}`}>
              {isDuplicate ? 'Doublon Détecté' : isSuccess ? 'Entrée Validée' : 'Pass VIP Officiel'}
            </span>
          </div>
          <h2 className="font-display text-headline-md text-on-surface truncate">
            {lastScannedGuest.name}
          </h2>
        </div>
        <span className="bg-surface-container px-space-xs py-1 rounded font-body text-label-md text-on-surface-variant whitespace-nowrap shrink-0">
          {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* ── Table ── */}
      <div className="bg-surface-container-low p-space-sm rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-space-xs">
          <IconChairDirector size={22} className="text-primary shrink-0" stroke={1.5} />
          <div>
            <span className="font-body text-label-sm text-secondary uppercase block">
              Placement Assis
            </span>
            <span className="font-display text-headline-sm text-on-surface">
              Table {lastScannedGuest.tableNumber}
              {lastScannedGuest.tableName ? ` — ${lastScannedGuest.tableName}` : ''}
            </span>
          </div>
        </div>
        {lastScannedGuest.zone && (
          <span className="bg-primary text-on-primary font-body text-label-md px-space-xs py-1 rounded-full uppercase tracking-wider">
            {lastScannedGuest.zone}
          </span>
        )}
      </div>

      {/* ── Métadonnées ── */}
      <div className="grid grid-cols-2 gap-space-xs">
        <div className="bg-surface-container p-space-xs rounded-lg flex items-center gap-space-xs">
          <IconUsers size={18} className="text-secondary shrink-0" stroke={1.5} />
          <div className="min-w-0">
            <span className="font-body text-label-sm text-secondary block uppercase">Quota</span>
            <span className="font-body text-body-sm text-on-surface font-medium truncate block">
              {lastScannedGuest.companions > 0
                ? `+${lastScannedGuest.companions} accompagnateur${lastScannedGuest.companions > 1 ? 's' : ''}`
                : 'Seul(e)'}
            </span>
          </div>
        </div>

        <div className="bg-surface-container p-space-xs rounded-lg flex items-center gap-space-xs">
          <IconLeaf size={18} className="text-primary-container shrink-0" stroke={1.5} />
          <div className="min-w-0">
            <span className="font-body text-label-sm text-secondary block uppercase">Régime</span>
            <span className="font-body text-body-sm text-on-surface font-medium truncate block">
              {lastScannedGuest.dietaryRestrictions || 'Aucun'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Doublon — heure arrivée ── */}
      {isDuplicate && lastScannedGuest.arrivalTime && (
        <div className="bg-error-container flex items-center gap-space-xs p-space-sm rounded-lg">
          <IconClock size={16} className="text-on-error-container shrink-0" stroke={1.5} />
          <p className="font-body text-body-sm text-on-error-container">
            Déjà enregistré(e) à{' '}
            <strong>
              {new Date(lastScannedGuest.arrivalTime).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </strong>
          </p>
        </div>
      )}

      {/* ── Actions ── */}
      {!isSuccess && !isDuplicate && (
        <div className="flex flex-col gap-space-xs mt-space-xs">
          <button
            onClick={handleValidate}
            disabled={isProcessing}
            className="btn-success"
          >
            {isProcessing ? (
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <IconShieldCheck size={20} stroke={2} />
            )}
            <span>Valider Arrivée (ARRIVÉ)</span>
          </button>
          <button
            onClick={handleReport}
            disabled={isProcessing}
            className="btn-danger"
          >
            <IconAlertTriangle size={18} stroke={1.5} />
            <span>Signaler Doublon / Incident</span>
          </button>
        </div>
      )}

      {/* ── Succès validé ── */}
      {isSuccess && (
        <div className="bg-success/10 border border-success/20 rounded-lg p-space-sm flex items-center gap-space-xs">
          <IconShieldCheck size={20} className="text-success" stroke={2} />
          <p className="font-body text-body-md text-success font-medium">
            Entrée confirmée avec succès
          </p>
        </div>
      )}
    </div>
  );
}
