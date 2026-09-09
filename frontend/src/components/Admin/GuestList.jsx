/**
 * GuestList — Liste complète invités avec recherche/filtre/export
 */
import { useState, useEffect, useCallback } from 'react';
import {
  IconSearch, IconFilter, IconPlus, IconTrash,
  IconEdit, IconDownload, IconQrcode, IconX, IconCheck,
} from '@tabler/icons-react';
import { guestsAPI } from '@/utils/api';
import { TableRowSkeleton } from '@/components/Shared/LoadingSpinner';
import { useToast } from '@/components/Shared/Toast';

const FILTERS = ['Tous', 'Arrivés', 'En attente', 'Absents'];
const STATUS_MAP = { 'Arrivés': 'arrived', 'En attente': 'registered', 'Absents': 'absent' };

export default function GuestList() {
  const toast = useToast();
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Tous');
  const [total, setTotal] = useState(0);
  const [editingGuest, setEditingGuest] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        search: search || undefined,
        status: STATUS_MAP[filter] || undefined,
        limit: 50,
      };
      const res = await guestsAPI.list(params);
      setGuests(res.data.guests || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      toast.error('Erreur chargement : ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [search, filter, toast]);

  useEffect(() => {
    const t = setTimeout(fetchGuests, 300);
    return () => clearTimeout(t);
  }, [fetchGuests]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Supprimer ${name} de la liste ?`)) return;
    try {
      await guestsAPI.delete(id);
      setGuests((prev) => prev.filter((g) => g.id !== id));
      toast.success(`${name} supprimé(e)`);
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleExport = async () => {
    try {
      const res = await guestsAPI.exportCSV();
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invites_mariage_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exporté');
    } catch {
      toast.error('Erreur export CSV');
    }
  };

  return (
    <div className="flex flex-col gap-space-md w-full pb-space-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-headline-lg text-on-surface">Liste des Invités</h2>
          <p className="font-body text-body-sm text-secondary">{total} invité{total > 1 ? 's' : ''} au total</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-space-xs bg-primary text-on-primary px-space-md py-space-xs rounded-lg font-body text-label-lg uppercase tracking-wider shadow-sm active:scale-95 transition-transform">
          <IconPlus size={18} stroke={2} />
          <span>Ajouter</span>
        </button>
      </div>

      {/* ── Recherche + filtres ── */}
      <div className="flex items-center gap-space-sm">
        <div className="relative flex-1">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" stroke={1.5} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un invité..."
            className="w-full h-10 pl-9 pr-4 rounded-lg bg-surface-container-low text-on-surface font-body text-body-md placeholder:text-secondary focus:outline-none focus:bg-surface-container transition-colors"
          />
        </div>
        <button
          onClick={handleExport}
          aria-label="Exporter CSV"
          className="h-10 w-10 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary hover:text-on-surface transition-colors"
        >
          <IconDownload size={18} stroke={1.5} />
        </button>
      </div>

      {/* Filtres pills */}
      <div className="flex gap-space-2xs overflow-x-auto no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={filter === f ? 'filter-pill-active' : 'filter-pill'}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[560px]">
            <thead>
              <tr className="bg-surface-container-low font-body text-label-sm text-secondary uppercase tracking-wider">
                <th className="py-2.5 px-3 rounded-l-lg">Invité</th>
                <th className="py-2.5 px-3">Table</th>
                <th className="py-2.5 px-3">Arrivée</th>
                <th className="py-2.5 px-3 text-center">Statut</th>
                <th className="py-2.5 px-3 rounded-r-lg text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)
                : guests.length === 0
                  ? (
                    <tr>
                      <td colSpan={5} className="py-space-xl text-center font-body text-body-md text-secondary">
                        Aucun invité trouvé
                      </td>
                    </tr>
                  )
                  : guests.map((guest) => (
                    <tr key={guest.id} className="table-row">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <InitialsAvatar name={guest.name} />
                          <div className="min-w-0">
                            <div className="font-body text-body-md font-semibold text-on-surface truncate">{guest.name}</div>
                            {guest.email && <div className="font-body text-body-sm text-secondary truncate">{guest.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-body text-body-md text-on-surface">
                          {guest.tableName || `Table ${guest.tableNumber}`}
                        </span>
                        {guest.companions > 0 && (
                          <span className="block font-body text-body-sm text-secondary">+{guest.companions}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-body text-body-sm text-on-surface">
                        {guest.arrivalTime
                          ? new Date(guest.arrivalTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                          : <span className="text-secondary">—</span>}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <StatusBadge status={guest.status} />
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingGuest(guest)}
                            aria-label="Modifier"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
                          >
                            <IconEdit size={16} stroke={1.5} />
                          </button>
                          <button
                            onClick={() => handleDelete(guest.id, guest.name)}
                            aria-label="Supprimer"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-error hover:bg-error-container transition-colors"
                          >
                            <IconTrash size={16} stroke={1.5} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Ajout/Modification ── */}
      {(showAddModal || editingGuest) && (
        <GuestModal
          guest={editingGuest}
          onClose={() => { setShowAddModal(false); setEditingGuest(null); }}
          onSaved={() => { fetchGuests(); setShowAddModal(false); setEditingGuest(null); }}
        />
      )}
    </div>
  );
}

// ── Modal ajout/édition invité ────────────────────────────────────────────
function GuestModal({ guest, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = !!guest;
  const [form, setForm] = useState({
    name: guest?.name || '',
    email: guest?.email || '',
    phone: guest?.phone || '',
    tableNumber: guest?.tableNumber || '',
    tableName: guest?.tableName || '',
    companions: guest?.companions || 0,
    dietaryRestrictions: guest?.dietaryRestrictions || '',
    zone: guest?.zone || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (isEdit) {
        await guestsAPI.update(guest.id, form);
        toast.success('Invité modifié');
      } else {
        await guestsAPI.create(form);
        toast.success('Invité ajouté');
      }
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      <div className="overlay-backdrop" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-surface rounded-t-2xl sm:rounded-xl shadow-xl p-space-lg max-h-[90vh] overflow-y-auto modal-enter">
        <div className="flex items-center justify-between mb-space-lg">
          <h3 className="font-display text-headline-sm text-on-surface">
            {isEdit ? 'Modifier l\'invité' : 'Ajouter un invité'}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-secondary">
            <IconX size={16} stroke={2} />
          </button>
        </div>
        <form onSubmit={handleSave} className="flex flex-col gap-space-md">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
            <Field label="Nom complet *" id="name" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} required />
            <Field label="Email" id="email" type="email" value={form.email} onChange={(v) => setForm((p) => ({ ...p, email: v }))} />
            <Field label="Téléphone" id="phone" value={form.phone} onChange={(v) => setForm((p) => ({ ...p, phone: v }))} />
            <Field label="Numéro table" id="tableNumber" type="number" value={form.tableNumber} onChange={(v) => setForm((p) => ({ ...p, tableNumber: parseInt(v) || '' }))} />
            <Field label="Nom de la table" id="tableName" value={form.tableName} onChange={(v) => setForm((p) => ({ ...p, tableName: v }))} />
            <Field label="Accompagnateurs" id="companions" type="number" value={form.companions} onChange={(v) => setForm((p) => ({ ...p, companions: parseInt(v) || 0 }))} />
            <Field label="Zone" id="zone" value={form.zone} onChange={(v) => setForm((p) => ({ ...p, zone: v }))} placeholder="Zone A" />
            <Field label="Régime alimentaire" id="diet" value={form.dietaryRestrictions} onChange={(v) => setForm((p) => ({ ...p, dietaryRestrictions: v }))} />
          </div>
          <div className="flex gap-space-sm pt-space-xs">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={saving || !form.name.trim()} className="btn-primary flex-1">
              {saving ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <IconCheck size={18} stroke={2} />}
              <span>{isEdit ? 'Enregistrer' : 'Ajouter'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, id, value, onChange, type = 'text', required, placeholder }) {
  return (
    <div className="flex flex-col gap-space-2xs">
      <label className="input-label" htmlFor={id}>{label}</label>
      <input
        id={id} type={type} value={value} required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="input-field"
      />
    </div>
  );
}

function InitialsAvatar({ name = '' }) {
  const initials = name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-semibold text-xs shrink-0">
      {initials}
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = {
    arrived:    { cls: 'badge-success', label: 'Arrivé' },
    registered: { cls: 'badge-warning', label: 'Attente' },
    absent:     { cls: 'badge-error',   label: 'Absent' },
  };
  const { cls, label } = cfg[status] || cfg.registered;
  return <span className={cls}>{label}</span>;
}
