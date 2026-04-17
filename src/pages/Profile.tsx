import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, BarberApplication } from '../services/api';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [application, setApplication] = useState<BarberApplication | null>(null);
  const [applicationLoading, setApplicationLoading] = useState(false);
  const [submittingApplication, setSubmittingApplication] = useState(false);
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
      alert(err.message);
    } finally {
      setLoading(false);
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
      alert(err.message);
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
      alert(err.message);
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
      alert(err.message);
    } finally {
      setSubmittingApplication(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Mi Perfil</h1>
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
        <div className="mb-6 flex flex-col sm:flex-row gap-4 sm:items-start">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full object-cover border self-start" />
          ) : (
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-2xl font-bold uppercase self-start">
              {user.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-xl font-semibold">{user.name}</h2>
            <p className="text-gray-500">{user.email}</p>
            <span className="inline-block px-2 py-1 bg-gray-100 text-sm rounded mt-1 capitalize text-gray-700 font-medium">
              Rol: {user.role}
            </span>
            <label className="block mt-2 text-sm text-indigo-600 hover:underline cursor-pointer">
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
                className="block mt-1 text-sm text-red-600 hover:underline"
              >
                Quitar foto
              </button>
            )}
          </div>
        </div>

        {success && <div className="bg-green-50 text-green-700 p-3 rounded mb-6">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre Completo</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Teléfono</label>
            <input 
              type="tel" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Ej: +123456789"
            />
          </div>
          <button 
            disabled={loading}
            className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-2 rounded font-medium hover:bg-indigo-700 transition"
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </div>

      {user.role === 'user' && (
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mt-6">
          <h2 className="text-xl font-bold mb-2">Postúlate a Barbero</h2>
          <p className="text-sm text-gray-600 mb-4">Completa este formulario para que el administrador evalúe tu postulación.</p>

          {applicationLoading ? (
            <p className="text-sm text-gray-500">Cargando postulación...</p>
          ) : null}

          {application && (
            <div className="mb-4 p-3 rounded border bg-slate-50 text-sm">
              Estado actual: <span className="font-semibold uppercase">{application.status}</span>
              <div className="text-xs text-gray-500 mt-1">Enviada: {new Date(application.submittedAt).toLocaleString()}</div>
            </div>
          )}

          <form onSubmit={handleSubmitApplication} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Teléfono de contacto</label>
              <input
                type="tel"
                required
                value={applicationForm.phone}
                onChange={(e) => setApplicationForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full p-2 border rounded"
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
                className="w-full p-2 border rounded"
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
                className="w-full p-2 border rounded"
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
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Motivación</label>
              <textarea
                required
                value={applicationForm.motivation}
                onChange={(e) => setApplicationForm((prev) => ({ ...prev, motivation: e.target.value }))}
                className="w-full p-2 border rounded"
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
                className="w-full p-2 border rounded"
                placeholder="https://instagram.com/tu_portafolio"
              />
            </div>
            <button
              type="submit"
              disabled={submittingApplication}
              className="w-full sm:w-auto bg-slate-900 text-white px-5 py-2 rounded font-semibold disabled:opacity-50"
            >
              {submittingApplication ? 'Enviando...' : application ? 'Actualizar postulación' : 'Enviar postulación'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}