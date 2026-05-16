import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Toast = { id: string; message: string };

const ToastContext = createContext<{ addToast: (msg: string, timeoutMs?: number) => void } | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, timeoutMs = 4000) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, timeoutMs);
  };

  // Also listen to global session-decision events to show simple toasts
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail as any;
        if (!detail) return;
        if (detail.action === 'both') {
          addToast('Se permitieron ambas sesiones durante ' + (Math.round(((detail.expiresAt || 0) - Date.now()) / 60000) || 60) + ' minutos');
        } else if (detail.action === 'other') {
          addToast('Sesión cerrada en este dispositivo; la otra permanece activa');
        } else if (detail.action === 'keep') {
          addToast('Has reclamado la sesión en este dispositivo');
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('barbados:session-decision', handler as EventListener);
    return () => window.removeEventListener('barbados:session-decision', handler as EventListener);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div style={{ position: 'fixed', right: 16, bottom: 18, zIndex: 9999 }}>
        {toasts.map((t) => (
          <div key={t.id} style={{ background: 'rgba(0,0,0,0.8)', color: 'white', padding: '10px 14px', borderRadius: 8, marginTop: 8, minWidth: 220 }}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export default ToastContext;
