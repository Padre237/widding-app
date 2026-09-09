/**
 * LoadingSpinner + Squelettes de chargement
 * Utilisés dans toute l'app pour les états de chargement
 */

// ── Spinner principal ────────────────────────────────────────────────────
export function LoadingSpinner({ size = 32, className = '' }) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      role="status"
      aria-label="Chargement en cours"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        className="animate-spin text-primary"
        fill="none"
      >
        <circle
          cx="18" cy="18" r="15"
          stroke="currentColor"
          strokeOpacity="0.15"
          strokeWidth="3"
        />
        <path
          d="M18 3 a15 15 0 0 1 15 15"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

// ── Plein écran ──────────────────────────────────────────────────────────
export function FullPageLoader({ message = 'Chargement...' }) {
  return (
    <div className="fixed inset-0 bg-surface flex flex-col items-center justify-center gap-space-md z-50">
      <LoadingSpinner size={40} />
      <p className="font-body text-body-md text-secondary">{message}</p>
    </div>
  );
}

// ── Squelette carte média ────────────────────────────────────────────────
export function MediaCardSkeleton() {
  return (
    <div className="flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm">
      {/* Image placeholder */}
      <div className="w-full aspect-portrait bg-surface-container animate-pulse" />
      {/* Texte placeholder */}
      <div className="p-space-xs flex flex-col gap-1.5">
        <div className="h-3 w-3/4 bg-surface-container rounded animate-pulse" />
        <div className="h-2.5 w-1/2 bg-surface-container-high rounded animate-pulse" />
      </div>
    </div>
  );
}

// ── Grille de squelettes ─────────────────────────────────────────────────
export function GallerySkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-2 gap-3 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <MediaCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ── Squelette ligne tableau ──────────────────────────────────────────────
export function TableRowSkeleton({ cols = 4 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-3 px-3">
          <div className="h-4 bg-surface-container rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

// ── Squelette stat card ──────────────────────────────────────────────────
export function StatCardSkeleton() {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
      <div className="h-4 w-1/2 bg-surface-container rounded animate-pulse mb-2" />
      <div className="h-8 w-1/3 bg-surface-container rounded animate-pulse mb-3" />
      <div className="h-1.5 w-full bg-surface-container rounded-full animate-pulse" />
    </div>
  );
}

// ── Toast / Notification inline ──────────────────────────────────────────
export function InlineMessage({ type = 'info', message, className = '' }) {
  const styles = {
    info:    'bg-surface-container text-on-surface-variant',
    success: 'bg-green-50 text-green-800 border border-green-200',
    error:   'bg-error-container text-on-error-container border border-red-200',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200',
  };

  return (
    <div
      role="alert"
      className={[
        'w-full px-space-md py-space-sm rounded-lg',
        'font-body text-body-md',
        styles[type],
        className,
      ].join(' ')}
    >
      {message}
    </div>
  );
}

// ── Overlay de progression upload ────────────────────────────────────────
export function UploadProgress({ progress = 0, fileName = '', fileSize = '' }) {
  return (
    <div className="flex flex-col gap-space-2xs p-space-sm rounded-xl bg-surface-container-low shadow-sm">
      <div className="flex justify-between items-center">
        <span className="font-body text-label-md uppercase tracking-wider text-on-surface-variant flex items-center gap-space-2xs">
          <span className="w-2 h-2 rounded-full bg-primary animate-spin inline-block" />
          Téléversement en cours
        </span>
        <span className="font-body text-label-lg text-primary font-semibold">
          {progress}%
        </span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      {(fileName || fileSize) && (
        <div className="flex justify-between text-secondary font-body text-label-sm">
          <span className="truncate max-w-[60%]">{fileName}</span>
          <span>{fileSize}</span>
        </div>
      )}
    </div>
  );
}

export default LoadingSpinner;
