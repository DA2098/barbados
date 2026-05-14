import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, api } from '../services/api';
import { useRealtimeUserEvents } from '../hooks/useRealtimeUserEvents';

interface AuthContextType {
  user: User | null;
  login: (u: User) => void;
  logout: () => void;
  updateUser: (u: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'auth_user') return;
      const savedUser = event.newValue ? (JSON.parse(event.newValue) as User) : null;
      setUser(savedUser);
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

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
    setUser(u);
    localStorage.setItem('auth_user', JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
  };

  const updateUser = (u: User) => {
    setUser(u);
    localStorage.setItem('auth_user', JSON.stringify(u));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};