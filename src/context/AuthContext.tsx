import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, api, clearSessionConflictFlag, getSessionConflictFlag } from '../services/api';
import { useRealtimeUserEvents } from '../hooks/useRealtimeUserEvents';

type DuplicatedSessionState = {
  secondsLeft: number;
};

type SessionExitReason = 'inactive' | 'duplicate' | null;

interface AuthContextType {
  user: User | null;
  login: (u: User) => void;
  logout: () => void;
  updateUser: (u: User) => void;
  duplicatedSession: DuplicatedSessionState | null;
  reclaimSession: () => void;
  logoutLocal: () => void;
  allowBothSessions: (minutes?: number) => void;
  trackSessionDecision?: (action: 'keep' | 'other' | 'both') => void;
  sessionExitReason: SessionExitReason;
  clearSessionExitReason: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_LOCK_PREFIX = 'auth_session_lock_';
const SESSION_META_KEY = 'auth_session_meta';
const TAB_LOCAL_LOGOUT_KEY = 'barbados_tab_local_logout';
const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const DUPLICATE_SESSION_GRACE_SECONDS = Math.max(10, Number(env?.VITE_DUPLICATE_SESSION_GRACE_SECONDS || '45'));
const IDLE_TIMEOUT_SECONDS = Math.max(60, Number(env?.VITE_IDLE_TIMEOUT_SECONDS || '300'));

const getLockKey = (userId: string) => `${SESSION_LOCK_PREFIX}${userId}`;

const createSessionId = (forceNew = false) => {
  if (!forceNew) {
    try {
      const rawMeta = localStorage.getItem(SESSION_META_KEY);
      if (rawMeta) {
        const parsed = JSON.parse(rawMeta) as { sessionId?: string };
        if (parsed?.sessionId) {
          return String(parsed.sessionId);
        }
      }
    } catch {
      // Continue with a new session id.
    }
  }

  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('auth_user');
    const tabLoggedOut = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(TAB_LOCAL_LOGOUT_KEY);
    return saved && !tabLoggedOut ? JSON.parse(saved) : null;
  });
  const [duplicatedSession, setDuplicatedSession] = useState<DuplicatedSessionState | null>(null);
  const [sessionExitReason, setSessionExitReason] = useState<SessionExitReason>(null);
  const sessionIdRef = useRef<string | null>(null);
  const duplicateDeadlineRef = useRef<number | null>(null);
  const userRef = useRef<User | null>(null);
  const conflictPromptOpenRef = useRef(false);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const persistSessionMeta = (userId: string | null, sessionId: string) => {
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

  const clearSessionExitReason = () => {
    setSessionExitReason(null);
  };

  const isTabLocallyLoggedOut = () => typeof sessionStorage !== 'undefined' && sessionStorage.getItem(TAB_LOCAL_LOGOUT_KEY) === '1';

  const setTabLocalLogout = () => {
    try {
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(TAB_LOCAL_LOGOUT_KEY, '1');
    } catch {
      // ignore
    }
  };

  const clearTabLocalLogout = () => {
    try {
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(TAB_LOCAL_LOGOUT_KEY);
    } catch {
      // ignore
    }
  };

  const performLocalOnlyLogout = (reason: SessionExitReason = null) => {
    // Mark this tab as locally logged out (so other tabs/devices aren't affected).
    setTabLocalLogout();
    setUser(null);
    // Do not clear shared localStorage session metadata or locks here — this action must not
    // affect other tabs or devices. Keep session meta intact so the other device remains active.
    sessionIdRef.current = null;
    clearDuplicateState();
    setSessionExitReason(reason);
    clearSessionConflictFlag();
    // Clear app-specific localStorage keys to remove transient local data (telemetry, cached choices, etc.)
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('barbados_')) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // ignore storage errors
    }

    // Notify other contexts in this tab that a local-only logout occurred so they can clear in-memory state.
    try {
      window.dispatchEvent(new CustomEvent('barbados:local-logout'));
    } catch {
      // ignore
    }
    try {
      window.dispatchEvent(new CustomEvent('barbados:session-decision', { detail: { action: 'other' } }));
    } catch {}
  };

  const performLocalLogout = (reason: SessionExitReason = null) => {
    const targetUserId = user?.id;

    if (targetUserId) {
      void api.logout(targetUserId).catch(() => {
        // Avoid blocking local logout if backend is temporarily unavailable.
      });
    }

    setUser(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem(SESSION_META_KEY);
    if (targetUserId) {
      localStorage.removeItem(getLockKey(targetUserId));
    }
    sessionIdRef.current = null;
    clearDuplicateState();
    setSessionExitReason(reason);
    clearSessionConflictFlag();
    // Ensure any local-only logout flag is cleared on a full logout.
    clearTabLocalLogout();
  };

  // Lightweight telemetry for session decisions. Stores event locally and logs to console.
  const trackSessionDecision = (action: 'keep' | 'other' | 'both') => {
    try {
      const payload = {
        ts: new Date().toISOString(),
        userId: user?.id ?? null,
        action,
        source: 'session_conflict_ui'
      };
      console.info('telemetry.session_decision', payload);
      const raw = localStorage.getItem('barbados_telemetry') || '[]';
      const arr = JSON.parse(raw);
      arr.push(payload);
      localStorage.setItem('barbados_telemetry', JSON.stringify(arr.slice(-200))); // keep last 200
    } catch {
      // ignore telemetry failures
    }
  };

  const allowBothSessions = (minutes?: number) => {
    // User chooses to allow both sessions to remain active.
    // Clear any duplicate countdown for this tab and keep current session active.
    clearDuplicateState();
    try {
      if (user?.id) {
        const ms = (minutes && minutes > 0 ? minutes : 60) * 60 * 1000;
        const expiresAt = Date.now() + ms;
        const choice = { userId: user.id, action: 'both', expiresAt };
        localStorage.setItem('barbados_session_choice', JSON.stringify(choice));
        // Notify UI for toast
        try {
          window.dispatchEvent(new CustomEvent('barbados:session-decision', { detail: { action: 'both', expiresAt } }));
        } catch {}
      }
    } catch {
      // ignore
    }
  };

  const startDuplicateCountdown = () => {
    duplicateDeadlineRef.current = Date.now() + DUPLICATE_SESSION_GRACE_SECONDS * 1000;
    console.warn(`  ✓ Modal/Notice should be visible now (${DUPLICATE_SESSION_GRACE_SECONDS}s countdown)`);
    setDuplicatedSession({ secondsLeft: DUPLICATE_SESSION_GRACE_SECONDS });
  };

  const recoverPersistedConflict = () => {
    const flag = getSessionConflictFlag();
    const currentUser = userRef.current;

    if (!flag || !currentUser || flag.userId !== currentUser.id) return false;

    console.warn('🟡 Recovering persisted session conflict flag');
    startDuplicateCountdown();
    return true;
  };

  const reclaimSession = () => {
    if (!user) return;
    const nextSessionId = createSessionId(true);
    sessionIdRef.current = nextSessionId;
    persistSessionMeta(user.id, nextSessionId);
    writeSessionLock(user.id, nextSessionId);
    clearDuplicateState();
    clearSessionConflictFlag();
    try {
      window.dispatchEvent(new CustomEvent('barbados:session-decision', { detail: { action: 'keep' } }));
    } catch {}
  };

  // Expose safe helpers on `window` for emergency/manual recovery/debugging.
  try {
    (window as any).__barbadosReclaimSession = () => {
      try { reclaimSession(); } catch (e) { console.error('reclaimSession error', e); }
    };

    (window as any).__barbadosPerformLocalOnlyLogout = () => {
      try { performLocalOnlyLogout('duplicate'); } catch (e) { console.error('performLocalOnlyLogout error', e); }
    };
  } catch {}

  useEffect(() => {
    const handleConflict = () => {
      const currentUser = userRef.current;
      console.warn('🟢 Session conflict event received in AuthContext');
      console.warn('  Current user:', currentUser?.id ?? '(none)');
      if (!currentUser) {
        console.warn('  ⚠️  No user logged in, ignoring conflict');
        return;
      }
      // Respect persisted session choice if present
      try {
        const raw = localStorage.getItem('barbados_session_choice');
        if (raw) {
          const parsed = JSON.parse(raw) as { userId?: string; action?: string; expiresAt?: number };
          if (parsed?.userId === currentUser.id && parsed?.action === 'both' && parsed.expiresAt && parsed.expiresAt > Date.now()) {
            // user previously allowed both sessions — do not start countdown
            console.warn('  ℹ️  Both sessions allowed, clearing duplicate state');
            clearDuplicateState();
            return;
          }
        }
      } catch {
        // ignore parse errors
      }

      console.warn(`  ⏱️  Starting countdown: ${DUPLICATE_SESSION_GRACE_SECONDS}s`);
      startDuplicateCountdown();

      // Native blocking confirmation to guarantee visibility, similar to the requested UX
      if (!conflictPromptOpenRef.current) {
        conflictPromptOpenRef.current = true;
        window.setTimeout(() => {
          try {
            const title = 'Sesión duplicada';
            const message = 'Esta cuenta inició sesión en otro dispositivo.\n\n¿Qué deseas hacer?\n\n- Aceptar: Mantener sesión aquí y cerrar la otra.\n- Cancelar: Cerrar sesión aquí para que el otro dispositivo quede activo.';
            const keepHere = window.confirm(`${title}\n\n${message}`);

            if (keepHere) {
              // User chose to keep session on THIS device and close the other
              trackSessionDecision?.('keep');
              reclaimSession();
              // Ensure any persisted conflict markers are cleared
              try { clearSessionConflictFlag(); } catch {}
            } else {
              // User chose to close this session (allow other device to stay active)
              trackSessionDecision?.('other');
              try { performLocalOnlyLogout('duplicate'); } catch { try { logoutLocal(); } catch {} }
              try { clearSessionConflictFlag(); } catch {}
              // redirect to login screen after local-only logout
              try { window.location.hash = '#/login'; } catch {}
            }
          } catch {
            // ignore prompt errors
          } finally {
            conflictPromptOpenRef.current = false;
          }
        }, 0);
      }
    };

    // Register listener once on mount, never remove it
    // The handler closure will always see the current `user` value
    (window as any).__barbadosOnSessionConflict = handleConflict;
    window.addEventListener('barbados:session-conflict', handleConflict as EventListener);
    
    // No cleanup - keep the listener active for the lifetime of the app
    // This prevents race conditions where events are missed during listener re-registration
    return () => {
      if ((window as any).__barbadosOnSessionConflict === handleConflict) {
        delete (window as any).__barbadosOnSessionConflict;
      }
      window.removeEventListener('barbados:session-conflict', handleConflict as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      clearSessionConflictFlag();
      return;
    }

    if (recoverPersistedConflict()) {
      return;
    }
  }, [user?.id]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'auth_user') {
        const tabLoggedOut = isTabLocallyLoggedOut();
        const savedUser = event.newValue ? (JSON.parse(event.newValue) as User) : null;
        // If this tab was explicitly logged out locally, ignore storage updates that would
        // rehydrate `auth_user` in this tab. Other tabs/devices will still receive updates.
        if (tabLoggedOut) return;
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
      clearSessionConflictFlag();
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
    clearSessionConflictFlag();
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
        performLocalLogout('duplicate');
        return;
      }

      setDuplicatedSession({ secondsLeft });
    }, 1000);

    return () => {
      window.clearInterval(ticker);
    };
  }, [duplicatedSession, user?.id]);

  useEffect(() => {
    if (!user) return;

    let timeoutId: number | null = null;

    const resetIdleTimer = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        performLocalLogout('inactive');
      }, IDLE_TIMEOUT_SECONDS * 1000);
    };

    const activityEvents: Array<keyof WindowEventMap> = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        resetIdleTimer();
      }
    };

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, resetIdleTimer, { passive: true });
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    resetIdleTimer();

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, resetIdleTimer);
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user?.id]);

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
    clearSessionExitReason();
    // Clear local-only logout flag when the user logs in on this tab.
    clearTabLocalLogout();
  };

  const logout = () => {
    performLocalLogout(null);
  };

  const logoutLocal = () => {
    performLocalOnlyLogout(null);
  };

  const updateUser = (u: User) => {
    setUser(u);
    localStorage.setItem('auth_user', JSON.stringify(u));
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, logoutLocal, updateUser, duplicatedSession, reclaimSession, allowBothSessions, trackSessionDecision, sessionExitReason, clearSessionExitReason }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};