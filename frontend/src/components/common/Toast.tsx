import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import {
  CheckCircleIcon,
  AlertCircleIcon,
  InfoIcon,
} from './icons';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const TOAST_ICONS: Record<ToastType, ReactNode> = {
  success: <CheckCircleIcon size={18} />,
  error: <AlertCircleIcon size={18} />,
  info: <InfoIcon size={18} />,
};

const TOAST_DURATION = 4200;

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [leaving, setLeaving] = useState<number[]>([]);

  const removeToast = useCallback((id: number) => {
    setLeaving((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setTimeout(() => {
      setLeaving((prev) => prev.filter((x) => x !== id));
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 260);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => removeToast(id), TOAST_DURATION);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type}${leaving.includes(toast.id) ? ' toast-leaving' : ''}`}
            role="status"
            onClick={() => removeToast(toast.id)}
          >
            <span className="toast-icon">{TOAST_ICONS[toast.type]}</span>
            <span className="toast-message">{toast.message}</span>
            <button
              className="toast-close"
              aria-label="Dismiss"
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
            >
              &times;
            </button>
            <span
              className="toast-progress"
              style={{ animationDuration: `${TOAST_DURATION}ms` }}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
