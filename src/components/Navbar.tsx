import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { ShoppingCart, Menu, MessageCircle, Bell } from 'lucide-react';
import { useState } from 'react';
import { api } from '../services/api';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { useRealtimeUserEvents } from '../hooks/useRealtimeUserEvents';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const totalCartItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const canBuyProducts = user?.role !== 'admin' && user?.role !== 'barber';

  useAutoRefresh(async () => {
    if (!user) return;
    try {
      const response = await api.getNotifications(user.id);
      setUnreadCount(response.unreadCount);
    } catch {
      setUnreadCount(0);
    }
  }, { intervalMs: 20000, enabled: !!user });

  useRealtimeUserEvents(user?.id, (payload) => {
    setUnreadCount(payload.unreadCount);
  }, !!user);

  const NavLink = ({ to, children, onClick }: { to: string; children: React.ReactNode; onClick?: () => void }) => (
    <Link 
      to={to} 
      onClick={onClick}
      className="bg-linear-to-r from-[#D94814] to-[#F15515] hover:from-[#c23e0d] hover:to-[#e3480d] text-white px-5 py-1.5 rounded-full font-bold uppercase tracking-wider text-sm transition-all shadow-md inline-block text-center"
    >
      {children}
    </Link>
  );

  return (
    <nav className="bg-[#3b6a64] text-white sticky top-0 z-50 shadow-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="relative w-14 h-14 rounded-full border-2 border-[#f3d0c6] bg-[#2f5b56] flex items-center justify-center shadow-md overflow-hidden">
              <img
                src="/logo-bar4beards.svg"
                alt="Bar4Beards"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-bold text-2xl tracking-wide text-white">Bar4Beards</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-4">
            <NavLink to="/">INICIO</NavLink>
            <NavLink to="/store">SERVICIOS</NavLink>
            <NavLink to="/appointments">AGENDAR</NavLink>
            
            {user ? (
              <>
                {user.role === 'admin' && <NavLink to="/admin">ADMIN</NavLink>}
                {user.role === 'barber' && user.barber_approved !== false && <NavLink to="/barber">BARBERO</NavLink>}
                <NavLink to="/chat">CHAT</NavLink>
                <NavLink to="/profile">PERFIL</NavLink>
                <button 
                  onClick={handleLogout} 
                  className="bg-linear-to-r from-[#D94814] to-[#F15515] hover:from-[#c23e0d] hover:to-[#e3480d] text-white px-5 py-1.5 rounded-full font-bold uppercase tracking-wider text-sm transition-all shadow-md"
                >
                  SALIR
                </button>
              </>
            ) : (
              <NavLink to="/login">LOGIN</NavLink>
            )}

            {user && (
              <Link to="/chat" className="relative flex items-center ml-2 text-white hover:text-orange-200 transition-colors">
                <MessageCircle className="w-7 h-7" />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 border-2 border-[#2E5953] text-xs font-bold min-w-5 h-5 px-1 rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Link>
            )}

            {canBuyProducts && (
              <Link to="/cart" className="relative flex items-center ml-2 text-white hover:text-orange-200 transition-colors">
                <ShoppingCart className="w-7 h-7" />
                {totalCartItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-orange-600 border-2 border-[#2E5953] text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {totalCartItems}
                  </span>
                )}
              </Link>
            )}

            <button className="ml-4 text-white hover:text-orange-200 transition-colors" onClick={() => setIsMenuOpen(!isMenuOpen)}>
               <Menu className="w-10 h-10" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-4">
            {user && (
              <Link to="/chat" className="relative flex items-center text-white">
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 border-2 border-[#2E5953] text-xs font-bold min-w-5 h-5 px-1 rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Link>
            )}
            {canBuyProducts && (
              <Link to="/cart" className="relative flex items-center text-white">
                <ShoppingCart className="w-6 h-6" />
                {totalCartItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-orange-600 border-2 border-[#2E5953] text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {totalCartItems}
                  </span>
                )}
              </Link>
            )}
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-white">
              <Menu className="w-8 h-8" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden bg-[#345f59] px-4 py-4 space-y-4 flex flex-col">
           <NavLink to="/" onClick={() => setIsMenuOpen(false)}>INICIO</NavLink>
           <NavLink to="/store" onClick={() => setIsMenuOpen(false)}>SERVICIOS</NavLink>
           <NavLink to="/appointments" onClick={() => setIsMenuOpen(false)}>AGENDAR</NavLink>
           {user ? (
              <>
                {user.role === 'admin' && <NavLink to="/admin" onClick={() => setIsMenuOpen(false)}>ADMIN</NavLink>}
                {user.role === 'barber' && user.barber_approved !== false && <NavLink to="/barber" onClick={() => setIsMenuOpen(false)}>BARBERO</NavLink>}
                <NavLink to="/chat" onClick={() => setIsMenuOpen(false)}>CHAT</NavLink>
                <NavLink to="/profile" onClick={() => setIsMenuOpen(false)}>PERFIL</NavLink>
                <button 
                  onClick={() => { handleLogout(); setIsMenuOpen(false); }} 
                  className="bg-linear-to-r from-[#D94814] to-[#F15515] hover:from-[#c23e0d] hover:to-[#e3480d] text-white px-5 py-2 rounded-full font-bold uppercase tracking-wider text-sm transition-all shadow-md w-full text-center"
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
