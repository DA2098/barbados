import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ShieldUser, Scissors, UserRound } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [accessType, setAccessType] = useState<'client' | 'staff'>('client');

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await api.login(email, password);
      login(user);

      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'barber') navigate('/barber');
      else navigate('/');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex mb-4">
            <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center overflow-hidden">
              <img src="/logitobarbados.png" alt="Barbados" className="w-10 h-10 object-cover" />
            </div>
          </div>
          <h1 className="text-xl font-extrabold text-contrast tracking-wide">BARBADOS</h1>
        </div>

        {/* Main Card */}
        <div className="glass-card rounded-2xl p-8 shadow-2xl mb-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-contrast mb-1">Iniciar Sesión</h2>
            <div className="h-1 w-12 avatar-accent rounded-full mx-auto"></div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 mb-6 rounded-2xl border border-white/10 bg-white/5">
            <button
              type="button"
              onClick={() => setAccessType('client')}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                accessType === 'client' ? 'accent-btn shadow-lg' : 'text-contrast/80 hover:text-contrast hover:bg-white/5'
              }`}
            >
              <UserRound className="w-4 h-4" />
              Cliente
            </button>
            <button
              type="button"
              onClick={() => setAccessType('staff')}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                accessType === 'staff' ? 'accent-btn shadow-lg' : 'text-contrast/80 hover:text-contrast hover:bg-white/5'
              }`}
            >
              <ShieldUser className="w-4 h-4" />
              Staff
            </button>
          </div>

          {accessType === 'staff' && (
            <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-contrast">
              <div className="flex items-start gap-3">
                <ShieldUser className="w-5 h-5 shrink-0 text-amber-300 mt-0.5" />
                <div className="space-y-3">
                  <p className="font-semibold">Acceso exclusivo para personal autorizado</p>
                  <p className="muted">
                    Inicia sesión con tu cuenta de administrador o barbero. El sistema te enviará automáticamente al panel correcto según tu rol.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center gap-2 font-semibold">
                        <ShieldUser className="w-4 h-4 text-amber-300" />
                        Admin
                      </div>
                      <p className="mt-1 text-xs muted">Gestión total de usuarios, contenido, pagos y conversaciones.</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center gap-2 font-semibold">
                        <Scissors className="w-4 h-4 text-amber-300" />
                        Barbero
                      </div>
                      <p className="mt-1 text-xs muted">Acceso al panel de barbero para agenda, clientes y comunicación.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="alert-danger mb-6 text-sm flex items-center gap-3">
              <div className="w-5 h-5 rounded-full" style={{ background: 'var(--danger, #ef4444,)', opacity: 0.2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</div>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-contrast mb-2">Correo o Usuario</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 form-input text-sm rounded-xl transition-all"
                placeholder="Ingresa tu usuario o correo"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-contrast mb-2">Contraseña</label>
              <input 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 form-input text-sm rounded-xl transition-all" 
                placeholder="••••••••"
              />
            </div>

            <button 
              disabled={loading}
              className="w-full accent-btn font-bold py-3 rounded-xl disabled:opacity-60 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                  Ingresando...
                </span>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-sm text-center text-muted">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="font-semibold text-contrast hover:text-accent transition-colors">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center text-xs text-muted">
          <p>Plataforma segura de Barbados</p>
          <p className="mt-1">© 2026 Todos los derechos reservados</p>
        </div>
      </div>
    </div>
  );
}