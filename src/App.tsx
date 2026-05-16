import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { CartProvider } from './context/CartContext';

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
  const { user, duplicatedSession, reclaimSession, logout } = useAuth();
  const location = useLocation();

  if (!user || !duplicatedSession) return null;

  const hiddenPaths = ['/login', '/register', '/acceso-privado'];
  if (hiddenPaths.includes(location.pathname)) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-80 w-[92%] max-w-2xl -translate-x-1/2 rounded-2xl border border-red-300/35 bg-red-500/12 p-4 shadow-2xl backdrop-blur-md">
      <p className="text-sm font-bold text-red-200">Sesion duplicada detectada</p>
      <p className="mt-1 text-sm text-contrast">
        Detectamos otro acceso con esta misma cuenta. Para seguir en este dispositivo, confirma antes de que termine el tiempo.
      </p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-red-100">
        Cierre automatico en {duplicatedSession.secondsLeft}s
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={reclaimSession}
          className="accent-btn px-3 py-2 text-sm font-bold"
        >
          Seguir aqui
        </button>
        <button
          type="button"
          onClick={logout}
          className="btn-danger px-3 py-2 text-sm font-bold"
        >
          Cerrar sesion ahora
        </button>
      </div>
    </div>
  );
}

function AppShell() {
  return (
    <div style={{ backgroundColor: 'var(--bg)' }} className="min-h-screen text-contrast font-sans">
      <Navbar />
      <SessionConflictNotice />
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
          <Router>
            <AppShell />
          </Router>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;