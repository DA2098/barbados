import { useState, useMemo } from 'react';
import { api, User, Product, BarberLog, BarberApplication, Appointment, AppointmentReview, AdminChatSession, Message } from '../services/api';
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
  category: 'barber' | 'food' | 'drink' | 'service';
  is_visible: boolean;
};

type CutForm = {
  name: string;
  description: string;
  price: string;
  stock: string;
  image_url: string;
  duration_minutes: string;
  is_visible: boolean;
};

type NewUserForm = {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: 'user' | 'barber';
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
  duration_minutes: '30',
  is_visible: true
};

const emptyNewUser: NewUserForm = {
  name: '',
  email: '',
  password: '',
  phone: '',
  role: 'user'
};

export default function AdminPanel() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<BarberLog[]>([]);
  const [barberApplications, setBarberApplications] = useState<BarberApplication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reviews, setReviews] = useState<AppointmentReview[]>([]);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProduct);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [cutForm, setCutForm] = useState<CutForm>(emptyCut);
  const [editingCutId, setEditingCutId] = useState<string | null>(null);
  const [newUserForm, setNewUserForm] = useState<NewUserForm>(emptyNewUser);
  const [creatingUser, setCreatingUser] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingServiceImage, setUploadingServiceImage] = useState(false);
  const [chats, setChats] = useState<AdminChatSession[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  
  const chatCountsByBarber = useMemo(() => {
    const map: Record<string, number> = {};
    chats.forEach((c) => {
      const id = c.barber?.id;
      if (!id) return;
      map[id] = (map[id] || 0) + 1;
    });
    return map;
  }, [chats]);

  const fetchData = async () => {
    if (!user) return;
    try {
      const [uData, pData, sData, lData, applicationData, appointmentData, reviewData, chatData] = await Promise.all([
        api.getUsers(),
        api.getProducts({ includeHidden: true }),
        api.getServices({ includeHidden: true }),
        api.getBarberLogs(),
        api.getBarberApplications(user.id),
        api.getAppointments(user.id),
        api.getAppointmentReviews(),
        api.getAdminChatMonitor(user.id)
      ]);
      console.log('✓ Datos cargados - Products:', pData, 'Services:', sData);
      setUsers(uData);
      setProducts([...pData, ...sData]);
      setLogs(lData);
      setBarberApplications(applicationData);
      setAppointments(appointmentData);
      setReviews(reviewData);
      setChats(chatData);
    } catch (error: any) {
      console.error('Error en fetchData:', error);
      alert(`Error al cargar datos: ${error.message}`);
    }
  };

  const loadConversationMessages = async (conversationId: string | null) => {
    if (!user || !conversationId) return;
    try {
      const msgs = await api.getMessages(conversationId, user.id);
      setConversationMessages(msgs);
    } catch (err: any) {
      console.error('Error cargando mensajes de conversación:', err.message);
      setConversationMessages([]);
    }
  };

  const sendAdminMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !selectedConversationId || !messageText.trim()) return;
    try {
      await api.sendMessage(selectedConversationId, user.id, { messageType: 'text', body: messageText.trim() });
      setMessageText('');
      await loadConversationMessages(selectedConversationId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  useAutoRefresh(fetchData, { intervalMs: 20000, enabled: user?.role === 'admin' });

  useRealtimeUserEvents(user?.id, async () => {
    if (user?.role !== 'admin') return;
    await fetchData();
    if (selectedConversationId) {
      await loadConversationMessages(selectedConversationId);
    }
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newUserForm.name || !newUserForm.email || !newUserForm.password) {
      alert('Por favor llena todos los campos');
      return;
    }

    setCreatingUser(true);
    try {
      if (newUserForm.role === 'barber') {
        await api.createBarber(user.id, newUserForm.name, newUserForm.email, newUserForm.password, newUserForm.phone);
      } else {
        await api.createClient(user.id, newUserForm.name, newUserForm.email, newUserForm.password, newUserForm.phone);
      }

      setNewUserForm(emptyNewUser);
      setCreatingUser(false);
      await fetchData();
    } catch (error: any) {
      setCreatingUser(false);
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
      duration_minutes: 0,
      is_visible: productForm.is_visible
    } as Omit<Product, 'id'>;

    try {
      if (editingProductId) {
        await api.updateProduct(editingProductId, payload);
      } else {
        await api.addProduct(payload);
      }

      setProductForm(emptyProduct);
      setEditingProductId(null);
      await fetchData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleSubmitCut = async (e: React.FormEvent) => {
    e.preventDefault();

    // Normalize and validate duration minutes
    const duration = Math.max(0, Math.floor(Number(cutForm.duration_minutes || 0)));
    if (isNaN(duration) || duration <= 0) {
      alert('Por favor ingresa una duración válida en minutos (mayor que 0)');
      return;
    }

    const payload = {
      name: cutForm.name,
      description: cutForm.description,
      price: Number(cutForm.price),
      stock: Number(cutForm.stock),
      image_url: cutForm.image_url,
      category: 'service',
      duration_minutes: duration,
      is_visible: cutForm.is_visible
    } as Omit<Product, 'id'>;

    try {
      if (editingCutId) {
        await api.updateProduct(editingCutId, payload);
      } else {
        await api.addProduct(payload);
      }

      setCutForm(emptyCut);
      setEditingCutId(null);
      await fetchData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
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

  const handleDeleteProduct = async (id: string, category: Product['category']) => {
    if (!confirm('¿Eliminar producto?')) return;
    await api.deleteProduct(id, category);
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
      duration_minutes: String(Math.floor(product.duration_minutes || 30)),
      is_visible: product.is_visible
    });
  };

  const handleDeleteCut = async (id: string) => {
    if (!confirm('¿Eliminar corte?')) return;
    await api.deleteProduct(id, 'service');
    fetchData();
  };

  const handleAppointmentStatus = async (appointment: Appointment, status: Appointment['status']) => {
    if (!user) return;
    await api.updateAppointmentStatus({ appointmentId: appointment.id, actorId: user.id, status });
    await fetchData();
  };

  const handleDeleteLog = async (logId: string) => {
    if (!confirm('¿Eliminar este registro de barbero?')) return;
    try {
      await api.deleteBarberLog(logId);
      await fetchData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteLogsByRange = async (dateRange: 'today' | 'month' | 'year') => {
    const labels = { today: 'hoy', month: 'este mes', year: 'este año' };
    if (!confirm(`¿Eliminar TODOS los registros de ${labels[dateRange]}? No se puede deshacer.`)) return;
    try {
      await api.deleteBarberLogsByRange(dateRange);
      await fetchData();
      alert(`Registros de ${labels[dateRange]} eliminados`);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteAppointment = async (appointment: Appointment) => {
    if (!user) return;
    if (!confirm('¿Eliminar esta cita?')) return;
    await api.deleteAppointment(appointment.id, user.id);
    await fetchData();
  };

  const handlePublishReview = async (review: AppointmentReview) => {
    if (!user) return;
    await api.updateAppointmentReview(review.id, user.id, !review.isPublished);
    await fetchData();
  };

  const handleDeleteReview = async (review: AppointmentReview) => {
    if (!user) return;
    if (!confirm('¿Eliminar esta opinión?')) return;
    await api.deleteAppointmentReview(review.id, user.id);
    await fetchData();
  };

  const handleToggleCutVisibility = async (product: Product) => {
    await api.updateProduct(product.id, {
      name: product.name,
      description: product.description || '',
      price: product.price,
      stock: product.stock,
      image_url: product.image_url,
      category: 'service',
      duration_minutes: product.duration_minutes ?? 0,
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
      duration_minutes: product.duration_minutes ?? 0,
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
      duration_minutes: product.duration_minutes ?? 0,
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
      duration_minutes: product.duration_minutes ?? 0,
      is_visible: product.is_visible
    });
    await fetchData();
  };

  const pendingBarbers = users.filter((u) => !u.barber_approved);
  const applicationByUserId = new Map(barberApplications.map((app) => [app.userId, app]));
  const cuts = products.filter((p) => p.category === 'service');
  
  const storeProducts = products.filter((p) => p.category !== 'service');
  const todayKey = new Date().toDateString();
  const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const summaryLogs = logs.filter((log) => log.type || log.name);

  const normalizeType = (t: string | undefined) => {
    if (!t) return 'other';
    const lower = t.toString().toLowerCase();
    if (lower.includes('cort')) return 'cortes';
    if (lower.includes('barber')) return 'barberia';
    if (lower.includes('menu') || lower.includes('lancer')) return 'lanceria';
    if (lower.includes('beb') || lower.includes('drink')) return 'bebidas';
    return 'other';
  };

  const todayByCategory = { cortes: 0, barberia: 0, lanceria: 0, bebidas: 0 };
  const monthByCategory = { cortes: 0, barberia: 0, lanceria: 0, bebidas: 0 };

  summaryLogs.forEach((log) => {
    // BarberLog only exposes `date` and `name`/`type`/`price` per interface
    const d = new Date(log.date ?? '');
    const logDay = d.toDateString();
    const logMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const cat = normalizeType(log.type || log.name);
    const price = Number(log.price || 0);

    if (logDay === todayKey) {
      if (cat in todayByCategory) todayByCategory[cat as keyof typeof todayByCategory] += price;
    }
    if (logMonthKey === currentMonthKey) {
      if (cat in monthByCategory) monthByCategory[cat as keyof typeof monthByCategory] += price;
    }
  });

  const todayTotal = Object.values(todayByCategory).reduce((a, b) => a + b, 0);
  const monthTotal = Object.values(monthByCategory).reduce((a, b) => a + b, 0);
  const monthLosses = 0;
  const categoryLabel = (category: Product['category']) => {
    if (category === 'barber') return 'BARBERÍA';
    if (category === 'food') return 'LANCERIA';
    if (category === 'drink') return 'BEBIDA';
    return 'BARBERÍA';
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6">
      <div className="mb-6 glass-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="Avatar admin" className="w-12 h-12 rounded-full object-cover border" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-white/10 text-contrast flex items-center justify-center font-bold text-lg uppercase border border-white/20">
              {user.name.charAt(0)}
            </div>
          )}
          <div>
            <p className="font-semibold text-contrast">{user.name}</p>
            <p className="text-sm muted">Administrador</p>
          </div>
        </div>
        <label className="text-sm text-contrast cursor-pointer hover:opacity-80 transition-opacity sm:text-right">
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
        <div className="mb-6 glass-card rounded-xl p-4">
          <p className="font-semibold text-contrast mb-2">Postulaciones Pendientes de Barberos</p>
          <div className="flex flex-wrap gap-3">
            {pendingBarbers.map((barber) => (
                <div key={barber.id} className="flex items-center gap-2 glass-card rounded-lg p-3 border border-white/20">
                {(() => {
                  const application = applicationByUserId.get(barber.id);
                  return (
                <div className="text-sm text-contrast min-w-0">
                  <div className="font-medium truncate">{barber.name}</div>
                  <div className="text-xs muted truncate">{barber.email}</div>
                  {application && (
                    <>
                      <div className="text-xs text-contrast/80 mt-1">
                        {application.experienceYears} años exp. | {application.availability}
                      </div>
                      <div className="text-xs muted mt-1 line-clamp-2">
                        {application.specialties} · {application.motivation}
                      </div>
                    </>
                  )}
                </div>
                  );
                })()}
                <button
                  onClick={() => handleChangeRole(barber, 'barber', true)}
                  className="px-3 py-1 rounded-lg accent-btn text-sm"
                >
                  Aprobar
                </button>
                <button
                  onClick={() => handleChangeRole(barber, 'user', true)}
                  className="px-3 py-1 rounded-lg border border-white/20 text-contrast hover:border-white/40 transition-colors text-sm"
                >
                  Rechazar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-8 flex flex-wrap gap-3 pb-2">
        <button onClick={() => setActiveTab('users')} className={`px-4 sm:px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${
          activeTab === 'users' ? 'accent-btn' : 'nav-btn'
        }`}>
          <Users className="w-5 h-5" /> <span className="hidden sm:inline">Usuarios</span><span className="sm:hidden">Us</span>
        </button>
        <button onClick={() => setActiveTab('create-user')} className={`px-4 sm:px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${
          activeTab === 'create-user' ? 'accent-btn' : 'nav-btn'
        }`}>
          <Users className="w-5 h-5" /> <span className="hidden sm:inline">Crear Usuario</span><span className="sm:hidden">+Us</span>
        </button>
        <button onClick={() => setActiveTab('products')} className={`px-4 sm:px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${
          activeTab === 'products' ? 'accent-btn' : 'nav-btn'
        }`}>
          <ShoppingBag className="w-5 h-5" /> <span className="hidden sm:inline">Catálogo</span><span className="sm:hidden">Cat</span>
        </button>
        <button onClick={() => setActiveTab('cuts')} className={`px-4 sm:px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${
          activeTab === 'cuts' ? 'accent-btn' : 'nav-btn'
        }`}>
          <Scissors className="w-5 h-5" /> <span className="hidden sm:inline">Cortes</span><span className="sm:hidden">Cort</span>
        </button>
        <button onClick={() => setActiveTab('chatAdmin')} className={`px-4 sm:px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${
          activeTab === 'chatAdmin' ? 'accent-btn' : 'nav-btn'
        }`}>
          <MessageSquare className="w-5 h-5" /> <span className="hidden sm:inline">Chat</span><span className="sm:hidden">Msg</span>
        </button>
        <button onClick={() => setActiveTab('appointments')} className={`px-4 sm:px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${
          activeTab === 'appointments' ? 'accent-btn' : 'nav-btn'
        }`}>
          <CalendarDays className="w-5 h-5" /> <span className="hidden sm:inline">Citas</span><span className="sm:hidden">Cts</span>
        </button>
        <button onClick={() => setActiveTab('reviews')} className={`px-4 sm:px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${
          activeTab === 'reviews' ? 'accent-btn' : 'nav-btn'
        }`}>
          <MessageSquare className="w-5 h-5" /> <span className="hidden sm:inline">Opiniones</span><span className="sm:hidden">Op</span>
        </button>
        <button onClick={() => setActiveTab('logs')} className={`px-4 sm:px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${
          activeTab === 'logs' ? 'accent-btn' : 'nav-btn'
        }`}>
          <ClipboardList className="w-5 h-5" /> <span className="hidden sm:inline">Registros</span><span className="sm:hidden">Reg</span>
        </button>
      </div>

      {activeTab === 'create-user' && (
        <div className="glass-card rounded-xl overflow-hidden max-w-2xl mx-auto">
          <div className="p-4 sm:p-6 border-b border-white/10">
            <h2 className="text-lg sm:text-xl font-bold text-contrast">Crear Nuevo Usuario</h2>
            <p className="text-sm muted mt-2">Crea barberos y clientes directamente con credenciales de acceso</p>
          </div>
          <div className="p-4 sm:p-6">
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-contrast mb-2">Nombre completo *</label>
                  <input
                    required
                    type="text"
                    placeholder="Ej: Juan García"
                    value={newUserForm.name}
                    onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                    className="w-full p-2 form-input border border-white/20 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-contrast mb-2">Correo electrónico *</label>
                  <input
                    required
                    type="email"
                    placeholder="Ej: juan@ejemplo.com"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    className="w-full p-2 form-input border border-white/20 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-contrast mb-2">Contraseña *</label>
                  <input
                    required
                    type="password"
                    placeholder="Contraseña segura"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    className="w-full p-2 form-input border border-white/20 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-contrast mb-2">Teléfono</label>
                  <input
                    type="tel"
                    placeholder="Ej: +1234567890"
                    value={newUserForm.phone}
                    onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                    className="w-full p-2 form-input border border-white/20 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-contrast mb-2">Tipo de usuario *</label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as 'user' | 'barber' })}
                  className="w-full p-2 form-input border border-white/20 rounded-lg"
                >
                  <option value="user">Cliente</option>
                  <option value="barber">Barbero</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={creatingUser}
                className="w-full accent-btn py-3 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingUser ? 'Creando usuario...' : 'Crear usuario'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100"><h2 className="text-lg sm:text-xl font-bold text-contrast">Gestión de Usuarios y Roles</h2></div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="border-b border-white/10">
              <tr>
                <th className="p-4 text-contrast font-semibold">Nombre</th>
                <th className="p-4 text-contrast font-semibold">Email</th>
                <th className="p-4 text-contrast font-semibold">Rol</th>
                <th className="p-4 text-contrast font-semibold">Estado</th>
                <th className="p-4 text-center text-contrast font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 text-contrast">{u.name}</td>
                  <td className="p-4 text-contrast">{u.email}</td>
                  <td className="p-4 uppercase font-semibold text-sm text-contrast">{u.role}</td>
                  <td className="p-4 text-sm text-contrast">
                    {!u.barber_approved ? 'Postulado (pendiente)' : (u.role === 'barber' ? 'Barbero activo' : 'Activo')}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <button onClick={() => handleChangeRole(u, 'user', true)} className="px-2 py-1 text-xs rounded accent-btn">Cliente</button>
                      <button onClick={() => handleChangeRole(u, 'barber', true)} className="px-2 py-1 text-xs rounded border border-white/20 text-contrast hover:border-white/40 transition-colors">Barbero</button>
                      {u.barber_approved === false && (
                        <button onClick={() => handleChangeRole(u, 'barber', true)} className="px-2 py-1 text-xs rounded bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30 transition-colors">Aprobar</button>
                      )}
                      <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 p-1 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
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
          <div className="lg:col-span-1 glass-card p-4 sm:p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-4">{editingProductId ? 'Editar producto tienda' : 'Agregar producto tienda'}</h2>
            <form onSubmit={handleSubmitProduct} className="space-y-3">
              <input required type="text" placeholder="Nombre" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} className="w-full p-2 border rounded" />
              <textarea placeholder="Descripción" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} className="w-full p-2 border rounded" rows={2} />
              <select value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value as ProductForm['category'] })} className="w-full p-2 border rounded">
                <option value="barber">Barbería (Tienda)</option>
                <option value="food">Lanceria (Tienda)</option>
                <option value="drink">Bebida (Tienda)</option>
              </select>
              <input required type="number" step="0.01" placeholder="Precio" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} className="w-full p-2 border rounded" />
              <input required type="number" placeholder="Stock" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} className="w-full p-2 border rounded" />
              <input type="url" placeholder="URL Imagen" value={productForm.image_url} onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })} className="w-full p-2 border rounded" />
              {productForm.image_url && (
                <div className="space-y-2">
                  <a href={productForm.image_url} target="_blank" rel="noreferrer">
                    <img src={productForm.image_url} alt="Vista previa" className="w-20 h-20 rounded object-cover border" />
                  </a>
                  <div className="flex gap-2 items-center">
                    <input readOnly value={productForm.image_url} className="w-full p-2 text-xs truncate border rounded bg-transparent" />
                    <button type="button" onClick={() => { navigator.clipboard?.writeText(productForm.image_url); }} className="px-2 py-1 text-sm nav-btn">Copiar</button>
                    <button type="button" onClick={() => setProductForm((prev) => ({ ...prev, image_url: '' }))} className="text-sm text-red-600 hover:underline">
                      Quitar
                    </button>
                  </div>
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
              <button className="w-full accent-btn py-2 rounded font-bold">{editingProductId ? 'Guardar cambios' : 'Guardar ítem'}</button>
              {editingProductId && (
                <button type="button" onClick={() => { setEditingProductId(null); setProductForm(emptyProduct); }} className="w-full nav-btn py-2 rounded font-semibold">
                  Cancelar edición
                </button>
              )}
            </form>
          </div>

          <div className="lg:col-span-2 glass-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="border-b border-white/10">
                <tr>
                  <th className="p-3 text-contrast font-semibold">Ítem</th>
                  <th className="p-3 text-contrast font-semibold">Tipo</th>
                  <th className="p-3 text-contrast font-semibold">Precio</th>
                  <th className="p-3 text-contrast font-semibold">Visibilidad</th>
                  <th className="p-3 text-center text-contrast font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {storeProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-8 align-top">
                      <div className="flex items-center gap-3">
                        <a href={p.image_url || 'https://via.placeholder.com/480?text=Item'} target="_blank" rel="noreferrer">
                          <img src={p.image_url || 'https://via.placeholder.com/480?text=Item'} alt={p.name} className="w-80 h-80 object-contain shrink-0 rounded bg-white/5 p-1" />
                        </a>
                        <div>
                          <p className="font-semibold text-contrast">{p.name}</p>
                          <p className="text-xs muted">Stock: {p.stock}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 uppercase text-xs font-semibold text-contrast">{categoryLabel(p.category)}</td>
                    <td className="p-3 text-contrast">${p.price.toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        p.is_visible ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/10 text-contrast border border-white/20'
                      }`}>
                        {p.is_visible ? 'Visible' : 'Oculto'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleEditProduct(p)} className="p-2 text-contrast hover:opacity-70 transition-opacity"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleToggleVisibility(p)} className="px-2 py-1 text-xs rounded nav-btn">{p.is_visible ? 'Ocultar' : 'Mostrar'}</button>
                        <button onClick={() => handleRemoveProductImage(p)} className="px-2 py-1 text-xs rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">Quitar imagen</button>
                        <button onClick={() => handleDeleteProduct(p.id, p.category)} className="p-2 text-red-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
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
          <div className="lg:col-span-1 glass-card p-4 sm:p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-2 text-contrast">{editingCutId ? 'Editar corte' : 'Agregar corte'}</h2>
            <p className="text-sm muted mb-4">Este apartado se usa para los servicios que el cliente puede agendar.</p>
            <form onSubmit={handleSubmitCut} className="space-y-3">
              <input required type="text" placeholder="Nombre del corte" value={cutForm.name} onChange={(e) => setCutForm({ ...cutForm, name: e.target.value })} className="w-full p-2 form-input" />
              <textarea required placeholder="Información del corte" value={cutForm.description} onChange={(e) => setCutForm({ ...cutForm, description: e.target.value })} className="w-full p-2 form-input" rows={3} />
              <input required type="number" step="0.01" placeholder="Precio" value={cutForm.price} onChange={(e) => setCutForm({ ...cutForm, price: e.target.value })} className="w-full p-2 form-input" />
              <input
                required
                type="number"
                min={1}
                step={1}
                placeholder="Duración (min)"
                value={cutForm.duration_minutes}
                onChange={(e) => {
                  // keep only integer minutes
                  const raw = e.target.value;
                  const num = raw === '' ? '' : String(Math.max(0, Math.floor(Number(raw))));
                  setCutForm({ ...cutForm, duration_minutes: num });
                }}
                className="w-full p-2 form-input"
              />
              <input type="url" placeholder="URL Imagen" value={cutForm.image_url} onChange={(e) => setCutForm({ ...cutForm, image_url: e.target.value })} className="w-full p-2 form-input" />
              {cutForm.image_url && (
                <div className="space-y-2">
                  <a href={cutForm.image_url} target="_blank" rel="noreferrer">
                    <img src={cutForm.image_url} alt="Vista previa corte" className="w-20 h-20 rounded object-cover border border-white/20" />
                  </a>
                  <div className="flex gap-2 items-center">
                    <input readOnly value={cutForm.image_url} className="w-full p-2 text-xs truncate border rounded bg-transparent" />
                    <button type="button" onClick={() => { navigator.clipboard?.writeText(cutForm.image_url); }} className="px-2 py-1 text-sm nav-btn">Copiar</button>
                    <button type="button" onClick={() => setCutForm((prev) => ({ ...prev, image_url: '' }))} className="text-sm text-red-400 hover:opacity-80 transition-opacity">
                      Quitar
                    </button>
                  </div>
                </div>
              )}
              <label className="block text-sm text-contrast cursor-pointer hover:opacity-80 transition-opacity">
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
              <label className="flex items-center gap-2 text-sm text-contrast">
                <input type="checkbox" checked={cutForm.is_visible} onChange={(e) => setCutForm({ ...cutForm, is_visible: e.target.checked })} />
                Visible para agendar
              </label>
              <button className="w-full accent-btn py-2 rounded font-bold">{editingCutId ? 'Guardar corte' : 'Crear corte'}</button>
              {editingCutId && (
                <button type="button" onClick={() => { setEditingCutId(null); setCutForm(emptyCut); }} className="w-full nav-btn py-2 rounded font-semibold">
                  Cancelar edición
                </button>
              )}
            </form>
          </div>

          <div className="lg:col-span-2 glass-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="border-b border-white/10">
                <tr>
                  <th className="p-3 text-contrast font-semibold">Corte</th>
                  <th className="p-3 text-contrast font-semibold">Duración</th>
                  <th className="p-3 text-contrast font-semibold">Precio</th>
                  <th className="p-3 text-contrast font-semibold">Visibilidad</th>
                  <th className="p-3 text-center text-contrast font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {cuts.map((cut) => (
                  <tr key={cut.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-8 align-top">
                      <div className="flex items-center gap-3">
                        <a href={cut.image_url || 'https://via.placeholder.com/480?text=Corte'} target="_blank" rel="noreferrer">
                          <img src={cut.image_url || 'https://via.placeholder.com/480?text=Corte'} alt={cut.name} className="w-80 h-80 object-contain shrink-0 rounded bg-white/5 p-1" />
                        </a>
                        <div>
                          <p className="font-semibold text-contrast">{cut.name}</p>
                          <p className="text-xs muted line-clamp-2">{cut.description || 'Sin información'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-contrast">{(cut.duration_minutes || 0) + ' min'}</td>
                    <td className="p-3 text-contrast">${cut.price.toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        cut.is_visible ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/10 text-contrast border border-white/20'
                      }`}>
                        {cut.is_visible ? 'Visible' : 'Oculto'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleEditCut(cut)} className="p-2 text-contrast hover:opacity-70 transition-opacity"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleToggleCutVisibility(cut)} className="px-2 py-1 text-xs rounded nav-btn">{cut.is_visible ? 'Ocultar' : 'Mostrar'}</button>
                        <button onClick={() => handleRemoveCutImage(cut)} className="px-2 py-1 text-xs rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">Quitar imagen</button>
                        <button onClick={() => handleDeleteCut(cut.id)} className="p-2 text-red-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
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
        <div className="space-y-6">
          <div className="glass-card rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
              <h2 className="text-lg sm:text-xl font-bold">Monitor de Chats en Tiempo Real</h2>
              <p className="text-sm text-gray-500">Conversaciones activas entre barberos y clientes</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="p-4">Barbero</th>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Mensajes</th>
                    <th className="p-4">Último Mensaje</th>
                    <th className="p-4">Iniciado</th>
                    <th className="p-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {chats.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-400">No hay conversaciones activas aún.</td>
                    </tr>
                  ) : (
                    chats.map((chat) => (
                      <tr key={chat.conversationId} className="hover:bg-gray-50">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {chat.barber.avatar ? (
                              <img src={chat.barber.avatar} alt={chat.barber.name} className="w-8 h-8 rounded-full object-cover border" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                {chat.barber.name.charAt(0)}
                              </div>
                            )}
                            <span className="font-medium">{chat.barber.name}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {chat.client.avatar ? (
                              <img src={chat.client.avatar} alt={chat.client.name} className="w-8 h-8 rounded-full object-cover border" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">
                                {chat.client.name.charAt(0)}
                              </div>
                            )}
                            <span className="font-medium">{chat.client.name}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-700">{chat.messageCount}</span>
                        </td>
                        <td className="p-4 text-sm text-gray-600">
                          {chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleString() : 'Nunca'}
                        </td>
                        <td className="p-4 text-sm text-gray-600">
                          {new Date(chat.createdAt).toLocaleString()}
                        </td>
                        <td className="p-4 text-center">
                          <button onClick={async () => { setSelectedConversationId(chat.conversationId); await loadConversationMessages(chat.conversationId); }} className="px-3 py-1.5 rounded text-xs bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition">
                            Ver Chat
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {selectedConversationId && (
            <div className="glass-card rounded-xl p-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold">Visor de Conversación (Admin)</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setSelectedConversationId(null); setConversationMessages([]); }} className="px-3 py-1 rounded border">Cerrar</button>
                  <button onClick={async () => {
                    if (!selectedConversationId || !user) return;
                    if (!confirm('¿Eliminar TODA la conversación para todos los participantes? Esta acción no se puede deshacer.')) return;
                    try {
                      await api.deleteConversation(selectedConversationId, user.id);
                      setSelectedConversationId(null);
                      setConversationMessages([]);
                      await fetchData();
                      alert('Conversación eliminada');
                    } catch (err: any) {
                      alert(err.message || 'Error al eliminar conversación');
                    }
                  }} className="px-3 py-1 rounded bg-red-100 text-red-600">Eliminar conversación</button>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto p-2 space-y-3 border rounded mb-3 bg-white/5">
                {conversationMessages.length === 0 ? (
                  <p className="text-sm text-gray-400 p-4">No hay mensajes en esta conversación.</p>
                ) : (
                  conversationMessages.map((m) => (
                    <div key={m.id} className="p-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-400">{m.senderName} · {new Date(m.createdAt).toLocaleString()}</div>
                        <div>
                          <button onClick={async () => {
                            if (!user) return;
                            if (!confirm('¿Eliminar este mensaje para todos?')) return;
                            try {
                              await api.deleteMessage(m.id, user.id);
                              await loadConversationMessages(selectedConversationId);
                              await fetchData();
                            } catch (err: any) {
                              alert(err.message);
                            }
                          }} className="text-xs text-red-500">Eliminar</button>
                        </div>
                      </div>
                          <div className="mt-1 bg-white/5 p-2 rounded">
                            {m.messageType === 'image' && m.imageUrl ? (
                              <a href={m.imageUrl} target="_blank" rel="noreferrer"><img src={m.imageUrl} className="max-h-40 rounded" /></a>
                            ) : (
                              m.body
                            )}
                          </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={sendAdminMessage} className="flex gap-2">
                <input value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Escribe un mensaje como admin..." className="flex-1 p-2 border rounded" />
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">Enviar</button>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card rounded-xl p-4 sm:p-5">
              <h3 className="text-lg font-bold mb-3">Barberos Disponibles</h3>
              <div className="space-y-3">
                {users.filter((u) => u.role === 'barber').map((barber) => (
                  <div key={barber.id} className="border border-white/10 rounded-lg p-3 flex items-center justify-between hover:border-white/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      {barber.avatar_url ? (
                        <img
                          src={barber.avatar_url}
                          alt={barber.name}
                          className="w-10 h-10 rounded-full object-cover border border-white/20 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-white/10 text-contrast items-center justify-center font-bold uppercase shrink-0 border border-white/20 flex">
                          {barber.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate text-contrast">{barber.name}</p>
                          {chatCountsByBarber[barber.id] ? (
                            <span className="inline-flex items-center justify-center text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                              {chatCountsByBarber[barber.id]}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs muted truncate">{barber.email}</p>
                      </div>
                    </div>
                    <Link to={`/chat?peerId=${barber.id}`} className="px-3 py-1.5 rounded accent-btn text-xs font-semibold">
                      Contactar
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card rounded-xl p-4 sm:p-5">
              <h3 className="text-lg font-bold mb-3">Clientes Registrados</h3>
              <div className="space-y-3">
                {users.filter((u) => u.role === 'user').map((client) => (
                  <div key={client.id} className="border border-white/10 rounded-lg p-3 flex items-center justify-between hover:border-white/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      {client.avatar_url ? (
                        <img
                          src={client.avatar_url}
                          alt={client.name}
                          className="w-10 h-10 rounded-full object-cover border border-white/20 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-white/10 text-contrast items-center justify-center font-bold uppercase shrink-0 border border-white/20 flex">
                          {client.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold truncate text-contrast">{client.name}</p>
                        <p className="text-xs muted truncate">{client.email}</p>
                      </div>
                    </div>
                    <Link to={`/chat?peerId=${client.id}`} className="px-3 py-1.5 rounded bg-indigo-600 text-white text-xs font-semibold">
                      Contactar
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'appointments' && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-white/10">
            <h2 className="text-lg sm:text-xl font-bold text-contrast">Gestión de Citas</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-b border-white/10">
                <tr>
                  <th className="p-4 text-contrast font-semibold">Cliente</th>
                  <th className="p-4 text-contrast font-semibold">Barbero</th>
                  <th className="p-4 text-contrast font-semibold">Servicio</th>
                  <th className="p-4 text-contrast font-semibold">Fecha</th>
                  <th className="p-4 text-contrast font-semibold">Estado</th>
                  <th className="p-4 text-center text-contrast font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {appointments.length === 0 ? (
                  <tr><td colSpan={6} className="p-6 text-center muted">No hay citas registradas.</td></tr>
                ) : appointments.map((appointment) => (
                  <tr key={appointment.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 text-contrast">{appointment.clientName}</td>
                    <td className="p-4 text-contrast">{appointment.barberName}</td>
                    <td className="p-4 text-contrast">{appointment.serviceName}</td>
                    <td className="p-4 text-contrast">{new Date(appointment.appointmentDate).toLocaleString()}</td>
                    <td className="p-4 text-contrast uppercase text-xs font-semibold">{appointment.status}</td>
                    <td className="p-4">
                      <div className="flex gap-2 flex-wrap justify-center">
                        <button onClick={() => handleAppointmentStatus(appointment, 'confirmed')} className="px-3 py-1 rounded accent-btn text-sm">Confirmar</button>
                        <button onClick={() => handleAppointmentStatus(appointment, 'completed')} className="px-3 py-1 rounded border border-white/20 text-contrast text-sm">Completar</button>
                        <button onClick={() => handleAppointmentStatus(appointment, 'cancelled')} className="px-3 py-1 rounded border border-red-500/30 text-red-400 text-sm">Cancelar</button>
                        <button onClick={() => handleDeleteAppointment(appointment)} className="p-2 text-red-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-white/10">
            <h2 className="text-lg sm:text-xl font-bold text-contrast">Opiniones y Calificaciones</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-b border-white/10">
                <tr>
                  <th className="p-4 text-contrast font-semibold">Cliente</th>
                  <th className="p-4 text-contrast font-semibold">Servicio</th>
                  <th className="p-4 text-contrast font-semibold">Calificación</th>
                  <th className="p-4 text-contrast font-semibold">Comentario</th>
                  <th className="p-4 text-contrast font-semibold">Publicada</th>
                  <th className="p-4 text-center text-contrast font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {reviews.length === 0 ? (
                  <tr><td colSpan={6} className="p-6 text-center muted">No hay opiniones registradas.</td></tr>
                ) : reviews.map((review) => (
                  <tr key={review.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 text-contrast">{review.userName}</td>
                    <td className="p-4 text-contrast">{review.serviceName}</td>
                    <td className="p-4 text-contrast font-semibold">{review.rating}/5</td>
                    <td className="p-4 text-contrast max-w-[420px]">{review.comment}</td>
                    <td className="p-4 text-contrast">{review.isPublished ? 'Sí' : 'No'}</td>
                    <td className="p-4">
                      <div className="flex gap-2 flex-wrap justify-center">
                        <button onClick={() => handlePublishReview(review)} className="px-3 py-1 rounded accent-btn text-sm">
                          {review.isPublished ? 'Ocultar' : 'Publicar'}
                        </button>
                        <button onClick={() => handleDeleteReview(review)} className="p-2 text-red-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
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
          <div className="p-4 sm:p-6 border-b border-gray-100 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold">Actividad de Barberos</h2>
              <p className="text-sm text-gray-500">Resumen del trabajo registrado por el equipo.</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => handleDeleteLogsByRange('today')} className="px-3 py-2 rounded text-sm bg-red-100 text-red-600 hover:bg-red-200 transition">
                Borrar registros de hoy
              </button>
              <button onClick={() => handleDeleteLogsByRange('month')} className="px-3 py-2 rounded text-sm bg-orange-100 text-orange-600 hover:bg-orange-200 transition">
                Borrar registros del mes
              </button>
              <button onClick={() => handleDeleteLogsByRange('year')} className="px-3 py-2 rounded text-sm bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition">
                Borrar registros del año
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">Ganado hoy</p>
                <p className="mt-2 text-2xl font-bold text-emerald-700">${todayTotal.toFixed(2)}</p>
              </div>
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-contrast mb-2">Totales por categoría</h3>
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-xs text-muted">
                      <th className="p-2">Categoría</th>
                      <th className="p-2">Hoy</th>
                      <th className="p-2">Mes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-white/10">
                      <td className="p-2 font-medium">Cortes</td>
                      <td className="p-2 text-green-600 font-bold">${todayByCategory.cortes.toFixed(2)}</td>
                      <td className="p-2 text-slate-800 font-bold">${monthByCategory.cortes.toFixed(2)}</td>
                    </tr>
                    <tr className="border-t border-white/10">
                      <td className="p-2 font-medium">Barbería</td>
                      <td className="p-2 text-green-600 font-bold">${todayByCategory.barberia.toFixed(2)}</td>
                      <td className="p-2 text-slate-800 font-bold">${monthByCategory.barberia.toFixed(2)}</td>
                    </tr>
                    <tr className="border-t border-white/10">
                      <td className="p-2 font-medium">Lancería</td>
                      <td className="p-2 text-green-600 font-bold">${todayByCategory.lanceria.toFixed(2)}</td>
                      <td className="p-2 text-slate-800 font-bold">${monthByCategory.lanceria.toFixed(2)}</td>
                    </tr>
                    <tr className="border-t border-white/10">
                      <td className="p-2 font-medium">Bebidas</td>
                      <td className="p-2 text-green-600 font-bold">${todayByCategory.bebidas.toFixed(2)}</td>
                      <td className="p-2 text-slate-800 font-bold">${monthByCategory.bebidas.toFixed(2)}</td>
                    </tr>
                    <tr className="border-t border-white/10 bg-white/5">
                      <td className="p-2 font-semibold">Total</td>
                      <td className="p-2 font-semibold">${todayTotal.toFixed(2)}</td>
                      <td className="p-2 font-semibold">${monthTotal.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-600 font-semibold">Ganado del mes</p>
                <p className="mt-2 text-2xl font-bold text-slate-800">${monthTotal.toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                <p className="text-xs uppercase tracking-wide text-red-700 font-semibold">Pérdidas del mes</p>
                <p className="mt-2 text-2xl font-bold text-red-700">${monthLosses.toFixed(2)}</p>
                <p className="mt-1 text-xs text-red-700/80">No hay egresos registrados todavía.</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="p-4">Fecha</th>
                <th className="p-4">Barbero</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Detalle</th>
                <th className="p-4">Monto</th>
                <th className="p-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[...logs].reverse().map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="p-4 text-sm">{new Date(l.date).toLocaleString()}</td>
                  <td className="p-4 font-bold">{l.barberName}</td>
                  <td className="p-4"><span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">{(function(t){ if(!t) return ''; const lower=t.toString().toLowerCase(); if(lower.includes('cort')) return 'Cortes'; if(lower.includes('barber')) return 'Barbería'; if(lower.includes('menu')||lower.includes('lancer')) return 'Lancería'; if(lower.includes('beb')) return 'Bebidas'; return t; })(l.type)}</span></td>
                  <td className="p-4">{l.name}</td>
                  <td className="p-4 text-green-600 font-bold">${l.price.toFixed(2)}</td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleDeleteLog(l.id)} className="px-2 py-1 rounded text-xs bg-red-100 text-red-600 hover:bg-red-200 transition">
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
    </div>
  );
}
