import { HashRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
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