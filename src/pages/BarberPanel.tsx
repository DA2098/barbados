import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, BarberLog, Appointment, Product, User } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { useRealtimeUserEvents } from '../hooks/useRealtimeUserEvents';

export default function BarberPanel() {
  const { user, updateUser } = useAuth();
  const [logs, setLogs] = useState<BarberLog[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [type, setType] = useState<'Corte' | 'Menu' | 'Bebida'>('Corte');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const fetchLogs = async () => {
    const allLogs = await api.getBarberLogs();
    setLogs(allLogs.filter(log => log.barberId === user?.id));
  };

  const fetchRegisteredUsers = async () => {
    const allUsers = await api.getUsers();
    setRegisteredUsers(allUsers.filter((u) => u.role === 'user'));
  };

  const fetchAppointments = async () => {
    if (!user) return;
    const allAppointments = await api.getAppointments(user.id);
    setAppointments(allAppointments);
  };

  const fetchCatalogProducts = async () => {
    const allProducts = await api.getProducts();
    setCatalogProducts(allProducts.filter((product) => ['service', 'food', 'drink'].includes(product.category) && product.is_visible));
  };

  const getProductsByType = (selectedType: 'Corte' | 'Menu' | 'Bebida') => {
    if (selectedType === 'Corte') return catalogProducts.filter((product) => product.category === 'service');
    if (selectedType === 'Menu') return catalogProducts.filter((product) => product.category === 'food');
    return catalogProducts.filter((product) => product.category === 'drink');
  };

  useEffect(() => {
    if (!user) return;
    fetchLogs();
    fetchRegisteredUsers();
    fetchAppointments();
    fetchCatalogProducts();
  }, [user]);

  useAutoRefresh(async () => {
    if (!user) return;
    await Promise.all([fetchLogs(), fetchRegisteredUsers(), fetchAppointments(), fetchCatalogProducts()]);
  }, { intervalMs: 20000, enabled: !!user });

  useRealtimeUserEvents(user?.id, async () => {
    if (!user) return;
    await Promise.all([fetchLogs(), fetchRegisteredUsers(), fetchAppointments(), fetchCatalogProducts()]);
  }, !!user);

  // Actualizar el valor por defecto si cambia el tipo
  useEffect(() => {
    const defaultProduct = getProductsByType(type)[0];
    setSelectedItemId(defaultProduct?.id || '');
  }, [type, catalogProducts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const itemInfo = getProductsByType(type).find((product) => product.id === selectedItemId);
    if (!itemInfo) return;

    try {
      await api.addBarberLog({
        barberId: user.id,
        barberName: user.name,
        type,
        name: itemInfo.name,
        price: itemInfo.price
      });
      fetchLogs();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const avatarUrl = await api.uploadAvatar(user.id, file);
      const updated = await api.updateProfile(user.id, {
        name: user.name,
        phone: user.phone || '',
        avatar_url: avatarUrl
      });
      updateUser(updated);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    if (!confirm('¿Quitar foto de perfil?')) return;
    try {
      const updated = await api.updateProfile(user.id, {
        name: user.name,
        phone: user.phone || '',
        avatar_url: null
      });
      updateUser(updated);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!user) return;
    if (!confirm('¿Eliminar esta cita? Se borrará de todo el sistema.')) return;
    try {
      await api.deleteAppointment(appointmentId, user.id);
      await fetchAppointments();
      await fetchLogs();
    } catch (error: any) {
      alert(error.message);
    }
  };

  if ((user?.role !== 'barber' && user?.role !== 'admin') || (user?.role === 'barber' && user?.barber_approved === false)) {
    return <div className="p-8 text-center text-red-600 font-bold">Acceso Denegado. Se requiere rol de Barbero.</div>;
  }

  const todayTotal = logs.reduce((sum, log) => {
    const today = new Date().toDateString();
    const logDate = new Date(log.date).toDateString();
    return today === logDate ? sum + log.price : sum;
  }, 0);

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-4 lg:p-6 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
      <div className="md:col-span-3 bg-white border border-gray-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="Avatar barbero" className="w-12 h-12 rounded-full object-cover border" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg uppercase">
              {user?.name?.charAt(0)}
            </div>
          )}
          <div>
            <p className="font-semibold">{user?.name}</p>
            <p className="text-sm text-gray-500">Panel de Barbero</p>
          </div>
        </div>
        <label className="text-sm text-indigo-600 cursor-pointer hover:underline sm:text-right">
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
        {user?.avatar_url && (
          <button
            type="button"
            onClick={handleRemoveAvatar}
            className="text-sm text-red-600 hover:underline"
          >
            Quitar foto
          </button>
        )}
      </div>
      
      <div className="md:col-span-1">
        <h2 className="text-2xl font-bold mb-4">Registrar Servicio</h2>
        <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-xl shadow-md border border-gray-100">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Categoría</label>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value as any)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="Corte">Corte / Barbería</option>
              <option value="Menu">Menú de Comida</option>
              <option value="Bebida">Bebidas</option>
            </select>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Servicio / Producto</label>
            {getProductsByType(type).length === 0 ? (
              <p className="text-sm text-gray-500">No hay productos visibles publicados por el admin en esta categoría.</p>
            ) : (
              <select 
                value={selectedItemId} 
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {getProductsByType(type).map((item) => (
                  <option key={item.id} value={item.id}>{item.name} - ${item.price.toFixed(2)}</option>
                ))}
              </select>
            )}
          </div>

          <button 
            disabled={loading}
            className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition"
          >
            {loading ? 'Guardando...' : 'Registrar'}
          </button>
        </form>

        <div className="mt-6 bg-green-50 p-6 rounded-xl border border-green-100">
          <h3 className="text-green-800 font-semibold mb-2">Total Generado Hoy</h3>
          <p className="text-4xl font-bold text-green-600">${todayTotal.toFixed(2)}</p>
        </div>
      </div>

      <div className="md:col-span-2">
        <h2 className="text-2xl font-bold mb-4">Mis Registros Recientes</h2>
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 font-medium text-gray-500">Fecha y Hora</th>
                <th className="p-4 font-medium text-gray-500">Tipo</th>
                <th className="p-4 font-medium text-gray-500">Detalle</th>
                <th className="p-4 font-medium text-gray-500">Precio</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">No hay registros aún.</td>
                </tr>
              ) : (
                [...logs].reverse().map(log => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="p-4 text-sm">{new Date(log.date).toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium 
                        ${log.type === 'Corte' ? 'bg-blue-100 text-blue-700' : 
                          log.type === 'Menu' ? 'bg-orange-100 text-orange-700' : 
                          'bg-purple-100 text-purple-700'}`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="p-4 font-medium">{log.name}</td>
                    <td className="p-4 text-green-600 font-bold">${log.price.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <div className="md:col-span-3">
        <h2 className="text-2xl font-bold mb-4">Clientes Registrados para Chat</h2>
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
          {registeredUsers.length === 0 ? (
            <p className="text-sm text-gray-500">No hay clientes registrados todavía.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {registeredUsers.map((client) => (
                <div key={client.id} className="border rounded-lg p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {client.avatar_url ? (
                      <img src={client.avatar_url} alt={client.name} className="w-10 h-10 rounded-full object-cover border shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold uppercase shrink-0">
                        {client.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{client.name}</p>
                      <p className="text-xs text-gray-500 truncate">{client.email}</p>
                    </div>
                  </div>
                  <Link
                    to={`/chat?peerId=${client.id}`}
                    className="px-3 py-1.5 rounded bg-indigo-600 text-white text-xs font-semibold"
                  >
                    Hablar
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="md:col-span-3">
        <h2 className="text-2xl font-bold mb-4">Mis Citas Asignadas</h2>
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 font-medium text-gray-500">Fecha</th>
                <th className="p-4 font-medium text-gray-500">Cliente</th>
                <th className="p-4 font-medium text-gray-500">Servicio</th>
                <th className="p-4 font-medium text-gray-500">Estado</th>
                <th className="p-4 font-medium text-gray-500 text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">No tienes citas asignadas.</td>
                </tr>
              ) : (
                appointments.map((appointment) => (
                  <tr key={appointment.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="p-4 text-sm">{new Date(appointment.appointmentDate).toLocaleString()}</td>
                    <td className="p-4 font-medium">{appointment.clientName}</td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{appointment.serviceName}</p>
                        <p className="text-xs text-gray-500">{appointment.serviceDescription || 'Sin información'}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded text-xs font-semibold uppercase bg-slate-100 text-slate-700">{appointment.status}</span>
                    </td>
                    <td className="p-4 text-center">
                      <button onClick={() => handleDeleteAppointment(appointment.id)} className="px-3 py-2 rounded bg-red-600 text-white text-xs font-semibold">
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
      
    </div>
  );
}