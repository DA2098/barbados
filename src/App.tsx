import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

// Componentes y Páginas
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Store from './pages/Store';
import Appointments from './pages/Appointments';
import Cart from './pages/Cart';
import Profile from './pages/Profile';
import BarberPanel from './pages/BarberPanel';
import AdminPanel from './pages/AdminPanel';
import Chat from './pages/Chat';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
            <Navbar />
            <main>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/store" element={<Store />} />
                <Route path="/appointments" element={<Appointments />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/barber" element={<BarberPanel />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/chat" element={<Chat />} />
              </Routes>
            </main>
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;