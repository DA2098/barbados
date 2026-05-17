import { HashRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
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

function SessionConflictModal() {
  const { user, duplicatedSession, reclaimSession, logoutLocal, trackSessionDecision } = useAuth();

  if (!user || !duplicatedSession) return null;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />
      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-red-400/30 bg-surface p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 text-4xl">
            ⚠️
          </div>
          <h3 className="text-2xl font-extrabold text-contrast">Sesión Duplicada</h3>
          <p className="mt-2 text-sm text-contrast/75">Tu cuenta está activa en otro dispositivo</p>
        </div>

        <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-center">
          <p className="text-sm font-semibold text-red-200">
            Cierre automático en <span className="text-2xl font-black">{duplicatedSession.secondsLeft}s</span>
          </p>
        </div>

        <p className="mb-6 text-center text-sm leading-relaxed text-contrast">
          Si iniciaste sesión en este equipo, puedes quedarte aquí y cerrar el otro dispositivo, o cerrar esta sesión.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              if (!confirm('¿Mantener esta sesión aquí y cerrar la otra?')) return;
              trackSessionDecision?.('keep');
              try { if ((window as any).__barbadosClearConflict) (window as any).__barbadosClearConflict(); } catch {}
              reclaimSession();
              try { /* try claim on server after reclaim */ (window as any).__barbadosReclaimSession?.(); } catch {}
            }}
            className="flex-1 rounded-xl px-4 py-3 font-bold accent-btn transition-all hover:shadow-lg active:scale-95"
          >
            Mantener aquí
          </button>
          <button
            type="button"
            onClick={() => {
              if (!confirm('¿Cerrar esta sesión en este dispositivo?')) return;
              trackSessionDecision?.('other');
              logoutLocal();
              window.location.href = '/#/login';
            }}
            className="flex-1 rounded-xl px-4 py-3 font-bold btn-danger transition-all hover:shadow-lg active:scale-95"
          >
            Cerrar sesión
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