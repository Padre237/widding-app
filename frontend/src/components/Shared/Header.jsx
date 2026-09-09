/**
 * Header — Composant partagé
 * Barre de navigation supérieure fixe, style luxe crème/orange brûlé
 */
import { IconChevronLeft, IconUser, IconDiamond } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@/store/authStore';

export default function Header({
  title = 'Notre Mariage',
  subtitle,
  showBack = false,
  onBack,
  rightSlot,        // contenu React optionnel côté droit
  transparent = false,
  darkMode = false,  // pour le scanner (fond sombre)
}) {
  const navigate = useNavigate();
  const { guestData, tableNumber } = useAuthStore();

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  const subtitleText = subtitle
    || (tableNumber ? `Table ${tableNumber} · Galerie` : null);

  return (
    <header
      className={[
        'fixed top-0 w-full z-50 pt-safe',
        transparent
          ? 'bg-transparent'
          : darkMode
            ? 'bg-inverse-surface/90 backdrop-blur-xl'
            : 'bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.03)]',
      ].join(' ')}
    >
      <div className="h-16 px-screen-gutter flex items-center justify-between gap-space-xs">

        {/* ── Zone gauche : logo ou bouton retour ── */}
        <div className="flex items-center gap-space-sm min-w-0">
          {showBack ? (
            <button
              onClick={handleBack}
              aria-label="Retour"
              className="touch-target -ml-2 flex items-center justify-center text-on-surface hover:text-primary transition-colors"
            >
              <IconChevronLeft size={22} stroke={1.5} />
            </button>
          ) : (
            <div className="flex items-center gap-space-xs shrink-0">
              <IconDiamond
                size={20}
                className="text-primary shrink-0"
                stroke={1.5}
              />
            </div>
          )}

          <div className="flex flex-col min-w-0">
            <span
              className={[
                'font-display text-headline-sm leading-tight truncate',
                darkMode ? 'text-inverse-on-surface' : 'text-on-surface',
              ].join(' ')}
            >
              {title}
            </span>
            {subtitleText && (
              <span className="font-body text-label-sm uppercase tracking-widest text-primary truncate">
                {subtitleText}
              </span>
            )}
          </div>
        </div>

        {/* ── Zone droite ── */}
        <div className="flex items-center gap-space-xs shrink-0">
          {rightSlot ?? (
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <IconUser size={16} className="text-on-primary" stroke={1.5} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
