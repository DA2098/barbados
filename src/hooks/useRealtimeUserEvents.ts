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
  const apiBase = (() => {
    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    const fallback = isLocal
      ? 'http://localhost:3000/api'
      : 'https://barbados-api.onrender.com/api';
    const trimmed = env?.VITE_API_URL?.trim();
    if (!trimmed) return fallback;

    try {
      const parsed = new URL(trimmed, window.location.origin);
      if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname) {
        const hasApiPath = parsed.pathname !== '/' && parsed.pathname !== '';
        const resolvedPath = hasApiPath ? parsed.pathname : '/api';
        return `${parsed.origin}${resolvedPath}${parsed.search}`.replace(/\/$/, '');
      }
      return fallback;
    } catch {
      return fallback;
    }
  })();

  const onSyncRef = useRef(onSync);
  const lastPayloadRef = useRef<RealtimeSyncPayload | null>(null);

  useEffect(() => {
    onSyncRef.current = onSync;
  }, [onSync]);

  useEffect(() => {
    if (!enabled || !userId) return;
    let stopped = false;
    let ws: WebSocket | null = null;
    let source: EventSource | null = null;
    let reconnectTimer: number | null = null;

    const connectSSE = () => {
      const url = new URL(apiBase, window.location.origin);
      url.searchParams.set('action', 'realtime');
      url.searchParams.set('userId', userId);

      source = new EventSource(url.toString());
      source.addEventListener('sync', handleSync as EventListener);
      source.addEventListener('heartbeat', handleHeartbeat as EventListener);
      source.onerror = () => {
        source?.close();
        source = null;
        if (!stopped && reconnectTimer === null) {
          reconnectTimer = window.setTimeout(() => {
            reconnectTimer = null;
            connectSSE();
          }, 2000);
        }
      };
    };

    const connectWS = () => {
      try {
        const parsed = new URL(apiBase);
        const wsProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${parsed.host}/ws?userId=${encodeURIComponent(userId)}`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          // nothing
        };

        ws.onmessage = (ev) => {
          try {
            const obj = JSON.parse(ev.data);
            if (obj && obj.type === 'sync' && obj.payload) {
              const payload = obj.payload as RealtimeSyncPayload;
              lastPayloadRef.current = payload;
              onSyncRef.current(payload);
            }
          } catch {
            // ignore
          }
        };

        ws.onclose = () => {
          ws = null;
          if (!stopped) {
            // fallback to SSE
            connectSSE();
          }
        };

        ws.onerror = () => {
          try { ws?.close(); } catch {}
        };
      } catch {
        connectSSE();
      }
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

    // Try WebSocket first, then fallback to SSE
    connectWS();

    return () => {
      stopped = true;
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      try { ws?.close(); } catch {}
      ws = null;
      source?.removeEventListener('sync', handleSync as EventListener);
      source?.removeEventListener('heartbeat', handleHeartbeat as EventListener);
      try { source?.close(); } catch {}
      source = null;
    };
  }, [userId, enabled]);
}