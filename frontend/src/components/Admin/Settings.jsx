/**
 * Settings — Paramètres admin : QR codes, toggles, reset, archive
 */
import { useState, useEffect } from 'react';
import {
  IconQrcode, IconUpload, IconArchive,
  IconRefresh, IconCheck, IconAlertTriangle,
  IconToggleLeft, IconToggleRight, IconLock,
} from '@tabler/icons-react';
import { adminAPI, guestsAPI } from '@/utils/api';
import { useToast } from '@/components/Shared/Toast';

export default function Settings() {
  const toast = useToast();
  const [settings, setSettings] = useState({
    comments_enabled: true,
    offline_mode_forced: false,
    max_video_duration: 45,
    max_audio_duration: 120,
    wedding_date: '2026-04-18',
    wedding_venue: 'Yaoundé, Cameroun',
    total_guests_expected: 200,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [importing, setImporting] = useState(false);

  // Charger les paramètres
  useEffect(() => {
    adminAPI.getSettings()
      .then((res) => {
        if (res.data.settings) {
          const mapped = {};
          res.data.settings.forEach(({ key, value }) => {
            mapped[key] = value === 'true' ? true : value === 'false' ? false : value;
          });
          setSettings((prev) => ({ ...prev, ...mapped }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminAPI.updateSettings(settings);
      toast.success('Paramètres sauvegardés');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateQR = async () => {
    setGeneratingQR(true);
    try {
      const res = await adminAPI.generateQRCodes();
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'QR_Codes_Mariage_Yaounde.zip';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('QR codes générés et téléchargés');
    } catch {
      toast.error('Erreur génération QR codes');
    } finally {
      setGeneratingQR(false);
    }
  };

  const handleImportCSV = async () => {
    if (!csvFile) return;
    setImporting(true);
    const formData = new FormData();
    formData.append('file', csvFile);
    try {
      const res = await guestsAPI.importCSV(formData);
      toast.success(`${res.data.imported} invités importés`);
      setCsvFile(null);
    } catch (err) {
      toast.error('Erreur import : ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleResetPresence = async () => {
    if (!window.confirm('Réinitialiser toutes les présences de test ? Cette action est irréversible.')) return;
    setResetting(true);
    try {
      await adminAPI.resetPresence();
      toast.success('Présences de test réinitialisées');
    } catch {
      toast.error('Erreur lors de la réinitialisation');
    } finally {
      setResetting(false);
    }
  };

  const handleDownloadArchive = async () => {
    setDownloading(true);
    try {
      const res = await adminAPI.downloadArchive();
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Archive_Mariage_Yaounde_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Archive téléchargée');
    } catch {
      toast.error('Erreur téléchargement archive');
    } finally {
      setDownloading(false);
    }
  };

  const Toggle = ({ settingKey, label, description, locked }) => {
    const active = settings[settingKey] === true || settings[settingKey] === 'true';
    return (
      <div className="flex items-center justify-between gap-space-md">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-space-2xs">
            <p className="font-body text-body-md font-medium text-on-surface">{label}</p>
            {locked && <IconLock size={14} className="text-secondary" stroke={1.5} />}
          </div>
          {description && (
            <p className="font-body text-body-sm text-on-surface-variant mt-0.5">{description}</p>
          )}
        </div>
        <button
          role="switch"
          aria-checked={active}
          aria-label={label}
          disabled={locked}
          onClick={() => !locked && setSettings((prev) => ({ ...prev, [settingKey]: !active }))}
          className={[
            'w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 focus:outline-none shrink-0',
            active ? 'bg-primary' : 'bg-surface-container-highest',
            locked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          ].join(' ')}
        >
          <span className={[
            'w-4 h-4 rounded-full shadow-sm transition-transform duration-200',
            active ? 'translate-x-6 bg-on-primary' : 'translate-x-0 bg-surface-container-lowest',
          ].join(' ')} />
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-space-xl">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-space-xl w-full pb-space-2xl">
      <header className="flex flex-col gap-space-xs">
        <span className="section-label">Console Régie</span>
        <h1 className="font-display text-headline-lg text-on-surface">Configuration &amp; Sécurité</h1>
        <p className="font-body text-body-sm text-on-surface-variant">
          Pilotage des flux d&apos;accès, modération et archivage des médias.
        </p>
      </header>

      {/* ── Section QR & Accès ── */}
      <section className="flex flex-col gap-space-sm">
        <SectionHeader title="Accès & Invitations QR" tag="Protocoles QR" />
        <div className="card p-space-md flex flex-col gap-space-md">

          {/* Générer QR */}
          <div className="flex items-start gap-space-sm">
            <div className="p-space-xs rounded-lg bg-surface-container text-primary shrink-0">
              <IconQrcode size={20} stroke={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-headline-sm text-on-surface">Badges & QR Nominatifs</h3>
              <p className="font-body text-body-sm text-on-surface-variant mt-0.5">
                Prêt à l&apos;impression pour le protocole d&apos;accueil et chevalets de table.
              </p>
            </div>
          </div>
          <button onClick={handleGenerateQR} disabled={generatingQR} className="btn-primary">
            {generatingQR ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <IconQrcode size={18} stroke={1.5} />}
            <span>{generatingQR ? 'Génération en cours...' : 'Générer & Télécharger tous les QR (ZIP)'}</span>
          </button>

          {/* Import CSV */}
          <div className="relative flex items-center justify-between p-space-sm bg-surface-container rounded-lg gap-space-sm">
            <div className="flex items-center gap-space-sm min-w-0">
              <div className="p-2 rounded bg-surface-container-highest text-secondary shrink-0">
                <IconUpload size={18} stroke={1.5} />
              </div>
              <div className="min-w-0">
                <p className="font-body text-body-md font-medium text-on-surface">Importer liste convives (CSV)</p>
                <p className="font-body text-body-sm text-on-surface-variant truncate">
                  {csvFile ? csvFile.name : 'Colonnes : Nom, Email, Table, Régime, Téléphone'}
                </p>
              </div>
            </div>
            <label className="cursor-pointer px-space-md py-2 bg-surface-container-highest text-on-surface rounded font-body text-body-sm font-medium hover:bg-surface-variant transition-colors shrink-0" htmlFor="csvInput">
              Parcourir
              <input
                id="csvInput"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
          {csvFile && (
            <button onClick={handleImportCSV} disabled={importing} className="btn-secondary">
              {importing ? <div className="w-4 h-4 rounded-full border-2 border-on-surface border-t-transparent animate-spin" /> : <IconCheck size={18} stroke={2} />}
              <span>{importing ? 'Import en cours...' : `Importer ${csvFile.name}`}</span>
            </button>
          )}
        </div>
      </section>

      {/* ── Section Galerie ── */}
      <section className="flex flex-col gap-space-sm">
        <SectionHeader title="Contrôle Galerie des Tables" tag="Modération Live" />
        <div className="card p-space-md flex flex-col gap-space-md">
          <Toggle
            settingKey="comments_enabled"
            label="Commentaires publics en direct"
            description="Autorise l'affichage instantané des vœux sur l'écran d'honneur."
          />
          <div className="divider" />
          <Toggle
            settingKey="offline_mode_forced"
            label="Mode Hors-ligne forcé"
            description="Mise en cache locale totale si la couverture réseau 4G sature pendant la cérémonie."
          />
          <div className="divider" />
          <Toggle
            settingKey="video_limit_45s"
            label="Limitation automatique vidéos (45s max)"
            description="Préservation de la bande passante et quotas Cloudinary. Paramètre verrouillé."
            locked
          />
        </div>
      </section>

      {/* ── Section Maintenance ── */}
      <section className="flex flex-col gap-space-sm">
        <SectionHeader title="Maintenance & Sécurité" tag="Archivage Légal" />
        <div className="card p-space-md flex flex-col gap-space-md">

          {/* Télécharger archive */}
          <div className="flex items-center justify-between p-space-sm bg-surface-container rounded-lg gap-space-sm">
            <div className="flex items-center gap-space-sm min-w-0">
              <div className="p-2 rounded bg-surface-container-highest text-primary shrink-0">
                <IconArchive size={18} stroke={1.5} />
              </div>
              <div className="min-w-0">
                <p className="font-body text-body-md font-medium text-on-surface">Sauvegarde Intégrale</p>
                <p className="font-body text-body-sm text-on-surface-variant">Tous les clichés haute définition collectés.</p>
              </div>
            </div>
          </div>
          <button onClick={handleDownloadArchive} disabled={downloading} className="btn-secondary">
            {downloading ? <div className="w-4 h-4 rounded-full border-2 border-on-surface border-t-transparent animate-spin" /> : <IconArchive size={18} stroke={1.5} />}
            <span>{downloading ? 'Préparation archive...' : 'Télécharger archive média complète (ZIP)'}</span>
          </button>

          {/* Zone reset */}
          <div className="p-space-sm bg-error-container/30 rounded-lg flex flex-col gap-space-xs border border-error/20">
            <div className="flex items-center gap-space-2xs text-error">
              <IconAlertTriangle size={16} stroke={1.5} />
              <span className="font-body text-label-md uppercase font-semibold">Zone de Test Pré-Mariage</span>
            </div>
            <p className="font-body text-body-sm text-on-surface-variant">
              Efface les simulations de check-in effectuées lors des répétitions, avant l&apos;arrivée officielle des invités.
            </p>
            <button
              onClick={handleResetPresence}
              disabled={resetting}
              className="btn-danger mt-space-2xs"
            >
              {resetting ? <div className="w-4 h-4 rounded-full border-2 border-error border-t-transparent animate-spin" /> : <IconRefresh size={16} stroke={1.5} />}
              <span>Réinitialiser le pointeur de présence (Zone test)</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Bouton Sauvegarder ── */}
      <button onClick={handleSave} disabled={saving} className="btn-primary">
        {saving ? <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <IconCheck size={20} stroke={2} />}
        <span>{saving ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}</span>
      </button>

      {/* Footer infos serveur */}
      <footer className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-space-xs text-on-surface-variant">
        <div className="flex items-center gap-space-2xs">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <p className="font-body text-label-md uppercase font-semibold text-on-surface">Architecture Serveur</p>
        </div>
        <p className="font-body text-body-sm">
          Supabase PostgreSQL + Cloudinary Free-tier. Budget optimisé 25 000 FCFA.
        </p>
        <div className="flex items-center justify-between font-body text-label-sm">
          <span>Latence Yaoundé ~42ms</span>
          <span>SSL TLS 1.3</span>
        </div>
      </footer>
    </div>
  );
}

function SectionHeader({ title, tag }) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="font-display text-headline-md text-on-surface">{title}</h2>
      <span className="font-body text-label-sm text-on-surface-variant">{tag}</span>
    </div>
  );
}
