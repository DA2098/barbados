import React, { useEffect, useState, useRef } from 'react';
import { api, AppNotification } from '../services/api';
import { useAuth } from '../context/AuthContext';

function relativeTimeSince(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  } catch {
    return '';
  }
}

type Props = {
  userId?: string | null;
  maxItems?: number;
};

export default function NotificationsList({ userId, maxItems = 50 }: Props) {
  const { user } = useAuth();
  const uid = userId ?? user?.id;
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const mounted = useRef(true);

  const load = async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const nots = await api.getNotifications(uid);
      if (!mounted.current) return;
      setItems(nots.slice(0, maxItems));
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => { mounted.current = false; };
  }, [uid]);

  const markRead = async (id?: string) => {
    if (!uid) return;
    try {
      if (id) await api.markNotificationsRead(uid, false, id);
      else await api.markNotificationsRead(uid, true);
      await load();
    } catch {}
  };

  if (!uid) return null;

  return (
    <div className="glass-card p-3 rounded-md">
      <div className="flex items-center justify-between mb-2">
        <strong className="text-contrast">Notificaciones</strong>
        <div className="flex items-center gap-2">
          <button onClick={() => void load()} className="muted text-sm">Actualizar</button>
          <button onClick={() => void markRead()} className="accent-btn px-3 py-1 rounded text-sm">Marcar todas</button>
        </div>
      </div>
      {loading ? (
        <div className="muted">Cargando...</div>
      ) : items.length === 0 ? (
        <div className="muted">Sin notificaciones.</div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id} className={`p-2 rounded-md border ${n.isRead ? 'bg-white/5 border-white/5' : 'bg-white/10 border-white/10'}`}>
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1">
                  <div className="font-semibold text-contrast">{n.title}</div>
                  <div className="text-sm muted">{n.body}</div>
                </div>
                <div className="text-right ml-2">
                  <div className="text-xs muted">{relativeTimeSince(n.createdAt)}</div>
                  {!n.isRead && (
                    <button onClick={() => void markRead(n.id)} className="text-xs accent-link mt-1">Marcar leído</button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
