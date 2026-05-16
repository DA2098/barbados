import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, api } from '../services/api';
import { useRealtimeUserEvents } from '../hooks/useRealtimeUserEvents';

type DuplicatedSessionState = {
  secondsLeft: number;
};

interface AuthContextType {
  user: User | null;
  login: (u: User) => void;
  logout: () => void;
  updateUser: (u: User) => void;
  duplicatedSession: DuplicatedSessionState | null;
  reclaimSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_LOCK_PREFIX = 'auth_session_lock_';
const SESSION_META_KEY = 'auth_session_meta';
const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const DUPLICATE_SESSION_GRACE_SECONDS = Math.max(10, Number(env?.VITE_DUPLICATE_SESSION_GRACE_SECONDS || '45'));

const getLockKey = (userId: string) => `${SESSION_LOCK_PREFIX}${userId}`;

const createSessionId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [duplicatedSession, setDuplicatedSession] = useState<DuplicatedSessionState | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const duplicateDeadlineRef = useRef<number | null>(null);

  const persistSessionMeta = (userId: string, sessionId: string) => {
    localStorage.setItem(
      SESSION_META_KEY,
      JSON.stringify({ userId, sessionId, startedAt: new Date().toISOString() })
    );
  };

  const writeSessionLock = (userId: string, sessionId: string) => {
    localStorage.setItem(
      getLockKey(userId),
      JSON.stringify({ sessionId, lastSeenAt: new Date().toISOString() })
    );
  };

  const clearDuplicateState = () => {
    duplicateDeadlineRef.current = null;
    setDuplicatedSession(null);
  };

  const startDuplicateCountdown = () => {
    duplicateDeadlineRef.current = Date.now() + DUPLICATE_SESSION_GRACE_SECONDS * 1000;
    setDuplicatedSession({ secondsLeft: DUPLICATE_SESSION_GRACE_SECONDS });
  };

  const reclaimSession = () => {
    if (!user) return;
    const nextSessionId = createSessionId();
    sessionIdRef.current = nextSessionId;
    persistSessionMeta(user.id, nextSessionId);
    writeSessionLock(user.id, nextSessionId);
    clearDuplicateState();
  };

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'auth_user') {
        const savedUser = event.newValue ? (JSON.parse(event.newValue) as User) : null;
        setUser(savedUser);
        return;
      }

      if (!user || !sessionIdRef.current) return;
      if (event.key !== getLockKey(user.id)) return;
      if (!event.newValue) return;

      try {
        const incoming = JSON.parse(event.newValue) as { sessionId?: string };
        if (!incoming.sessionId) return;
        if (incoming.sessionId === sessionIdRef.current) return;
        startDuplicateCountdown();
      } catch {
        // Ignore malformed storage payloads from old clients.
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [user]);

  useEffect(() => {
    if (!user) {
      sessionIdRef.current = null;
      clearDuplicateState();
      return;
    }

    const rawMeta = localStorage.getItem(SESSION_META_KEY);
    let existingSessionId: string | null = null;

    if (rawMeta) {
      try {
        const parsed = JSON.parse(rawMeta) as { userId?: string; sessionId?: string };
        if (parsed.userId === user.id && parsed.sessionId) {
          existingSessionId = parsed.sessionId;
        }
      } catch {
        // Fall through to create a clean session id.
      }
    }

    const activeSessionId = existingSessionId || createSessionId();
    sessionIdRef.current = activeSessionId;
    persistSessionMeta(user.id, activeSessionId);
    writeSessionLock(user.id, activeSessionId);
  }, [user?.id]);

  useEffect(() => {
    if (!user || !sessionIdRef.current) return;

    const heartbeat = window.setInterval(() => {
      if (!user || !sessionIdRef.current) return;
      writeSessionLock(user.id, sessionIdRef.current);
    }, 4000);

    return () => {
      window.clearInterval(heartbeat);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!duplicatedSession) return;

    const ticker = window.setInterval(() => {
      if (!duplicateDeadlineRef.current) return;
      const secondsLeft = Math.max(0, Math.ceil((duplicateDeadlineRef.current - Date.now()) / 1000));

      if (secondsLeft <= 0) {
        setDuplicatedSession({ secondsLeft: 0 });
        localStorage.removeItem('auth_user');
        localStorage.removeItem(SESSION_META_KEY);
        if (user?.id) {
          localStorage.removeItem(getLockKey(user.id));
        }
        setUser(null);
        clearDuplicateState();
        return;
      }

      setDuplicatedSession({ secondsLeft });
    }, 1000);

    return () => {
      window.clearInterval(ticker);
    };
  }, [duplicatedSession, user?.id]);

  useRealtimeUserEvents(user?.id, async () => {
    if (!user) return;
    try {
      const users = await api.getUsers();
      const freshUser = users.find((u) => u.id === user.id);
      if (!freshUser) return;

      setUser((prev) => {
        if (!prev) return prev;
        const changed =
          prev.name !== freshUser.name ||
          prev.phone !== freshUser.phone ||
          prev.avatar_url !== freshUser.avatar_url ||
          prev.role !== freshUser.role ||
          prev.barber_approved !== freshUser.barber_approved;

        if (!changed) return prev;
        localStorage.setItem('auth_user', JSON.stringify(freshUser));
        return freshUser;
      });
    } catch {
      // Keep current session data if sync fetch fails.
    }
  }, !!user);

  const login = (u: User) => {
    const nextSessionId = createSessionId();
    sessionIdRef.current = nextSessionId;
    setUser(u);
    localStorage.setItem('auth_user', JSON.stringify(u));
    persistSessionMeta(u.id, nextSessionId);
    writeSessionLock(u.id, nextSessionId);
    clearDuplicateState();
  };

  const logout = () => {
    const currentUserId = user?.id;
    setUser(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem(SESSION_META_KEY);
    if (currentUserId) {
      localStorage.removeItem(getLockKey(currentUserId));
    }
    sessionIdRef.current = null;
    clearDuplicateState();
  };

  const updateUser = (u: User) => {
    setUser(u);
    localStorage.setItem('auth_user', JSON.stringify(u));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, duplicatedSession, reclaimSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};