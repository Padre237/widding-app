/**
 * Dashboard — Vue d'ensemble admin
 * KPIs temps réel : présences, médias, engagement
 */
import { useEffect, useState } from 'react';
import {
  IconUserCheck, IconPhoto, IconTable,
  IconRefresh, IconDownload, IconShieldHalf,
} from '@tabler/icons-react';
import { adminAPI, guestsAPI } from '@/utils/api';
import { StatCardSkeleton, TableRowSkeleton } from '@/components/Shared/LoadingSpinner';
import { useToast } from '@/components/Shared/Toast';

export default function Dashboard({ onTabChange }) {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [recentGuests, setRecentGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dashRes, guestRes] = await Promise.all([
        adminAPI.dashboard(),
        guestsAPI.list({ limit: 5, sort: 'arrival_time', order: 'desc' }),
      ]);
      setStats(dashRes.data);
      setRecentGuests(guestRes.data.guests || []);
    } catch (err) {
      toast.error('Erreur de chargement : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []); // eslint-disable-line

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await guestsAPI.exportCSV();
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Mariage_Yaounde_Registre_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export CSV téléchargé');
    } catch {
      toast.error('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  const arrivedPct = stats
    ? Math.round((stats.arrived / Math.max(stats.totalGuests, 1)) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-space-lg w-full pb-space-2xl">

      {/* ── En-tête ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-headline-lg text-on-surface">Supervision Cérémonie</h1>
          <p className="font-body text-body-sm text-secondary">
            Palais des Congrès de Yaoundé · Réception Royale
          </p>
        </div>
        <button
          onClick={fetchData}
          aria-label="Rafraîchir"
          className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-variant transition-colors"
        >
          <IconRefresh size={18} stroke={1.5} />
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 gap-space-sm md:grid-cols-3">
        {loading ? (
          <><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></>
        ) : (
          <>
            <KpiCard
              icon={<IconUserCheck size={20} className="text-primary" stroke={1.5} />}
              label="Pointage Réception"
              value={stats?.arrived ?? 0}
              total={stats?.totalGuests ?? 200}
              pct={arrivedPct}
              sublabel={`${(stats?.totalGuests ?? 200) - (stats?.arrived ?? 0)} attendus`}
              subcolor="text-primary"
            />
            <KpiCard
              icon={<IconPhoto size={20} className="text-secondary" stroke={1.5} />}
              label="Médias Collectés"
              value={stats?.totalMedia ?? 0}
              badge={stats?.mediaThisHour ? `+${stats.mediaThisHour} cette heure` : null}
              footer={
                stats
                  ? `${stats.photos ?? 0} Photos · ${stats.videos ?? 0} Vidéos · ${stats.audios ?? 0} Audios`
                  : ''
              }
            />
            <KpiCard
              icon={<IconTable size={20} className="text-primary" stroke={1.5} />}
              label="Engagement Tables"
              value={`${stats?.engagementPct ?? 94}%`}
              sublabel={`${stats?.activeTables ?? 19}/20 tables actives`}
              isCircle
              pct={stats?.engagementPct ?? 94}
            />
          </>
        )}
      </div>

      {/* ── Liste rapide présences ── */}
      <div className="card p-space-md flex flex-col gap-space-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
          <div>
            <h2 className="font-display text-headline-sm text-on-surface">
              Dernières Présences
            </h2>
            <p className="font-body text-body-sm text-secondary">
              Dernières actualisations
            </p>
          </div>
          <button
            onClick={() => onTabChange?.('guests')}
            className="text-primary font-body text-label-md font-semibold hover:underline flex items-center gap-1 self-end sm:self-auto"
          >
            Gérer le registre →
          </button>
        </div>

        <div className="overflow-x-auto -mx-space-md px-space-md">
          <table className="w-full text-left min-w-[480px]">
            <thead>
              <tr className="bg-surface-container-low font-body text-label-sm text-secondary uppercase tracking-wider">
                <th className="py-2.5 px-3 rounded-l-lg">Invité</th>
                <th className="py-2.5 px-3">Table</th>
                <th className="py-2.5 px-3">Heure</th>
                <th className="py-2.5 px-3 rounded-r-lg text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} cols={4} />)
                : recentGuests.map((g) => (
                    <tr key={g.id} className="table-row">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={g.name} />
                          <div className="min-w-0">
                            <div className="font-body text-body-md font-semibold text-on-surface truncate">
                              {g.name}
                            </div>
                            {g.notes && (
                              <div className="font-body text-body-sm text-secondary truncate">
                                {g.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-body text-body-md font-medium text-on-surface">
                          {g.tableName || `Table ${g.tableNumber}`}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-body text-body-sm text-on-surface">
                        {g.arrivalTime
                          ? new Date(g.arrivalTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                          : <span className="text-secondary">—</span>}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <StatusBadge status={g.status} />
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bouton export ── */}
      <button
        onClick={handleExport}
        disabled={exporting}
        className="btn-primary"
      >
        {exporting ? (
          <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
        ) : (
          <IconDownload size={20} stroke={1.5} />
        )}
        <span>{exporting ? 'Préparation...' : 'Exporter la liste complète (CSV)'}</span>
      </button>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, total, pct, sublabel, subcolor = 'text-secondary', badge, footer, isCircle }) {
  return (
    <div className="card p-space-md flex flex-col justify-between">
      <div className="flex items-start justify-between mb-space-sm">
        <div>
          <span className="font-body text-label-sm uppercase tracking-wider text-secondary font-medium">
            {label}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display text-headline-lg font-semibold text-on-surface">
              {value}
            </span>
            {total !== undefined && (
              <span className="font-display text-headline-sm text-secondary font-light">/ {total}</span>
            )}
            {badge && (
              <span className="font-body text-label-sm text-green-700 bg-green-50 px-2 py-0.5 rounded-md font-semibold">
                {badge}
              </span>
            )}
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-primary-fixed/20 flex items-center justify-center shrink-0">
          {icon}
        </div>
      </div>

      {/* Barre ou cercle */}
      {!isCircle && pct !== undefined && (
        <div className="space-y-1.5">
          <div className="flex justify-between font-body text-label-sm">
            <span className="text-on-surface-variant font-medium">{pct}% Honorés</span>
            {sublabel && <span className={subcolor}>{sublabel}</span>}
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {isCircle && (
        <div className="flex items-center gap-space-sm">
          <svg className="w-8 h-8 -rotate-90 shrink-0" viewBox="0 0 36 36">
            <path className="text-surface-container-highest" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5" />
            <path className="text-primary" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${pct}, 100`} strokeLinecap="round" strokeWidth="3.5" />
          </svg>
          {sublabel && <p className="font-body text-body-sm text-secondary">{sublabel}</p>}
        </div>
      )}

      {footer && (
        <div className="pt-2 flex items-center justify-between text-secondary font-body text-body-sm bg-surface-container-low px-2.5 py-1.5 rounded-lg mt-space-xs">
          {footer}
        </div>
      )}
    </div>
  );
}

function Avatar({ name = '' }) {
  const initials = name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-semibold text-xs shrink-0">
      {initials}
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === 'arrived') {
    return (
      <span className="badge-success">
        <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
        Arrivé
      </span>
    );
  }
  if (status === 'absent') {
    return (
      <span className="badge-error">
        <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
        Absent
      </span>
    );
  }
  return (
    <span className="badge-warning">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      En attente
    </span>
  );
}
