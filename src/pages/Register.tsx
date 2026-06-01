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
      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('session_conflict') || msg.includes('session conflict')) {
        console.warn('Ignored session_conflict in Register');
      } else {
        setError(err.message || 'Error al registrar');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-6xl w-full grid lg:grid-cols-[1fr_0.9fr] gap-6 items-stretch">
        <div className="glass-card rounded-3xl p-8 md:p-10 border border-white/10 overflow-hidden relative">
          <span className="hero-kicker">NUEVA CUENTA</span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-contrast mt-4 leading-tight">Crea tu acceso y entra al ecosistema Barbados</h1>
          <p className="muted mt-4 max-w-xl leading-relaxed">
            Un registro limpio para clientes y barberos. Sin ruido, sin pasos innecesarios.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.24em] muted">Cliente</p>
              <p className="mt-2 text-2xl font-extrabold text-contrast">Rápido</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.24em] muted">Barbero</p>
              <p className="mt-2 text-2xl font-extrabold text-contrast">Requiere</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.24em] muted">Panel</p>
              <p className="mt-2 text-2xl font-extrabold text-contrast">Único</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-3xl p-8 md:p-10 border border-white/10">
          <h1 className="text-3xl font-bold text-center text-contrast mb-2">Crear Cuenta</h1>
          <p className="text-center muted text-sm mb-6">Únete a Barbados hoy</p>
          
          <div className="p-4 rounded-2xl mb-6 text-sm bg-blue-500/10 text-contrast/80 flex gap-3 items-start border border-blue-500/20">
            <Info className="w-5 h-5 shrink-0 text-blue-400 mt-0.5" />
            <p className="leading-5">Si eliges barbero, necesitarás aprobación del administrador para activar tu cuenta.</p>
          </div>
          
          {error && (
            <div className="alert-danger mb-6 text-sm text-center">{error}</div>
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
                  className="w-full pr-4 py-3 form-input icon-left rounded-2xl" 
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
                  className="w-full pr-4 py-3 form-input icon-left rounded-2xl" 
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-contrast mb-2">Tipo de Cuenta</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'user' | 'barber')}
                className="w-full form-input rounded-2xl"
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
                  className="w-full pr-4 py-3 form-input icon-left rounded-2xl" 
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              disabled={loading}
              className="w-full accent-btn font-bold py-3 rounded-2xl disabled:opacity-60"
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