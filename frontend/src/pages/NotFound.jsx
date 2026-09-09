/**
 * NotFound — Page 404 élégante
 */
import { useNavigate } from 'react-router-dom';
import { IconDiamond, IconArrowLeft } from '@tabler/icons-react';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-screen-gutter text-center gap-space-lg pt-safe pb-safe">
      <div className="w-20 h-20 rounded-full bg-primary-fixed flex items-center justify-center">
        <IconDiamond size={36} className="text-primary" stroke={1} />
      </div>
      <div>
        <p className="font-body text-label-sm uppercase tracking-widest text-primary mb-space-xs">
          Erreur 404
        </p>
        <h1 className="font-display text-headline-lg text-on-surface">Page introuvable</h1>
        <p className="font-body text-body-md text-secondary mt-space-sm max-w-xs mx-auto">
          Cette page n&apos;existe pas. Scannez le QR code de votre table pour accéder à la galerie.
        </p>
      </div>
      <button onClick={() => navigate(-1)} className="btn-primary max-w-xs">
        <IconArrowLeft size={18} stroke={1.5} />
        <span>Retour</span>
      </button>
    </div>
  );
}
