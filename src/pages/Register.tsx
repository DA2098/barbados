import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User, Info } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'barber'>('user');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await api.register(name, email, password, role);
      if (role === 'barber' && user.barber_approved === false) {
        alert('Tu cuenta de barbero fue creada y está pendiente de aprobación del administrador.');
        navigate('/login');
        return;
      }
      login(user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-md w-full">
        <div className="glass-card rounded-2xl p-8">
          <h1 className="text-3xl font-bold text-center text-contrast mb-2">Crear Cuenta</h1>
          <p className="text-center muted text-sm mb-6">Únete a Barbados hoy</p>
          
          <div className="p-4 rounded-lg mb-6 text-sm bg-blue-500/10 text-contrast/80 flex gap-3 items-start border border-blue-500/20">
            <Info className="w-5 h-5 shrink-0 text-blue-400 mt-0.5" />
            <p className="leading-5">Si eliges barbero, necesitarás aprobación del administrador para activar tu cuenta.</p>
          </div>
          
          {error && (
            <div className="bg-red-500/15 text-red-300 p-4 rounded-lg mb-6 text-sm text-center border border-red-500/30">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-contrast mb-2">Nombre Completo</label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-contrast/60 pointer-events-none" />
                <input 
                  type="text" 
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 form-input" 
                  placeholder="Tu nombre"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-contrast mb-2">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-contrast/60 pointer-events-none" />
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 form-input" 
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-contrast mb-2">Tipo de Cuenta</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'user' | 'barber')}
                className="w-full form-input"
              >
                <option value="user">👤 Cliente</option>
                <option value="barber">✂️ Barbero (requiere aprobación)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-contrast mb-2">Contraseña</label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-contrast/60 pointer-events-none" />
                <input 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 form-input" 
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              disabled={loading}
              className="w-full accent-btn font-bold py-3 rounded-lg disabled:opacity-60 transition-all"
            >
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-sm muted">
              ¿Ya tienes cuenta? <Link to="/login" className="font-semibold text-contrast hover:opacity-80 transition-opacity">Inicia sesión aquí</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}