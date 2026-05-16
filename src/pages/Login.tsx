import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ExistingSessionModal from '../components/ExistingSessionModal';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();
  const { logout, logoutLocal } = useAuth();

  const [existingSessionUser, setExistingSessionUser] = useState<{ id: string; name?: string } | null>(null);
  const [showExistingModal, setShowExistingModal] = useState(false);

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
      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('session_conflict') || msg.includes('session conflict')) {
        console.warn('Ignored session_conflict in Login');
        // Let AuthContext show banner/modal instead
      } else {
        setError(err.message || 'Error al iniciar sesión');
      }
    } finally {
      setLoading(false);
    }
  };

  // Detect if this tab already has a logged user and prompt before allowing a different login
  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      const tabLoggedOut = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('barbados_tab_local_logout');
      if (raw && !tabLoggedOut) {
        const parsed = JSON.parse(raw) as { id: string; name?: string };
        if (parsed && parsed.id) {
          setExistingSessionUser({ id: parsed.id, name: parsed.name });
          setShowExistingModal(true);
        }
      }
    } catch {
      // ignore
    }
  }, []);

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
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-contrast mb-1 text-center">Iniciar Sesión</h2>
            <div className="h-1 w-12 avatar-accent rounded-full mx-auto"></div>
          </div>

          <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-contrast">
            <p className="font-semibold">Acceso para clientes</p>
            <p className="mt-2 muted">
              Usa esta pantalla para entrar como cliente o registrar una nueva cuenta.
            </p>
          </div>

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

          {/* Existing-session modal (blocks login until user decides) */}
          <ExistingSessionModal
            visible={showExistingModal && !!existingSessionUser}
            username={existingSessionUser?.name || existingSessionUser?.id}
            onCancel={() => setShowExistingModal(false)}
            onLogout={async () => {
              try {
                await logout();
              } catch {
                try { logoutLocal(); } catch {}
              }
              setShowExistingModal(false);
            }}
          />

          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-sm text-center text-muted">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="font-semibold text-contrast hover:text-accent transition-colors">
                Regístrate aquí
              </Link>
            </p>
            <p className="mt-3 text-xs text-center text-muted">
              ¿Eres admin o barbero?{' '}
              <Link to="/acceso-privado" className="font-semibold text-contrast hover:text-accent transition-colors">
                Acceso privado
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