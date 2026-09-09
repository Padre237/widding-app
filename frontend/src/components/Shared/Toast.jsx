/**
 * Système Toast — notifications légères
 * Utilisé via useToast() hook dans toute l'app
 */
import { createContext, useContext, useState, useCallback } from 'react';
import {
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconInfoCircle,
} from '@tabler/icons-react';

// ── Context ───────────────────────────────────────────────────────────────
const ToastContext = createContext(null);

// ── Provider ──────────────────────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Container toasts */}
      <div
        className="toast-container"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast doit être utilisé dans <ToastProvider>');

  return {
    success: (msg, duration)  => ctx.addToast(msg, 'success', duration),
    error:   (msg, duration)  => ctx.addToast(msg, 'error',   duration || 5000),
    warning: (msg, duration)  => ctx.addToast(msg, 'warning', duration),
    info:    (msg, duration)  => ctx.addToast(msg, 'info',    duration),
  };
}

// ── Composant Toast individuel ────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  const config = {
    success: {
      bg: 'bg-success',
      Icon: IconCheck,
    },
    error: {
      bg: 'bg-error',
      Icon: IconX,
    },
    warning: {
      bg: 'bg-primary-container',
      Icon: IconAlertTriangle,
    },
    info: {
      bg: 'bg-inverse-surface',
      Icon: IconInfoCircle,
    },
  };

  const { bg, Icon } = config[type] || config.info;

  return (
    <div
      role="alert"
      className={[
        'toast',
        bg,
        'text-white animate-enter',
      ].join(' ')}
    >
      <Icon size={18} stroke={2} className="shrink-0" />
      <span className="flex-1 font-body text-body-md">{message}</span>
      <button
        onClick={onClose}
        aria-label="Fermer"
        className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
      >
        <IconX size={16} stroke={2} />
      </button>
    </div>
  );
}
