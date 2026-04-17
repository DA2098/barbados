import { useEffect, useRef } from 'react';

export type RealtimeSyncPayload = {
  unreadCount: number;
  latestConversationTs: number;
  avatarPulse: number;
  signature: string;
  serverTime: string;
};

export function useRealtimeUserEvents(
  userId: string | undefined,
  onSync: (payload: RealtimeSyncPayload) => void,
  enabled: boolean = true
) {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const apiBase = env?.VITE_API_URL?.trim() || '/api.php';

  const onSyncRef = useRef(onSync);
  const lastPayloadRef = useRef<RealtimeSyncPayload | null>(null);

  useEffect(() => {
    onSyncRef.current = onSync;
  }, [onSync]);

  useEffect(() => {
    if (!enabled || !userId) return;

    const url = new URL(apiBase, window.location.origin);
    url.searchParams.set('action', 'realtime');
    url.searchParams.set('userId', userId);

    let source: EventSource | null = null;
    let reconnectTimer: number | null = null;
    let stopped = false;

    const connect = () => {
      if (stopped) return;

      source = new EventSource(url.toString());

      source.addEventListener('sync', handleSync as EventListener);
      source.addEventListener('heartbeat', handleHeartbeat as EventListener);
      source.onerror = () => {
        source?.close();
        source = null;

        if (!stopped && reconnectTimer === null) {
          reconnectTimer = window.setTimeout(() => {
            reconnectTimer = null;
            connect();
          }, 2000);
        }
      };
    };

    const handleSync = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as RealtimeSyncPayload;
        lastPayloadRef.current = payload;
        onSyncRef.current(payload);
      } catch {
        // Ignore malformed payloads and keep stream alive.
      }
    };

    const handleHeartbeat = () => {
      const fallbackPayload: RealtimeSyncPayload =
        lastPayloadRef.current || {
          unreadCount: 0,
          latestConversationTs: 0,
          avatarPulse: 0,
          signature: 'heartbeat',
          serverTime: new Date().toISOString()
        };

      onSyncRef.current(fallbackPayload);
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      source?.removeEventListener('sync', handleSync as EventListener);
      source?.removeEventListener('heartbeat', handleHeartbeat as EventListener);
      source?.close();
      source = null;
    };
  }, [userId, enabled]);
}