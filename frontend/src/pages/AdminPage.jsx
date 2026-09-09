/**
 * AdminPage — Shell admin avec navigation par onglets
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  IconLayoutDashboard, IconUsers, IconPhoto,
  IconSettings, IconLogout, IconShieldHalf,
} from '@tabler/icons-react';
import useAuthStore from '@/store/authStore';
import Dashboard from '@/components/Admin/Dashboard';
import GuestList from '@/components/Admin/GuestList';
import MediaGallery from '@/components/Admin/MediaGallery';
import Settings from '@/components/Admin/Settings';
import { useToast } from '@/components/Shared/Toast';
import { authAPI } from '@/utils/api';

const TABS = [
  { key: 'dashboard',  label: "Vue d'ensemble", Icon: IconLayoutDashboard },
  { key: 'guests',     label: 'Invités',        Icon: IconUsers           },
  { key: 'media',      label: 'Médiathèque',    Icon: IconPhoto           },
  { key: 'settings',   label: 'Paramètres',     Icon: IconSettings        },
];

export default function AdminPage() {
  const { section } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { clearAdminAuth } = useAuthStore();

  const [activeTab, setActiveTab] = useState(section || 'dashboard');

  const handleTabChange = (key) => {
    setActiveTab(key);
    navigate(`/admin/${key}`, { replace: true });
  };

  const handleLogout = async () => {
    try { await authAPI.logout(); } catch { /* silencieux */ }
    clearAdminAuth();
    toast.info('Déconnecté');
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col pt-safe pb-safe">
      {/* ── Header admin ── */}
      <header className="px-screen-gutter py-space-sm border-b border-hairline border-surface-container-high bg-surface/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center justify-between mb-space-sm">
          <div className="flex items-center gap-space-xs">
            <IconShieldHalf size={18} className="text-primary" stroke={1.5} />
            <span className="font-body text-label-sm uppercase tracking-wider text-primary font-semibold">
              Concierge VIP · Espace Sécurisé
            </span>
          </div>
          <div className="flex items-center gap-space-xs">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-body text-label-sm text-secondary">Flux direct</span>
            <button
              onClick={handleLogout}
              aria-label="Se déconnecter"
              className="ml-space-xs w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary hover:text-error transition-colors"
            >
              <IconLogout size={16} stroke={1.5} />
            </button>
          </div>
        </div>

        {/* Onglets navigation */}
        <div className="flex items-center gap-space-xs overflow-x-auto no-scrollbar py-1">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={[
                'h-9 px-4 rounded-xl flex items-center gap-1.5 shrink-0',
                'font-body text-label-md tracking-wider uppercase',
                'transition-all duration-150',
                activeTab === key
                  ? 'bg-on-surface text-surface shadow-sm'
                  : 'bg-surface-container-low text-secondary hover:text-on-surface',
              ].join(' ')}
            >
              <Icon size={14} stroke={activeTab === key ? 2 : 1.5} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* ── Contenu ── */}
      <main className="flex-1 overflow-y-auto px-screen-gutter py-space-lg">
        <div className="max-w-4xl mx-auto">
          {activeTab === 'dashboard' && (
            <Dashboard onTabChange={handleTabChange} />
          )}
          {activeTab === 'guests' && <GuestList />}
          {activeTab === 'media'  && <MediaGallery />}
          {activeTab === 'settings' && <Settings />}
        </div>
      </main>
    </div>
  );
}
