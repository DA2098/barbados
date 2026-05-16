import { HashRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';

// Componentes y Páginas
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import StaffLogin from './pages/StaffLogin';
import Register from './pages/Register';
import Store from './pages/Store';
import Appointments from './pages/Appointments';
import Cart from './pages/Cart';
import Profile from './pages/Profile';
import PaymentReturn from './pages/PaymentReturn';
import Invoices from './pages/Invoices';
import BarberPanel from './pages/BarberPanel';
import AdminPanel from './pages/AdminPanel';
import Chat from './pages/Chat';

function SessionConflictNotice() {
  const { user, duplicatedSession, reclaimSession, logoutLocal, trackSessionDecision } = useAuth();
  const location = useLocation();

  if (!user || !duplicatedSession) return null;

  const hiddenPaths = ['/login', '/register', '/acceso-privado'];
  if (hiddenPaths.includes(location.pathname)) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-80 w-[92%] max-w-md -translate-x-1/2 rounded-2xl border border-red-400/40 bg-linear-to-r from-red-600/20 to-red-500/10 p-5 shadow-2xl backdrop-blur-md">
      <div className="mb-3">
        <p className="text-sm font-bold text-red-200 flex items-center gap-2">
          <span>⚠️</span> Sesión Duplicada
        </p>
      </div>
      <p className="text-sm text-contrast leading-relaxed mb-3">
        Tu cuenta está activa en otro dispositivo. ¿Qué deseas hacer?
      </p>
      <p className="text-xs font-semibold text-red-200/80 mb-3 flex items-center gap-2">
        <span>⏱️</span> Cierre automático en {duplicatedSession.secondsLeft}s
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            if (!confirm('¿Mantener esta sesión? La otra se cerrará.')) return;
            trackSessionDecision?.('keep');
            reclaimSession();
          }}
          className="flex-1 accent-btn px-3 py-2 text-sm font-bold rounded-lg transition-all hover:shadow-lg active:scale-95"
        >
          ✓ Mantener aquí
        </button>
        <button
          type="button"
          onClick={() => {
            if (!confirm('¿Cerrar esta sesión?')) return;
            trackSessionDecision?.('other');
            logoutLocal();
            window.location.href = '/#/login';
          }}
          className="flex-1 btn-danger px-3 py-2 text-sm font-bold rounded-lg transition-all hover:shadow-lg active:scale-95"
        >
          ✕ Cerrar
        </button>
      </div>
    </div>
  );
}

function SessionConflictModal() {
  const { user, duplicatedSession, reclaimSession, logoutLocal, trackSessionDecision } = useAuth();
  const location = useLocation();

  if (!user || !duplicatedSession) return null;

  // Show modal for admin/barber panels (sensitive areas)
  const showModal = user.role === 'admin' || user.role === 'barber' || location.pathname.startsWith('/admin') || location.pathname.startsWith('/barber');
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-90 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative z-10 w-[92%] max-w-md bg-surface border border-red-400/30 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">⚠️</div>
          <h3 className="text-xl font-bold text-contrast mb-2">Sesión Duplicada</h3>
          <p className="text-sm text-contrast/75">Tu cuenta está activa en otro dispositivo</p>
        </div>
        
        <div className="bg-red-500/10 border border-red-400/20 rounded-lg p-3 mb-6">
          <p className="text-sm text-red-200 font-semibold">
            ⏱️ Cierre automático en <span className="text-lg font-bold">{duplicatedSession.secondsLeft}s</span>
          </p>
        </div>

        <p className="text-sm text-contrast mb-6 leading-relaxed">
          Para proteger tu cuenta, elige una opción:
        </p>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              if (!confirm('¿Mantener esta sesión activa aquí? La otra sesión se cerrará.')) return;
              trackSessionDecision?.('keep');
              reclaimSession();
            }}
            className="w-full px-4 py-3 accent-btn font-bold rounded-lg transition-all hover:shadow-lg active:scale-95"
          >
            ✓ Mantener aquí
          </button>
          <button
            type="button"
            onClick={() => {
              if (!confirm('¿Cerrar esta sesión? La otra sesión seguirá activa.')) return;
              trackSessionDecision?.('other');
              logoutLocal();
              window.location.href = '/#/login';
            }}
            className="w-full px-4 py-3 btn-danger font-bold rounded-lg transition-all hover:shadow-lg active:scale-95"
          >
            ✕ Cerrar Sección
          </button>
        </div>
      </div>
    </div>
  );
}

function AppShell() {
  const { sessionExitReason, clearSessionExitReason } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionExitReason) return;
    navigate('/');
    clearSessionExitReason();
  }, [sessionExitReason, navigate, clearSessionExitReason]);

  return (
    <div style={{ backgroundColor: 'var(--bg)' }} className="min-h-screen text-contrast font-sans">
      <Navbar />
      <SessionConflictNotice />
      <SessionConflictModal />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/acceso-privado" element={<StaffLogin />} />
          <Route path="/register" element={<Register />} />
          <Route path="/store" element={<Store />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/payments/return" element={<PaymentReturn />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/barber" element={<BarberPanel />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/chat" element={<Chat />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <ToastProvider>
            <Router>
              <AppShell />
            </Router>
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;