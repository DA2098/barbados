import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, api } from '../services/api';
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
const TAB_LOCAL_LOGOUT_KEY = 'barbados_tab_local_logout';
const IDLE_TIMEOUT_SECONDS = 300;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('auth_user');
    const tabLoggedOut = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(TAB_LOCAL_LOGOUT_KEY);
    return saved && !tabLoggedOut ? JSON.parse(saved) : null;
  });
  const [sessionExitReason, setSessionExitReason] = useState<SessionExitReason>(null);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const clearSessionExitReason = () => {
    setSessionExitReason(null);
  };

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
    setTabLocalLogout();
    setUser(null);
    setSessionExitReason(reason);
  };

  const performLocalLogout = (reason: SessionExitReason = null) => {
    const targetUserId = userRef.current?.id;
    if (targetUserId) {
      void api.logout(targetUserId).catch(() => {
        // Avoid blocking local logout if backend is temporarily unavailable.
      });
    }

    setUser(null);
    localStorage.removeItem('auth_user');
    clearTabLocalLogout();
    setSessionExitReason(reason);
  };

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'auth_user') return;
      const tabLoggedOut = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(TAB_LOCAL_LOGOUT_KEY);
      if (tabLoggedOut) return;
      const savedUser = event.newValue ? (JSON.parse(event.newValue) as User) : null;
      setUser(savedUser);
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

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
    if (!userRef.current) return;
    try {
      const users = await api.getUsers();
      const freshUser = users.find((u) => u.id === userRef.current?.id);
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
    setUser(u);
    localStorage.setItem('auth_user', JSON.stringify(u));
    clearSessionExitReason();
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

  const reclaimSession = () => {
    // Duplicate-session flow disabled intentionally.
  };

  const allowBothSessions = () => {
    // Duplicate-session flow disabled intentionally.
  };

  const trackSessionDecision = () => {
    // Duplicate-session flow disabled intentionally.
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        logoutLocal,
        updateUser,
        duplicatedSession: null,
        reclaimSession,
        allowBothSessions,
        trackSessionDecision,
        sessionExitReason,
        clearSessionExitReason
      }}
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
