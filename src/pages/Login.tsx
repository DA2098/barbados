import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await api.login(email, password);
      // Only allow customers to sign in from this page.
      if (user.role !== 'user') {
        setError('Esta pantalla es solo para clientes. Si eres administrador o barbero, usa el Acceso Privado.');
        setLoading(false);
        return;
      }

      login(user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="w-full max-w-6xl grid lg:grid-cols-[0.92fr_1.08fr] gap-6 items-stretch">
        <div className="glass-card rounded-3xl p-8 md:p-10 flex flex-col justify-between border border-white/10 overflow-hidden relative">
          <div>
            <div className="inline-flex mb-6">
              <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center overflow-hidden border border-white/10 shadow-lg">
                <img src="/logitobarbados.png" alt="Barbados" className="w-11 h-11 object-contain" />
              </div>
            </div>
            <span className="hero-kicker">ACCESO CLIENTES</span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-contrast mt-4 leading-tight">Reserva, compra y sigue tu cuenta en un solo panel</h1>
            <p className="muted mt-4 max-w-lg leading-relaxed">
              Entrar aquí te conecta con citas, tienda, facturas y chat. Interfaz limpia, rápida y pensada para clientes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.24em] muted">Citas</p>
              <p className="mt-2 text-2xl font-extrabold text-contrast">Directas</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.24em] muted">Pagos</p>
              <p className="mt-2 text-2xl font-extrabold text-contrast">Seguros</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.24em] muted">Soporte</p>
              <p className="mt-2 text-2xl font-extrabold text-contrast">Chat</p>
            </div>
          </div>
        </div>

        <div className="w-full">
          <div className="glass-card rounded-3xl p-8 md:p-10 shadow-2xl border border-white/10">
            <div className="mb-6 text-center">
              <h2 className="text-2xl md:text-3xl font-extrabold text-contrast mb-2 text-center">Iniciar Sesión</h2>
              <p className="muted text-sm">Acceso para clientes</p>
            </div>

            <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-contrast">
              <p className="font-semibold">Lo importante primero</p>
              <p className="mt-2 muted">
                Entra para ver tus reservas, compras, facturas y mensajes.
              </p>
            </div>

          {error && (
            <div className="alert-danger mb-6 text-sm flex items-center gap-3">
              <div className="w-5 h-5 rounded-full" style={{ background: 'var(--danger)', opacity: 0.2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</div>
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
                className="w-full px-4 py-3 form-input text-sm rounded-2xl"
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
                className="w-full px-4 py-3 form-input text-sm rounded-2xl" 
                placeholder="••••••••"
              />
            </div>

            <button 
              disabled={loading}
              className="w-full accent-btn font-bold py-3 rounded-2xl disabled:opacity-60"
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
              <Link to="/register" className="font-semibold text-contrast hover:opacity-80 transition-opacity">
                Regístrate aquí
              </Link>
            </p>
            <p className="mt-3 text-xs text-center text-muted">
              ¿Eres admin o barbero?{' '}
              <Link to="/acceso-privado" className="font-semibold text-contrast hover:opacity-80 transition-opacity">
                Acceso privado
              </Link>
            </p>
          </div>
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