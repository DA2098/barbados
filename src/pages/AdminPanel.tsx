import { useState, useEffect } from 'react';
import { api, User, Product, BarberLog, Appointment, AppointmentReview, BarberApplication } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Trash2, Users, ShoppingBag, ClipboardList, CalendarDays, Pencil, Scissors, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { useRealtimeUserEvents } from '../hooks/useRealtimeUserEvents';

type ProductForm = {
  name: string;
  description: string;
  price: string;
  stock: string;
  image_url: string;
  category: 'barber' | 'food' | 'drink';
  is_visible: boolean;
};

type CutForm = {
  name: string;
  description: string;
  price: string;
  stock: string;
  image_url: string;
  is_visible: boolean;
};

const emptyProduct: ProductForm = {
  name: '',
  description: '',
  price: '',
  stock: '',
  image_url: '',
  category: 'barber',
  is_visible: true
};

const emptyCut: CutForm = {
  name: '',
  description: '',
  price: '',
  stock: '100',
  image_url: '',
  is_visible: true
};

export default function AdminPanel() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<BarberLog[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reviews, setReviews] = useState<AppointmentReview[]>([]);
  const [barberApplications, setBarberApplications] = useState<BarberApplication[]>([]);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProduct);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [cutForm, setCutForm] = useState<CutForm>(emptyCut);
  const [editingCutId, setEditingCutId] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingServiceImage, setUploadingServiceImage] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    try {
      const [uData, pData, lData, aData] = await Promise.all([
        api.getUsers(),
        api.getProducts({ includeHidden: true }),
        api.getBarberLogs(),
        api.getAppointments(user.id)
      ]);
      const reviewData = await api.getAppointmentReviews(user.id);
      const applicationData = await api.getBarberApplications(user.id);
      setUsers(uData);
      setProducts(pData);
      setLogs(lData);
      setAppointments(aData);
      setReviews(reviewData);
      setBarberApplications(applicationData);
    } catch (error) {
      console.error(error);
    }
  };

  useAutoRefresh(fetchData, { intervalMs: 20000, enabled: user?.role === 'admin' });

  useRealtimeUserEvents(user?.id, async () => {
    if (user?.role !== 'admin') return;
    await fetchData();
  }, user?.role === 'admin');

  if (user?.role !== 'admin') {
    return <div className="p-8 text-center text-red-600 font-bold">Acceso Denegado. Exclusivo de Administrador.</div>;
  }

  const handleDeleteUser = async (id: string) => {
    if (!confirm('¿Eliminar usuario permanentemente?')) return;
    await api.deleteUser(id);
    fetchData();
  };

  const handleChangeRole = async (targetUser: User, role: 'user' | 'barber' | 'admin', approve: boolean = true) => {
    if (!user) return;
    try {
      await api.updateUserRole(user.id, targetUser.id, role, approve);
      await fetchData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: productForm.name,
      description: productForm.description,
      price: Number(productForm.price),
      stock: Number(productForm.stock),
      image_url: productForm.image_url,
      category: productForm.category,
      is_visible: productForm.is_visible
    } as Omit<Product, 'id'>;

    if (editingProductId) {
      await api.updateProduct(editingProductId, payload);
    } else {
      await api.addProduct(payload);
    }

    setProductForm(emptyProduct);
    setEditingProductId(null);
    fetchData();
  };

  const handleSubmitCut = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: cutForm.name,
      description: cutForm.description,
      price: Number(cutForm.price),
      stock: Number(cutForm.stock),
      image_url: cutForm.image_url,
      category: 'service',
      is_visible: cutForm.is_visible
    } as Omit<Product, 'id'>;

    if (editingCutId) {
      await api.updateProduct(editingCutId, payload);
    } else {
      await api.addProduct(payload);
    }

    setCutForm(emptyCut);
    setEditingCutId(null);
    fetchData();
  };

  const handleEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      description: product.description || '',
      price: String(product.price),
      stock: String(product.stock),
      image_url: product.image_url,
      category: product.category,
      is_visible: product.is_visible
    });
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Eliminar producto?')) return;
    await api.deleteProduct(id);
    fetchData();
  };

  const handleEditCut = (product: Product) => {
    setEditingCutId(product.id);
    setCutForm({
      name: product.name,
      description: product.description || '',
      price: String(product.price),
      stock: String(product.stock),
      image_url: product.image_url,
      is_visible: product.is_visible
    });
  };

  const handleDeleteCut = async (id: string) => {
    if (!confirm('¿Eliminar corte?')) return;
    await api.deleteProduct(id);
    fetchData();
  };

  const handleToggleCutVisibility = async (product: Product) => {
    await api.updateProduct(product.id, {
      name: product.name,
      description: product.description || '',
      price: product.price,
      stock: product.stock,
      image_url: product.image_url,
      category: 'service',
      is_visible: !product.is_visible
    });
    fetchData();
  };

  const handleToggleVisibility = async (product: Product) => {
    await api.updateProduct(product.id, {
      name: product.name,
      description: product.description || '',
      price: product.price,
      stock: product.stock,
      image_url: product.image_url,
      category: product.category,
      is_visible: !product.is_visible
    });
    fetchData();
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

  const handleAppointmentStatusChange = async (appointment: Appointment, status: Appointment['status']) => {
    if (!user) return;
    try {
      await api.updateAppointmentStatus({
        appointmentId: appointment.id,
        actorId: user.id,
        status
      });
      await fetchData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!user) return;
    if (!confirm('¿Eliminar esta cita? Se borrará por completo.')) return;
    try {
      await api.deleteAppointment(appointmentId, user.id);
      await fetchData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleToggleReviewPublication = async (review: AppointmentReview) => {
    if (!user) return;
    try {
      await api.updateAppointmentReview(review.id, user.id, !review.isPublished);
      await fetchData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!user) return;
    if (!confirm('¿Eliminar esta opinión?')) return;
    try {
      await api.deleteAppointmentReview(reviewId, user.id);
      await fetchData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleServiceImageUpload = async (file: File) => {
    if (!user) return;
    setUploadingServiceImage(true);
    try {
      const imageUrl = await api.uploadServiceImage(user.id, file);
      setProductForm((prev) => ({ ...prev, image_url: imageUrl }));
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploadingServiceImage(false);
    }
  };

  const handleCutImageUpload = async (file: File) => {
    if (!user) return;
    setUploadingServiceImage(true);
    try {
      const imageUrl = await api.uploadServiceImage(user.id, file);
      setCutForm((prev) => ({ ...prev, image_url: imageUrl }));
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploadingServiceImage(false);
    }
  };

  const handleRemoveProductImage = async (product: Product) => {
    if (!confirm('¿Quitar imagen de este producto?')) return;
    await api.updateProduct(product.id, {
      name: product.name,
      description: product.description || '',
      price: product.price,
      stock: product.stock,
      image_url: '',
      category: product.category,
      is_visible: product.is_visible
    });
    await fetchData();
  };

  const handleRemoveCutImage = async (product: Product) => {
    if (!confirm('¿Quitar imagen de este corte?')) return;
    await api.updateProduct(product.id, {
      name: product.name,
      description: product.description || '',
      price: product.price,
      stock: product.stock,
      image_url: '',
      category: 'service',
      is_visible: product.is_visible
    });
    await fetchData();
  };

  const pendingBarbers = users.filter((u) => !u.barber_approved);
  const applicationByUserId = new Map(barberApplications.map((app) => [app.userId, app]));
  const cuts = products.filter((p) => p.category === 'service');
  const storeProducts = products.filter((p) => p.category !== 'service');
  const categoryLabel = (category: Product['category']) => {
    if (category === 'barber') return 'BARBERIA';
    if (category === 'food') return 'COMIDA';
    if (category === 'drink') return 'BEBIDA';
    return 'SERVICIO';
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6">
      <div className="mb-6 bg-white border border-gray-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="Avatar admin" className="w-12 h-12 rounded-full object-cover border" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg uppercase">
              {user.name.charAt(0)}
            </div>
          )}
          <div>
            <p className="font-semibold">{user.name}</p>
            <p className="text-sm text-gray-500">Administrador</p>
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
        {user.avatar_url && (
          <button
            type="button"
            onClick={handleRemoveAvatar}
            className="text-sm text-red-600 hover:underline"
          >
            Quitar foto
          </button>
        )}
      </div>

      {pendingBarbers.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="font-semibold text-amber-800 mb-2">Postulaciones pendientes para Barbero</p>
          <div className="flex flex-wrap gap-2">
            {pendingBarbers.map((barber) => (
              <div key={barber.id} className="flex items-center gap-2 bg-white/70 rounded-lg p-2 border border-amber-200">
                {(() => {
                  const application = applicationByUserId.get(barber.id);
                  return (
                <div className="text-sm text-amber-900 min-w-0">
                  <div className="font-medium truncate">{barber.name}</div>
                  <div className="text-xs text-amber-700 truncate">{barber.email}</div>
                  {application && (
                    <>
                      <div className="text-xs text-amber-800 mt-1">
                        {application.experienceYears} años exp. | {application.availability}
                      </div>
                      <div className="text-xs text-amber-900/90 mt-1 line-clamp-2">
                        {application.specialties} · {application.motivation}
                      </div>
                    </>
                  )}
                </div>
                  );
                })()}
                <button
                  onClick={() => handleChangeRole(barber, 'barber', true)}
                  className="px-3 py-1 rounded-lg bg-amber-600 text-white text-sm"
                >
                  Aprobar
                </button>
                <button
                  onClick={() => handleChangeRole(barber, 'user', true)}
                  className="px-3 py-1 rounded-lg bg-slate-700 text-white text-sm"
                >
                  Rechazar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-8 flex flex-wrap gap-3 pb-2">
        <button onClick={() => setActiveTab('users')} className={`px-4 sm:px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>
          <Users className="w-5 h-5" /> <span className="hidden sm:inline">Usuarios</span><span className="sm:hidden">Us</span>
        </button>
        <button onClick={() => setActiveTab('products')} className={`px-4 sm:px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${activeTab === 'products' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>
          <ShoppingBag className="w-5 h-5" /> <span className="hidden sm:inline">Catálogo</span><span className="sm:hidden">Cat</span>
        </button>
        <button onClick={() => setActiveTab('cuts')} className={`px-4 sm:px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${activeTab === 'cuts' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>
          <Scissors className="w-5 h-5" /> <span className="hidden sm:inline">Cortes</span><span className="sm:hidden">Ctr</span>
        </button>
        <button onClick={() => setActiveTab('chatAdmin')} className={`px-4 sm:px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${activeTab === 'chatAdmin' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>
          <MessageSquare className="w-5 h-5" /> <span className="hidden sm:inline">Chat</span><span className="sm:hidden">Msg</span>
        </button>
        <button onClick={() => setActiveTab('appointments')} className={`px-4 sm:px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${activeTab === 'appointments' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>
          <CalendarDays className="w-5 h-5" /> <span className="hidden sm:inline">Citas</span><span className="sm:hidden">Cts</span>
        </button>
        <button onClick={() => setActiveTab('reviews')} className={`px-4 sm:px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${activeTab === 'reviews' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>
          <MessageSquare className="w-5 h-5" /> <span className="hidden sm:inline">Opiniones</span><span className="sm:hidden">Op</span>
        </button>
        <button onClick={() => setActiveTab('logs')} className={`px-4 sm:px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${activeTab === 'logs' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>
          <ClipboardList className="w-5 h-5" /> <span className="hidden sm:inline">Registros</span><span className="sm:hidden">Reg</span>
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100"><h2 className="text-lg sm:text-xl font-bold">Gestión de Usuarios y Roles</h2></div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="p-4">Nombre</th>
                <th className="p-4">Email</th>
                <th className="p-4">Rol</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="p-4">{u.name}</td>
                  <td className="p-4">{u.email}</td>
                  <td className="p-4 uppercase font-semibold text-sm">{u.role}</td>
                  <td className="p-4 text-sm">
                    {!u.barber_approved ? 'Postulado (pendiente)' : (u.role === 'barber' ? 'Barbero activo' : 'Activo')}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <button onClick={() => handleChangeRole(u, 'user', true)} className="px-2 py-1 text-xs rounded bg-slate-200">Cliente</button>
                      <button onClick={() => handleChangeRole(u, 'barber', true)} className="px-2 py-1 text-xs rounded bg-amber-200">Barbero</button>
                      {u.barber_approved === false && (
                        <button onClick={() => handleChangeRole(u, 'barber', true)} className="px-2 py-1 text-xs rounded bg-green-600 text-white">Aprobar postulación</button>
                      )}
                      <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-1 bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-4">{editingProductId ? 'Editar producto tienda' : 'Agregar producto tienda'}</h2>
            <form onSubmit={handleSubmitProduct} className="space-y-3">
              <input required type="text" placeholder="Nombre" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} className="w-full p-2 border rounded" />
              <textarea placeholder="Descripción" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} className="w-full p-2 border rounded" rows={2} />
              <select value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value as ProductForm['category'] })} className="w-full p-2 border rounded">
                <option value="barber">Barberia (Tienda)</option>
                <option value="food">Comida (Tienda)</option>
                <option value="drink">Bebida (Tienda)</option>
              </select>
              <input required type="number" step="0.01" placeholder="Precio" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} className="w-full p-2 border rounded" />
              <input required type="number" placeholder="Stock" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} className="w-full p-2 border rounded" />
              <input type="url" placeholder="URL Imagen" value={productForm.image_url} onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })} className="w-full p-2 border rounded" />
              {productForm.image_url && (
                <div className="space-y-2">
                  <img src={productForm.image_url} alt="Vista previa" className="w-20 h-20 rounded object-cover border" />
                  <button type="button" onClick={() => setProductForm((prev) => ({ ...prev, image_url: '' }))} className="text-sm text-red-600 hover:underline">
                    Quitar imagen seleccionada
                  </button>
                </div>
              )}
              <label className="block text-sm text-indigo-600 cursor-pointer hover:underline">
                {uploadingServiceImage ? 'Subiendo imagen...' : 'Subir imagen desde archivo'}
                <input
                  type="file"
                  className="hidden"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={uploadingServiceImage}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleServiceImageUpload(file);
                    e.currentTarget.value = '';
                  }}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={productForm.is_visible} onChange={(e) => setProductForm({ ...productForm, is_visible: e.target.checked })} />
                Visible para usuarios
              </label>
              <button className="w-full bg-indigo-600 text-white py-2 rounded font-bold">{editingProductId ? 'Guardar cambios' : 'Guardar ítem'}</button>
              {editingProductId && (
                <button type="button" onClick={() => { setEditingProductId(null); setProductForm(emptyProduct); }} className="w-full bg-slate-200 py-2 rounded font-semibold">
                  Cancelar edición
                </button>
              )}
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="p-3">Ítem</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Precio</th>
                  <th className="p-3">Visibilidad</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {storeProducts.map((p) => (
                  <tr key={p.id}>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img src={p.image_url || 'https://via.placeholder.com/80?text=Item'} alt={p.name} className="w-12 h-12 rounded object-cover" />
                        <div>
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-xs text-gray-500">Stock: {p.stock}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 uppercase text-xs font-semibold">{categoryLabel(p.category)}</td>
                    <td className="p-3">${p.price.toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${p.is_visible ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                        {p.is_visible ? 'Visible' : 'Oculto'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleEditProduct(p)} className="p-2 text-indigo-600"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleToggleVisibility(p)} className="px-2 py-1 text-xs rounded bg-slate-100">{p.is_visible ? 'Ocultar' : 'Mostrar'}</button>
                        <button onClick={() => handleRemoveProductImage(p)} className="px-2 py-1 text-xs rounded bg-red-50 text-red-700">Quitar imagen</button>
                        <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'cuts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-1 bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-2">{editingCutId ? 'Editar corte' : 'Agregar corte'}</h2>
            <p className="text-sm text-gray-500 mb-4">Este apartado se usa para los servicios que el cliente puede agendar.</p>
            <form onSubmit={handleSubmitCut} className="space-y-3">
              <input required type="text" placeholder="Nombre del corte" value={cutForm.name} onChange={(e) => setCutForm({ ...cutForm, name: e.target.value })} className="w-full p-2 border rounded" />
              <textarea required placeholder="Información del corte" value={cutForm.description} onChange={(e) => setCutForm({ ...cutForm, description: e.target.value })} className="w-full p-2 border rounded" rows={3} />
              <input required type="number" step="0.01" placeholder="Precio" value={cutForm.price} onChange={(e) => setCutForm({ ...cutForm, price: e.target.value })} className="w-full p-2 border rounded" />
              <input type="url" placeholder="URL Imagen" value={cutForm.image_url} onChange={(e) => setCutForm({ ...cutForm, image_url: e.target.value })} className="w-full p-2 border rounded" />
              {cutForm.image_url && (
                <div className="space-y-2">
                  <img src={cutForm.image_url} alt="Vista previa corte" className="w-20 h-20 rounded object-cover border" />
                  <button type="button" onClick={() => setCutForm((prev) => ({ ...prev, image_url: '' }))} className="text-sm text-red-600 hover:underline">
                    Quitar imagen seleccionada
                  </button>
                </div>
              )}
              <label className="block text-sm text-indigo-600 cursor-pointer hover:underline">
                {uploadingServiceImage ? 'Subiendo imagen...' : 'Subir imagen del corte'}
                <input
                  type="file"
                  className="hidden"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={uploadingServiceImage}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCutImageUpload(file);
                    e.currentTarget.value = '';
                  }}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={cutForm.is_visible} onChange={(e) => setCutForm({ ...cutForm, is_visible: e.target.checked })} />
                Visible para agendar
              </label>
              <button className="w-full bg-indigo-600 text-white py-2 rounded font-bold">{editingCutId ? 'Guardar corte' : 'Crear corte'}</button>
              {editingCutId && (
                <button type="button" onClick={() => { setEditingCutId(null); setCutForm(emptyCut); }} className="w-full bg-slate-200 py-2 rounded font-semibold">
                  Cancelar edición
                </button>
              )}
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="p-3">Corte</th>
                  <th className="p-3">Precio</th>
                  <th className="p-3">Visibilidad</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {cuts.map((cut) => (
                  <tr key={cut.id}>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img src={cut.image_url || 'https://via.placeholder.com/80?text=Corte'} alt={cut.name} className="w-12 h-12 rounded object-cover" />
                        <div>
                          <p className="font-semibold">{cut.name}</p>
                          <p className="text-xs text-gray-500 line-clamp-2">{cut.description || 'Sin información'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">${cut.price.toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${cut.is_visible ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                        {cut.is_visible ? 'Visible' : 'Oculto'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleEditCut(cut)} className="p-2 text-indigo-600"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleToggleCutVisibility(cut)} className="px-2 py-1 text-xs rounded bg-slate-100">{cut.is_visible ? 'Ocultar' : 'Mostrar'}</button>
                        <button onClick={() => handleRemoveCutImage(cut)} className="px-2 py-1 text-xs rounded bg-red-50 text-red-700">Quitar imagen</button>
                        <button onClick={() => handleDeleteCut(cut.id)} className="p-2 text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'chatAdmin' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5">
            <h2 className="text-xl font-bold mb-4">Chat con Barberos</h2>
            <div className="space-y-3">
              {users.filter((u) => u.role === 'barber').map((barber) => (
                <div key={barber.id} className="border rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {barber.avatar_url ? (
                      <img src={barber.avatar_url} alt={barber.name} className="w-10 h-10 rounded-full object-cover border shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold uppercase shrink-0">
                        {barber.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{barber.name}</p>
                      <p className="text-xs text-gray-500 truncate">{barber.email}</p>
                    </div>
                  </div>
                  <Link to={`/chat?peerId=${barber.id}`} className="px-3 py-1.5 rounded bg-indigo-600 text-white text-xs font-semibold">
                    Abrir chat
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5">
            <h2 className="text-xl font-bold mb-4">Chat con Clientes Registrados</h2>
            <div className="space-y-3">
              {users.filter((u) => u.role === 'user').map((client) => (
                <div key={client.id} className="border rounded-lg p-3 flex items-center justify-between">
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
                  <Link to={`/chat?peerId=${client.id}`} className="px-3 py-1.5 rounded bg-indigo-600 text-white text-xs font-semibold">
                    Abrir chat
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'appointments' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100"><h2 className="text-lg sm:text-xl font-bold">Citas Agendadas</h2></div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="p-4">Fecha</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Barbero</th>
                <th className="p-4">Servicio</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Acción</th>
                <th className="p-4 text-center">Borrar</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {appointments.map((a) => (
                <tr key={a.id}>
                  <td className="p-4 text-sm">{new Date(a.appointmentDate).toLocaleString()}</td>
                  <td className="p-4">{a.clientName}</td>
                  <td className="p-4">{a.barberName}</td>
                  <td className="p-4">{a.serviceName}</td>
                  <td className="p-4 uppercase text-xs font-semibold">{a.status}</td>
                  <td className="p-4">
                    <select
                      value={a.status}
                      onChange={(e) => handleAppointmentStatusChange(a, e.target.value as Appointment['status'])}
                      className="p-2 border rounded text-xs"
                    >
                      <option value="pending">Pendiente</option>
                      <option value="confirmed">Confirmada</option>
                      <option value="completed">Completada</option>
                      <option value="cancelled">Cancelada</option>
                    </select>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleDeleteAppointment(a.id)} className="px-3 py-2 rounded bg-red-600 text-white text-xs font-semibold">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold">Calificaciones y Opiniones</h2>
            <p className="text-sm text-gray-500 mt-1">Publica o quita opiniones para mostrarlas en la página principal.</p>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="p-4">Cliente</th>
                <th className="p-4">Servicio</th>
                <th className="p-4">Puntuación</th>
                <th className="p-4">Comentario</th>
                <th className="p-4">Publicada</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reviews.map((review) => (
                <tr key={review.id}>
                  <td className="p-4">{review.userName}</td>
                  <td className="p-4">{review.serviceName}</td>
                  <td className="p-4 font-semibold">{review.rating}/5</td>
                  <td className="p-4 text-sm max-w-md">{review.comment}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${review.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                      {review.isPublished ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleToggleReviewPublication(review)}
                        className="px-2 py-1 rounded bg-indigo-600 text-white text-xs"
                      >
                        {review.isPublished ? 'Quitar de Inicio' : 'Publicar en Inicio'}
                      </button>
                      <button onClick={() => handleDeleteReview(review.id)} className="p-2 text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100"><h2 className="text-lg sm:text-xl font-bold">Actividad de Barberos</h2></div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="p-4">Fecha</th>
                <th className="p-4">Barbero</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Detalle</th>
                <th className="p-4">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[...logs].reverse().map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="p-4 text-sm">{new Date(l.date).toLocaleString()}</td>
                  <td className="p-4 font-bold">{l.barberName}</td>
                  <td className="p-4"><span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">{l.type}</span></td>
                  <td className="p-4">{l.name}</td>
                  <td className="p-4 text-green-600 font-bold">${l.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
