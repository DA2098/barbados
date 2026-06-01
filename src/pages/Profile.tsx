import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, BarberApplication } from '../services/api';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [success, setSuccess] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [application, setApplication] = useState<BarberApplication | null>(null);
  const [applicationLoading, setApplicationLoading] = useState(false);
  const [submittingApplication, setSubmittingApplication] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [applicationForm, setApplicationForm] = useState({
    phone: user?.phone || '',
    experienceYears: 1,
    specialties: '',
    availability: '',
    motivation: '',
    portfolioUrl: ''
  });

  useEffect(() => {
    if (!user || user.role !== 'user') return;
    setApplicationLoading(true);
    api.getMyBarberApplication(user.id)
      .then((data) => {
        if (data) {
          setApplication(data);
          setApplicationForm({
            phone: data.phone,
            experienceYears: data.experienceYears,
            specialties: data.specialties,
            availability: data.availability,
            motivation: data.motivation,
            portfolioUrl: data.portfolioUrl || ''
          });
        }
      })
      .finally(() => setApplicationLoading(false));
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!user) return;
    setName(user.name || '');
    setPhone(user.phone || '');
    setApplicationForm((prev) => ({
      ...prev,
      phone: user.phone || ''
    }));
  }, [user?.id, user?.name, user?.phone, user?.avatar_url, user?.role]);

  if (!user) return <div className="p-8 text-center">Por favor, inicia sesión</div>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setLoading(true);
    try {
      const updatedUser = await api.updateProfile(user.id, { name, phone });
      updateUser(updatedUser);
      setSuccess('Perfil actualizado exitosamente');
    } catch (err: any) {
        const msg = String(err?.message || '').toLowerCase();
        if (msg.includes('session_conflict') || msg.includes('session conflict')) {
          console.warn('Ignored session_conflict in Profile update');
        } else {
          alert(err.message);
        }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      alert('La nueva contraseña y su confirmación no coinciden');
      return;
    }

    setPasswordLoading(true);
    try {
      const updatedUser = await api.changePassword(user.id, currentPassword, newPassword);
      updateUser(updatedUser);
      setPasswordSuccess('Contraseña actualizada correctamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('session_conflict') || msg.includes('session conflict')) {
        console.warn('Ignored session_conflict in Profile changePassword');
      } else {
        alert(err.message);
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    setUploadingAvatar(true);
    setSuccess('');
    try {
      const avatarUrl = await api.uploadAvatar(user.id, file);
      const updatedUser = await api.updateProfile(user.id, { name, phone, avatar_url: avatarUrl });
      updateUser(updatedUser);
      setSuccess('Foto de perfil actualizada');
    } catch (err: any) {
      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('session_conflict') || msg.includes('session conflict')) {
        console.warn('Ignored session_conflict in Profile avatar upload');
      } else {
        alert(err.message);
      }
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    if (!confirm('¿Quitar foto de perfil?')) return;
    setSuccess('');
    setLoading(true);
    try {
      const updatedUser = await api.updateProfile(user.id, { name, phone, avatar_url: null });
      updateUser(updatedUser);
      setSuccess('Foto de perfil eliminada');
    } catch (err: any) {
      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('session_conflict') || msg.includes('session conflict')) {
        console.warn('Ignored session_conflict in Profile remove avatar');
      } else {
        alert(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.role !== 'user') return;
    setSubmittingApplication(true);
    setSuccess('');
    try {
      const app = await api.submitBarberApplication({
        userId: user.id,
        phone: applicationForm.phone,
        experienceYears: Number(applicationForm.experienceYears),
        specialties: applicationForm.specialties,
        availability: applicationForm.availability,
        motivation: applicationForm.motivation,
        portfolioUrl: applicationForm.portfolioUrl
      });
      setApplication(app);
      const updatedUser = await api.updateProfile(user.id, {
        name,
        phone: applicationForm.phone
      });
      updateUser(updatedUser);
      setSuccess('Postulación enviada correctamente. El admin la revisará pronto.');
    } catch (err: any) {
      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('session_conflict') || msg.includes('session conflict')) {
        console.warn('Ignored session_conflict in Profile submit application');
      } else {
        alert(err.message);
      }
    } finally {
      setSubmittingApplication(false);
    }
  };

  const displayOrPlaceholder = (value?: string, placeholder = 'Sin especificar') => (value && value.trim() !== '' ? value : placeholder);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="glass-card rounded-3xl p-6 md:p-8 border border-white/10 mb-6 sm:mb-8">
        <span className="hero-kicker">MI CUENTA</span>
        <h1 className="text-2xl sm:text-4xl font-extrabold mt-4 text-contrast">Perfil, seguridad y postulación en un solo espacio</h1>
        <p className="muted mt-3 max-w-2xl text-sm leading-relaxed">Configura tu identidad, contraseña y si eres cliente, postúlate como barbero desde aquí.</p>
      </div>

      <div className="glass-card panel-dynamic p-4 sm:p-6 rounded-3xl border border-white/10">
        <div className="mb-6 flex flex-col sm:flex-row gap-4 sm:items-start">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="Avatar" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="w-16 h-16 rounded-2xl object-cover border border-white/20 self-start" />
          ) : null}
          {!user.avatar_url ? (
            <div style={{ backgroundColor: 'var(--card)' }} className="w-16 h-16 text-contrast rounded-2xl flex items-center justify-center text-2xl font-bold uppercase self-start border border-white/6">
              {(user.name || ' ').charAt(0) || 'U'}
            </div>
          ) : null}
          <div className="min-w-0">
            <h2 className="text-xl font-semibold">{displayOrPlaceholder(user.name, 'Usuario')}</h2>
            <p className="text-gray-300">{displayOrPlaceholder(user.email, 'Sin email')}</p>
            <span style={{ backgroundColor: 'var(--glass)' }} className="inline-block px-2 py-1 text-sm rounded-2xl mt-1 capitalize text-muted font-medium border border-white/10">
              Rol: {user.role}
            </span>
            <label className="block mt-2 text-sm text-contrast hover:opacity-80 cursor-pointer">
              {uploadingAvatar ? 'Subiendo foto...' : 'Cambiar foto de perfil'}
              <input
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/webp"
                disabled={uploadingAvatar}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAvatarUpload(file);
                  e.currentTarget.value = '';
                }}
              />
            </label>
            {user.avatar_url && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="block mt-1 text-sm text-danger hover:opacity-85"
              >
                Quitar foto
              </button>
            )}
          </div>
        </div>

        {success && <div className="bg-green-600/10 text-green-300 p-3 rounded-2xl mb-6 border border-green-500/20" role="status">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre Completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full form-input"
              placeholder="Sin especificar"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Teléfono</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full form-input"
              placeholder="Sin teléfono registrado"
            />
          </div>
          <button
            disabled={loading}
            className="w-full sm:w-auto accent-btn font-medium py-2 px-6 rounded-2xl disabled:opacity-60"
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>

        <div className="mt-8 border-t border-white/10 pt-6">
          <h3 className="text-lg font-semibold mb-4">Cambiar contraseña</h3>
          {passwordSuccess && <div className="bg-green-600/10 text-green-300 p-3 rounded-2xl mb-4 border border-green-500/20" role="status">{passwordSuccess}</div>}
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Contraseña actual</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full form-input"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nueva contraseña</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full form-input"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Confirmar nueva contraseña</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full form-input"
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full sm:w-auto accent-btn font-medium py-2 px-6 rounded-2xl disabled:opacity-60"
            >
              {passwordLoading ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </form>
        </div>
      </div>

      {user.role === 'user' && (
        <div className="glass-card rounded-3xl shadow-md p-4 sm:p-6 mt-6 border border-white/10">
          <h2 className="text-xl font-bold mb-2 text-contrast">Postúlate a Barbero</h2>
          <p className="text-sm text-muted mb-4">Completa este formulario para que el administrador evalúe tu postulación.</p>

          {applicationLoading ? (
            <p className="text-sm text-gray-500">Cargando postulación...</p>
          ) : null}

          {application ? (
            <div style={{ backgroundColor: 'var(--glass)' }} className="mb-4 p-3 rounded-2xl border border-white/10 text-sm">
              Estado actual: <span className="font-semibold uppercase">{application.status}</span>
              <div className="text-xs muted mt-1">Enviada: {new Date(application.submittedAt).toLocaleString()}</div>
            </div>
          ) : (
            <div style={{ backgroundColor: 'var(--glass)' }} className="mb-4 p-3 rounded-2xl border border-white/10 text-sm muted">No hay postulación activa.</div>
          )}

          <form onSubmit={handleSubmitApplication} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Teléfono de contacto</label>
              <input
                type="tel"
                required
                value={applicationForm.phone}
                onChange={(e) => setApplicationForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full form-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Años de experiencia</label>
              <input
                type="number"
                min={0}
                max={60}
                required
                value={applicationForm.experienceYears}
                onChange={(e) => setApplicationForm((prev) => ({ ...prev, experienceYears: Number(e.target.value) }))}
                className="w-full form-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Especialidades</label>
              <input
                type="text"
                required
                value={applicationForm.specialties}
                onChange={(e) => setApplicationForm((prev) => ({ ...prev, specialties: e.target.value }))}
                placeholder="Fade, barba, cejas, color..."
                className="w-full form-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Disponibilidad</label>
              <input
                type="text"
                required
                value={applicationForm.availability}
                onChange={(e) => setApplicationForm((prev) => ({ ...prev, availability: e.target.value }))}
                placeholder="Lunes a sábado 9:00 a 18:00"
                className="w-full form-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Motivación</label>
              <textarea
                required
                value={applicationForm.motivation}
                onChange={(e) => setApplicationForm((prev) => ({ ...prev, motivation: e.target.value }))}
                className="w-full form-input"
                rows={4}
                placeholder="Cuéntanos por qué quieres unirte al equipo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Portafolio (URL opcional)</label>
              <input
                type="url"
                value={applicationForm.portfolioUrl}
                onChange={(e) => setApplicationForm((prev) => ({ ...prev, portfolioUrl: e.target.value }))}
                className="w-full form-input"
                placeholder="https://instagram.com/tu_portafolio"
              />
            </div>
            <button
              type="submit"
              disabled={submittingApplication}
              className="w-full sm:w-auto accent-btn text-contrast px-5 py-2 rounded-2xl font-semibold disabled:opacity-50"
            >
              {submittingApplication ? 'Enviando...' : application ? 'Actualizar postulación' : 'Enviar postulación'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}