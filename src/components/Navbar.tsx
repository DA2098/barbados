import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { ShoppingCart, Menu, MessageCircle, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { useRealtimeUserEvents } from '../hooks/useRealtimeUserEvents';

export default function Navbar() {
  const { user, logout, logoutLocal, sessionExitReason, clearSessionExitReason, duplicatedSession, reclaimSession, trackSessionDecision } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { items } = useCart();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const lastAdminMessageIdRef = useRef<string | null>(null);
  const checkingAdminMessageRef = useRef(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const totalCartItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const canBuyProducts = user?.role !== 'admin' && user?.role !== 'barber';

  const syncLatestAdminMessage = async () => {
    if (!user || user.role === 'admin' || checkingAdminMessageRef.current) return;
    checkingAdminMessageRef.current = true;

    try {
      const contacts = await api.getChatContacts(user.id);
      const adminContact = contacts.find((contact) => contact.role === 'admin');
      if (!adminContact) return;

      const convo = await api.getOrCreateConversation(user.id, adminContact.id);
      const msgs = await api.getMessages(convo.id, user.id);
      const adminMessages = msgs.filter((msg) => msg.senderId === adminContact.id);
      const latestAdminMessage = adminMessages[adminMessages.length - 1];

      if (!latestAdminMessage) return;

      if (!lastAdminMessageIdRef.current) {
        lastAdminMessageIdRef.current = latestAdminMessage.id;
        return;
      }

      if (lastAdminMessageIdRef.current !== latestAdminMessage.id) {
        lastAdminMessageIdRef.current = latestAdminMessage.id;
        navigate(`/chat?peerId=${adminContact.id}`);
      }
    } catch {
      // No bloquea la UI si falla un intento puntual de sincronizacion.
    } finally {
      checkingAdminMessageRef.current = false;
    }
  };

  useEffect(() => {
    if (!user || user.role === 'admin') return;
    void syncLatestAdminMessage();
  }, [user?.id, user?.role]);

  useRealtimeUserEvents(
    user?.id,
    () => {
      void syncLatestAdminMessage();
    },
    !!user
  );

  const NavLink = ({ to, children, onClick }: { to: string; children: React.ReactNode; onClick?: () => void }) => (
    <Link 
      to={to} 
      onClick={onClick}
      className="nav-btn inline-flex items-center justify-center text-center"
    >
      {children}
    </Link>
  );

  return (
    <nav style={{ backgroundColor: 'var(--surface)' }} className="text-contrast sticky top-0 z-50 border-b border-white/10 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Logo */}
          <Link to="/" className="flex items-start gap-2 h-20">
            <div className="app-logo flex items-start">
              <img src="/logitobarbados.png" alt="Barbados" className="w-12 h-12 object-contain mt-1" />
            </div>
            <span className="font-extrabold text-xl tracking-[0.08em] text-contrast brand-title">BARBADOS</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-3">
            <NavLink to="/">INICIO</NavLink>
            <NavLink to="/store">SERVICIOS</NavLink>
            <NavLink to="/appointments">AGENDAR</NavLink>
            
            {user ? (
              <>
                {user.role === 'admin' && <NavLink to="/admin">ADMIN</NavLink>}
                {user.role === 'barber' && user.barber_approved !== false && <NavLink to="/barber">BARBERO</NavLink>}
                <NavLink to="/chat">CHAT</NavLink>
                <NavLink to="/invoices">FACTURAS</NavLink>
                <NavLink to="/profile">PERFIL</NavLink>
                <button 
                  onClick={handleLogout} 
                  className="accent-btn px-4 py-2 rounded-lg font-bold uppercase tracking-wider text-sm"
                >
                  SALIR
                </button>
              </>
            ) : (
              <NavLink to="/login">LOGIN</NavLink>
            )}

            {user && (
              <Link to="/chat" className="nav-icon-btn relative flex items-center ml-1 text-contrast">
                <MessageCircle className="w-7 h-7" />
              </Link>
            )}

            {canBuyProducts && (
              <Link to="/cart" className="nav-icon-btn relative flex items-center ml-1 text-contrast">
                <ShoppingCart className="w-7 h-7" />
                {totalCartItems > 0 && (
                  <span className="absolute -top-2 -right-2 badge-note text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center" style={{ border: '2px solid var(--surface)' }}>
                    {totalCartItems}
                  </span>
                )}
              </Link>
            )}

              <div className="flex items-center gap-2">
                <button onClick={toggleTheme} aria-label="Toggle theme" className="nav-icon-btn text-contrast p-2 rounded-md">
                  {theme === 'light' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                </button>

              </div>
          </div>

              {/* Duplicate session warning (non-blocking, with actions) */}
              {duplicatedSession && (
                <div className="max-w-7xl mx-auto px-4 lg:px-8">
                  <div className="mt-2 p-3 rounded-md bg-yellow-500 text-black flex flex-col md:flex-row md:justify-between items-start md:items-center gap-3">
                    <div className="font-medium">
                      Se inició sesión desde otro dispositivo. ¿Deseas mantener la sesión en este dispositivo (cerrar sesión en el otro) o iniciar en el otro?
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-sm opacity-90">Cierra en: <span className="font-bold">{duplicatedSession.secondsLeft}s</span></div>
                      <button onClick={() => {
                        if (!confirm('¿Confirmar mantener la sesión aquí y cerrar la sesión en el otro dispositivo?')) return;
                        trackSessionDecision?.('keep');
                        reclaimSession();
                      }} className="accent-btn px-3 py-2 rounded-md">Mantener aquí</button>
                      <button
                        onClick={() => {
                          if (!confirm('¿Confirmar cerrar sesión en este dispositivo y mantener la sesión en el otro?')) return;
                          trackSessionDecision?.('other');
                          try { logoutLocal(); } catch { logout(); }
                          navigate('/login');
                        }}
                        className="underline font-semibold"
                      >
                        Iniciar en otro dispositivo
                      </button>
                      <button
                        onClick={() => {
                          if (!confirm('¿Permitir ambas sesiones activas? El otro dispositivo no se cerrará.')) return;
                          trackSessionDecision?.('both');
                          // allow both: simply clear the duplicate countdown here
                          reclaimSession();
                        }}
                        className="px-3 py-2 font-semibold"
                      >
                        Permitir ambas
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Session exit notice (non-blocking) */}
              {sessionExitReason && (
                <div className="max-w-7xl mx-auto px-4 lg:px-8">
                  <div className="mt-2 p-3 rounded-md bg-amber-400 text-black flex justify-between items-center">
                    <div className="font-medium">
                      {sessionExitReason === 'inactive'
                        ? 'Sesión cerrada por inactividad'
                        : 'Sesión cerrada por inicio en otro dispositivo'}
                    </div>
                    <div className="flex items-center gap-3">
                      <Link to="/login" className="underline font-semibold">Iniciar sesión</Link>
                      <button onClick={() => clearSessionExitReason()} className="text-sm opacity-80">Cerrar</button>
                    </div>
                  </div>
                </div>
              )}

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-4">
            {user && (
              <Link to="/chat" className="relative flex items-center text-contrast">
                <MessageCircle className="w-6 h-6" />
              </Link>
            )}
            {canBuyProducts && (
              <Link to="/cart" className="relative flex items-center text-contrast">
                <ShoppingCart className="w-6 h-6" />
                {totalCartItems > 0 && (
                  <span style={{ borderColor: 'var(--surface)' }} className="absolute -top-2 -right-2 badge-note border-2 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {totalCartItems}
                  </span>
                )}
              </Link>
            )}
            <button
              type="button"
              aria-label="Abrir menu"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-nav-menu"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-contrast"
            >
              <Menu className="w-8 h-8" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
          <div id="mobile-nav-menu" className="md:hidden panel-dynamic px-4 py-4 space-y-3 flex flex-col border-t border-white/10">
           <button
             type="button"
             onClick={toggleTheme}
             className="w-full nav-btn text-center"
           >
             {theme === 'dark' ? 'CAMBIAR CLARO' : 'CAMBIAR OSCURO'}
           </button>
           <NavLink to="/" onClick={() => setIsMenuOpen(false)}>INICIO</NavLink>
           <NavLink to="/store" onClick={() => setIsMenuOpen(false)}>SERVICIOS</NavLink>
           <NavLink to="/appointments" onClick={() => setIsMenuOpen(false)}>AGENDAR</NavLink>
           {user ? (
              <>
                {user.role === 'admin' && <NavLink to="/admin" onClick={() => setIsMenuOpen(false)}>ADMIN</NavLink>}
                {user.role === 'barber' && user.barber_approved !== false && <NavLink to="/barber" onClick={() => setIsMenuOpen(false)}>BARBERO</NavLink>}
                <NavLink to="/chat" onClick={() => setIsMenuOpen(false)}>CHAT</NavLink>
                <NavLink to="/invoices" onClick={() => setIsMenuOpen(false)}>FACTURAS</NavLink>
                <NavLink to="/profile" onClick={() => setIsMenuOpen(false)}>PERFIL</NavLink>
                <button 
                  onClick={() => { handleLogout(); setIsMenuOpen(false); }} 
                  className="accent-btn text-white px-5 py-2 rounded-lg font-bold uppercase tracking-wider text-sm transition-all w-full text-center"
                >
                  SALIR
                </button>
              </>
            ) : (
              <NavLink to="/login" onClick={() => setIsMenuOpen(false)}>LOGIN</NavLink>
            )}
        </div>
      )}
    </nav>
  );
}
