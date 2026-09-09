/**
 * BottomNav — Barre de navigation inférieure fixe
 * 4 onglets : Galerie | Vidéo | Audio | Vœux
 */
import { useNavigate, useLocation } from 'react-router-dom';
import {
  IconPhoto,
  IconVideo,
  IconMicrophone,
  IconHeart,
} from '@tabler/icons-react';
import useAuthStore from '@/store/authStore';

const NAV_ITEMS = [
  {
    path: 'galerie',
    label: 'Galerie',
    Icon: IconPhoto,
    buildHref: (table) => `/table/${table}`,
  },
  {
    path: 'video',
    label: 'Vidéo',
    Icon: IconVideo,
    buildHref: (table) => `/table/${table}/video`,
  },
  {
    path: 'audio',
    label: 'Audio',
    Icon: IconMicrophone,
    buildHref: (table) => `/table/${table}/audio`,
  },
  {
    path: 'voeux',
    label: 'Vœux',
    Icon: IconHeart,
    buildHref: (table) => `/table/${table}/voeux`,
  },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tableNumber } = useAuthStore();

  const currentPath = location.pathname;

  // Déterminer l'onglet actif
  const getIsActive = (item) => {
    if (item.path === 'galerie') {
      return (
        currentPath === `/table/${tableNumber}` ||
        currentPath === `/table/${tableNumber}/`
      );
    }
    return currentPath.includes(`/${item.path}`);
  };

  return (
    <nav
      className="fixed bottom-0 w-full z-50 pb-safe bg-surface/85 backdrop-blur-xl shadow-[0_-2px_12px_rgba(44,44,42,0.04)]"
      aria-label="Navigation principale"
    >
      <div className="flex justify-around items-center h-20 px-space-xs">
        {NAV_ITEMS.map(({ path, label, Icon, buildHref }) => {
          const isActive = getIsActive({ path });
          return (
            <button
              key={path}
              onClick={() => navigate(buildHref(tableNumber || 1))}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'flex flex-col items-center justify-center gap-[3px]',
                'min-h-touch-target-min min-w-touch-target-min',
                'px-space-xs py-space-2xs',
                'transition-colors duration-150',
                isActive
                  ? 'text-primary'
                  : 'text-secondary hover:text-on-surface',
              ].join(' ')}
            >
              <Icon
                size={22}
                stroke={isActive ? 2 : 1.5}
                className="transition-all"
              />
              <span
                className={[
                  'font-body text-label-sm uppercase tracking-wider',
                  isActive ? 'font-semibold' : '',
                ].join(' ')}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
