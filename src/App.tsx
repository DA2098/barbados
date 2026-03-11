import React, { useEffect, useMemo, useRef, useState } from "react";
import type {
  ChangeEvent,
  FormEvent
} from "react";
import type {
  User,
  Product,
  Appointment,
  BarberApplication,
  AppointmentStatus,
  Message,
  Conversation,
  NotificationItem,
  Order,
  DashboardSummary,
  AccountProfile,
  PublicHomeData,
  CartItem,
  PendingAttachment,
  Testimonial,
  BarberCut,
  BarberCutsSummary,
  Role,
  Route,
  DashboardTab,
  LoginForm,
  RegisterForm,
  BookingForm,
  ProductForm,
  UserForm,
  BootstrapData,
  Service
} from "./types";
// Add missing normalizeApplication function if not present
function normalizeApplication(raw: Record<string, unknown>): BarberApplication {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    email: String(raw.email ?? ""),
    phone: String(raw.phone ?? ""),
    specialty: String(raw.specialty ?? ""),
    experience: Number(raw.experience ?? 0),
    note: String(raw.note ?? ""),
    status: String(raw.status ?? "pending") as any,
    submittedAt: String(raw.submittedAt ?? raw.submitted_at ?? ""),
  };
}
import { absoluteApiUrl, apiRequest, discoverApiBase, jsonBody } from "./api";
import barbadosLogo from "./assets/barbados-logo.jpeg";
import barbershop1 from "./assets/barbershop-1.jpeg";
import barbershop2 from "./assets/barbershop-2.jpeg";
const showcaseHaircut = "https://images.pexels.com/photos/1813272/pexels-photo-1813272.jpeg?auto=compress&cs=tinysrgb&w=800";
const showcaseStyle = "https://images.pexels.com/photos/1805600/pexels-photo-1805600.jpeg?auto=compress&cs=tinysrgb&w=800";
const showcaseBeard = "https://images.pexels.com/photos/2881253/pexels-photo-2881253.jpeg?auto=compress&cs=tinysrgb&w=800";
const heroFallbackImage = "https://images.pexels.com/photos/1805600/pexels-photo-1805600.jpeg?auto=compress&cs=tinysrgb&w=1920";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const dateTime = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

const dateOnly = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
});

function toInputDate(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function tone(status: string) {
  if (["accepted", "completed", "approved", "paid"].includes(status)) return "success";
  if (["pending"].includes(status)) return "warning";
  if (["cancelled", "rejected"].includes(status)) return "danger";
  return "info";
}

function statusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Pendiente";
    case "accepted":
      return "Aceptada";
    case "completed":
      return "Completada";
    case "cancelled":
      return "Cancelada";
    case "approved":
      return "Aprobada";
    case "rejected":
      return "Rechazada";
    case "paid":
      return "Pagado";
    default:
      return status;
  }
}

function roleLabel(role: Role) {
  if (role === "admin") return "Administrador";
  if (role === "barber") return "Barbero";
  return "Cliente";
}

function normalizeUser(raw: Record<string, unknown>): User {
  // Avatar: si no existe o da error de carga, usar avatar por defecto
  let avatarUrl = String(raw.avatar ?? raw.avatar_url ?? "");
  const defaultAvatar = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80";
  // Si está vacío o es un nombre de archivo que no existe, usar el default
  if (!avatarUrl || avatarUrl === "null" || avatarUrl === "undefined") {
    avatarUrl = defaultAvatar;
  } else if (avatarUrl.match(/^avatar-[a-z0-9]+\.(jpg|jpeg|png)$/i)) {
    // Verificar si el archivo existe en uploads (solo en producción, no localhost)
    if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
      const testImg = new window.Image();
      testImg.src = `/uploads/${avatarUrl}`;
      testImg.onerror = () => {
        avatarUrl = defaultAvatar;
      };
    }
    avatarUrl = `/uploads/${avatarUrl}`;
  }
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? raw.full_name ?? ""),
    email: String(raw.email ?? ""),
    phone: String(raw.phone ?? ""),
    role: String(raw.role ?? "client") as Role,
    active: Boolean(raw.active ?? raw.is_active ?? true),
    approved: Boolean(raw.approved ?? raw.is_approved ?? true),
    avatar: avatarUrl,
    createdAt: raw.created_at ? String(raw.created_at) : undefined,
  };
}

function normalizeService(raw: Record<string, unknown>): Service {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    description: String(raw.description ?? ""),
    duration: Number(raw.duration ?? raw.duration_minutes ?? 0),
    price: Number(raw.price ?? 0),
  };
}

function normalizeProduct(raw: Record<string, unknown>): Product {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    category: String(raw.category ?? ""),
    description: String(raw.description ?? ""),
    price: Number(raw.price ?? 0),
    stock: Number(raw.stock ?? 0),
    image: String(raw.image ?? ""),
	active: Boolean(raw.active ?? true)
  };
}

function normalizeAppointment(raw: Record<string, unknown>): Appointment {
  return {
    id: String(raw.id ?? ""),
    clientId: String(raw.client_id ?? raw.clientId ?? ""),
    barberId: String(raw.barber_id ?? raw.barberId ?? ""),
    serviceId: String(raw.service_id ?? raw.serviceId ?? ""),
    date: String(raw.date ?? raw.appointment_date ?? new Date().toISOString()),
    notes: String(raw.notes ?? ""),
    status: String(raw.status ?? "pending") as AppointmentStatus,
  };
}

function normalizeMessage(raw: Record<string, unknown>): Message {
  return {
    id: String(raw.id ?? ""),
    senderId: String(raw.sender_id ?? raw.senderId ?? ""),
    kind: String(raw.kind ?? raw.message_type ?? "text") as Message["kind"],
    text: String(raw.text ?? raw.body ?? ""),
    mediaUrl: raw.media_url ? String(raw.media_url) : raw.mediaUrl ? String(raw.mediaUrl) : undefined,
    mediaName: raw.media_name ? String(raw.media_name) : raw.mediaName ? String(raw.mediaName) : undefined,
    duration: raw.duration ? String(raw.duration) : raw.media_duration ? String(raw.media_duration) : undefined,
    createdAt: String(raw.created_at ?? raw.createdAt ?? new Date().toISOString()),
  };
}

function normalizeConversation(raw: Record<string, unknown>): Conversation {
  return {
    id: String(raw.id ?? ""),
    appointmentId: String(raw.appointment_id ?? raw.appointmentId ?? ""),
    barberId: String(raw.barber_id ?? raw.barberId ?? ""),
    clientId: String(raw.client_id ?? raw.clientId ?? ""),
    title: String(raw.title ?? "Conversación"),
    active: Boolean(raw.active ?? raw.is_active ?? true),
    messages: Array.isArray(raw.messages) ? raw.messages.map((message) => normalizeMessage(message as Record<string, unknown>)) : [],
  };
}

function normalizeNotification(raw: Record<string, unknown>): NotificationItem {
  return {
    id: String(raw.id ?? ""),
    userId: String(raw.user_id ?? raw.userId ?? ""),
    title: String(raw.title ?? ""),
    body: String(raw.body ?? ""),
    type: String(raw.type ?? "info") as NotificationItem["type"],
    read: Boolean(raw.read ?? raw.is_read ?? false),
    createdAt: String(raw.created_at ?? raw.createdAt ?? new Date().toISOString()),
  };
}

function normalizeOrder(raw: Record<string, unknown>): Order {
  return {
    id: String(raw.id ?? ""),
    clientId: String(raw.client_id ?? raw.clientId ?? ""),
    total: Number(raw.total ?? raw.total_amount ?? 0),
    status: String(raw.status ?? "paid"),
    createdAt: String(raw.created_at ?? raw.createdAt ?? new Date().toISOString()),
    clientName: raw.client_name ? String(raw.client_name) : raw.clientName ? String(raw.clientName) : undefined,
    clientEmail: raw.client_email ? String(raw.client_email) : raw.clientEmail ? String(raw.clientEmail) : undefined,
    clientPhone: raw.client_phone ? String(raw.client_phone) : raw.clientPhone ? String(raw.clientPhone) : undefined,
    latestServiceName: raw.latest_service_name ? String(raw.latest_service_name) : raw.latestServiceName ? String(raw.latestServiceName) : undefined,
    latestAppointmentDate: raw.latest_appointment_date ? String(raw.latest_appointment_date) : raw.latestAppointmentDate ? String(raw.latestAppointmentDate) : undefined,
    latestAppointmentNotes: raw.latest_appointment_notes ? String(raw.latest_appointment_notes) : raw.latestAppointmentNotes ? String(raw.latestAppointmentNotes) : undefined,
    items: Array.isArray(raw.items)
      ? raw.items.map((item) => ({
          productId: String((item as Record<string, unknown>).product_id ?? (item as Record<string, unknown>).productId ?? ""),
          quantity: Number((item as Record<string, unknown>).quantity ?? 0),
          unitPrice: Number((item as Record<string, unknown>).unit_price ?? (item as Record<string, unknown>).unitPrice ?? 0),
          subtotal: Number((item as Record<string, unknown>).subtotal ?? 0),
          productName: (item as Record<string, unknown>).product_name ? String((item as Record<string, unknown>).product_name) : (item as Record<string, unknown>).productName ? String((item as Record<string, unknown>).productName) : undefined,
          productImage: (item as Record<string, unknown>).product_image ? String((item as Record<string, unknown>).product_image) : (item as Record<string, unknown>).productImage ? String((item as Record<string, unknown>).productImage) : undefined,
        }))
      : [],
  };
}

function normalizeSummary(raw: Record<string, unknown> | null): DashboardSummary | null {
  if (!raw) return null;

  return {
    users: Number(raw.users ?? 0),
    activeBarbers: Number(raw.active_barbers ?? raw.activeBarbers ?? 0),
    pendingApplications: Number(raw.pending_applications ?? raw.pendingApplications ?? 0),
    pendingAppointments: Number(raw.pending_appointments ?? raw.pendingAppointments ?? 0),
    acceptedAppointments: Number(raw.accepted_appointments ?? raw.acceptedAppointments ?? 0),
    completedAppointments: Number(raw.completed_appointments ?? raw.completedAppointments ?? 0),
    activeConversations: Number(raw.active_conversations ?? raw.activeConversations ?? 0),
    products: Number(raw.products ?? 0),
    inventoryValue: Number(raw.inventory_value ?? raw.inventoryValue ?? 0),
    revenueYear: Number(raw.revenue_year ?? raw.revenueYear ?? 0),
    firstSixMonths: Number(raw.first_six_months ?? raw.firstSixMonths ?? 0),
    monthlyRevenue: Array.isArray(raw.monthly_revenue)
      ? (raw.monthly_revenue as unknown[]).map((value) => Number(value))
      : Array.isArray(raw.monthlyRevenue)
        ? (raw.monthlyRevenue as unknown[]).map((value) => Number(value))
        : [],
  };
}

function normalizeAccountProfile(raw: Record<string, unknown> | null): AccountProfile | null {
  if (!raw) return null;
  const stats = (raw.stats ?? {}) as Record<string, unknown>;
  return {
    user: normalizeUser((raw.user ?? {}) as Record<string, unknown>),
    stats: {
      appointmentsTotal: Number(stats.appointments_total ?? stats.appointmentsTotal ?? 0),
      appointmentsPending: Number(stats.appointments_pending ?? stats.appointmentsPending ?? 0),
      appointmentsAccepted: Number(stats.appointments_accepted ?? stats.appointmentsAccepted ?? 0),
      appointmentsCompleted: Number(stats.appointments_completed ?? stats.appointmentsCompleted ?? 0),
      notificationsUnread: Number(stats.notifications_unread ?? stats.notificationsUnread ?? 0),
    },
    recentAppointments: Array.isArray(raw.recent_appointments)
      ? (raw.recent_appointments as Record<string, unknown>[]).map(normalizeAppointment)
      : [],
    recentNotifications: Array.isArray(raw.recent_notifications)
      ? (raw.recent_notifications as Record<string, unknown>[]).map(normalizeNotification)
      : [],
  };
}

function Badge({ label, variant }: { label: string; variant: "info" | "success" | "warning" | "danger" }) {
  return <span className={`badge badge--${variant}`}>{label}</span>;
}

function SectionHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="panel-header">
      <div>
        <h3 className="panel-title">{title}</h3>
        <p className="panel-subtitle">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function AccordionItem({ icon, title, children, defaultOpen = false }: { icon: string; title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className={`accordion-item ${isOpen ? 'accordion-item--active' : ''}`}>
      <button 
        className="accordion-header" 
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <div className="accordion-header__left">
          <div className="accordion-header__icon">{icon}</div>
          <span>{title}</span>
        </div>
        <div className="accordion-header__arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </button>
      <div className="accordion-content">
        <div className="accordion-content__inner">
          {children}
        </div>
      </div>
    </div>
  );
}

export function App() {
    // Estado manual para activación/desactivación de productos
    // Eliminado: manualProductState no se usa
  const [route, setRoute] = useState<Route>("home");
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>("overview");
  const [apiBase, setApiBase] = useState<string | null>(null);
  // const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // Inicializar publicData con cache local para render instantáneo y máxima interactividad
  const [publicData, setPublicData] = useState<PublicHomeData>(() => {
    try {
      const products = window.localStorage.getItem("barbados360.products");
      const services = window.localStorage.getItem("barbados360.services");
      const users = window.localStorage.getItem("barbados360.users");
      return {
        products: products ? JSON.parse(products).filter((p:any)=>p.active) : [],
        services: services ? JSON.parse(services) : [],
        barbers: users ? JSON.parse(users).filter((u:any)=>u.role==="barber"&&u.active&&u.approved) : [],
      };
    } catch {
      return { services: [], barbers: [], products: [] };
    }
  });

  // (Variables instant* eliminadas, ya no se usan)
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const cached = window.localStorage.getItem("barbados360.users");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [services, setServices] = useState<Service[]>(() => {
    try {
      const cached = window.localStorage.getItem("barbados360.services");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  // Productos: cache localStorage para carga instantánea
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const cached = window.localStorage.getItem("barbados360.products");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  // Inline editing state for products
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editProductForm, setEditProductForm] = useState({
    name: "",
    category: "",
    price: 0,
    description: "",
    stock: 0
  });
  const [applications, setApplications] = useState<BarberApplication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [accountProfile, setAccountProfile] = useState<AccountProfile | null>(null);
  const [loginForm, setLoginForm] = useState<LoginForm>({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState<RegisterForm>({ name: "", email: "", phone: "", password: "", role: "client" });
  const [applyForm, setApplyForm] = useState({ name: "", email: "", phone: "", specialty: "", experience: 1, note: "" });
  const [bookingForm, setBookingForm] = useState<BookingForm>({ barberId: "", serviceId: "", date: toInputDate(new Date(Date.now() + 86400000)), notes: "" });
  const [productForm, setProductForm] = useState<ProductForm>({ name: "", category: "Styling", description: "", price: 0, stock: 0, image: "" });
  const [userForm, setUserForm] = useState<UserForm>({ name: "", email: "", phone: "", password: "", role: "client" });
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [attachment, setAttachment] = useState<PendingAttachment | null>(null);
  const [profileForm, setProfileForm] = useState({ name: "", phone: "" });
  const [editingProfile, setEditingProfile] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [liveAlert, setLiveAlert] = useState<{ kind: "message" | "notification"; text: string } | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const previousNotificationCountRef = useRef(0);
  const previousMessageCountRef = useRef(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showUnreadBanner, setShowUnreadBanner] = useState(false);
  const [unreadInfo, setUnreadInfo] = useState<{ messages: number; notifications: number }>({ messages: 0, notifications: 0 });
  const [seenMessageCounts, setSeenMessageCounts] = useState<Record<string, number>>({});
  const [seenCountsLoaded, setSeenCountsLoaded] = useState(false);
  const [initialAlertShown, setInitialAlertShown] = useState(false);
  
  // Testimonios y sugerencias
  const [testimonialsList, setTestimonialsList] = useState<Testimonial[]>(() => {
    try {
      const cached = window.localStorage.getItem("barbados360.testimonials");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [adminTestimonials, setAdminTestimonials] = useState<Testimonial[]>([]);
  const [suggestionForm, setSuggestionForm] = useState({ name: "", email: "", message: "", rating: 5 });
  const [showSuggestionForm, setShowSuggestionForm] = useState(false);
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);

  // Cortes de barbero y ganancias
  const [barberCuts, setBarberCuts] = useState<BarberCut[]>([]);
  const [barberCutsSummary, setBarberCutsSummary] = useState<BarberCutsSummary[]>([]);
  const [cutsTotal, setCutsTotal] = useState(0);
  const [cutsDate, setCutsDate] = useState(new Date().toISOString().split("T")[0]);
  const [cutForm, setCutForm] = useState({ clientName: "", serviceId: "", serviceName: "", price: 0, notes: "" });
  const [submittingCut, setSubmittingCut] = useState(false);
  const [expandedBarberIds, setExpandedBarberIds] = useState<Set<string>>(new Set());

  // Funciones para gestionar mensajes vistos en localStorage
  function getSeenMessageCounts(): Record<string, number> {
    try {
      const stored = window.localStorage.getItem("barbados360.seenMessages");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  function getInitialAlertShown(userId: string): boolean {
    try {
      const stored = window.localStorage.getItem(`barbados360.alertShown.${userId}`);
      return stored === "true";
    } catch {
      return false;
    }
  }

  function setInitialAlertShownStorage(userId: string, shown: boolean) {
    window.localStorage.setItem(`barbados360.alertShown.${userId}`, shown ? "true" : "false");
    setInitialAlertShown(shown);
  }

  function markConversationAsSeen(conversationId: string, messageCount: number) {
    const current = getSeenMessageCounts();
    current[conversationId] = messageCount;
    window.localStorage.setItem("barbados360.seenMessages", JSON.stringify(current));
    setSeenMessageCounts(current);
  }

  function markAllConversationsAsSeen() {
    const counts: Record<string, number> = {};
    myConversations.forEach((conversation) => {
      counts[conversation.id] = conversation.messages.filter((m) => m.kind !== "system").length;
    });
    window.localStorage.setItem("barbados360.seenMessages", JSON.stringify(counts));
    setSeenMessageCounts(counts);
    setShowUnreadBanner(false);
  }

  const usersById = useMemo(() => Object.fromEntries(users.map((user) => [user.id, user])), [users]);
  const servicesById = useMemo(() => Object.fromEntries(services.map((service) => [service.id, service])), [services]);
  const activeBarbers = useMemo(() => users.filter((user) => user.role === "barber" && user.active && user.approved), [users]);
  const myAppointments = useMemo(() => {
    if (!sessionUser) return [];
    return appointments.filter((appointment) => appointment.clientId === sessionUser.id || appointment.barberId === sessionUser.id);
  }, [appointments, sessionUser]);
  const myNotifications = useMemo(() => {
    if (!sessionUser) return [];
    return notifications
      .filter((notification) => notification.userId === sessionUser.id)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }, [notifications, sessionUser]);
  const myConversations = useMemo(() => {
    if (!sessionUser) return [];
    // Admin puede ver conversaciones donde está como client_id (chat directo con barberos)
    // Barberos y clientes ven sus conversaciones normales
    return conversations.filter((conversation) => 
      conversation.active && (
        conversation.clientId === sessionUser.id || 
        conversation.barberId === sessionUser.id
      )
    );
  }, [conversations, sessionUser]);

  // Calcular mensajes realmente no leídos (después de myConversations)
  const actualUnreadMessages = useMemo(() => {
    if (!sessionUser) return 0;
    const seen = seenMessageCounts;
    return myConversations.reduce((count, conversation) => {
      const messagesFromOthers = conversation.messages.filter(
        (msg) => msg.senderId !== sessionUser.id && msg.kind !== "system"
      ).length;
      const seenCount = seen[conversation.id] ?? 0;
      const newCount = Math.max(0, messagesFromOthers - seenCount);
      return count + newCount;
    }, 0);
  }, [myConversations, seenMessageCounts, sessionUser]);

  const selectedConversation = myConversations.find((conversation) => conversation.id === selectedConversationId) ?? myConversations[0] ?? null;
  const cartDetailed = cart
    .map((item) => ({ item, product: products.find((product) => product.id === item.productId) ?? null }))
    .filter((entry) => entry.product !== null) as Array<{ item: CartItem; product: Product }>;
  const cartTotal = cartDetailed.reduce((sum, entry) => sum + entry.product.price * entry.item.quantity, 0);

  useEffect(() => {
    let mounted = true;

    // Mostrar UI al instante, cargar datos en background
    discoverApiBase().then((discovered) => {
      if (!mounted) return;
      if (!discovered) {
        setError("No se detectó el backend PHP. Debes levantar la API para usar el sistema real.");
        return;
      }
      setApiBase(discovered);
      // Cargar datos en background, pero la UI ya se muestra
      loadPublic(discovered);
      const savedUserId = window.localStorage.getItem("barbados360.userId");
      if (savedUserId) {
        bootstrapSession(discovered, savedUserId).then(() => {
          setRoute("dashboard");
        });
      }
    }).catch((err) => {
      setError(err instanceof Error ? err.message : "No se pudo inicializar el sistema.");
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!apiBase || !sessionUser) return;

    const interval = window.setInterval(() => {
      void bootstrapSession(apiBase, sessionUser.id, false);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [apiBase, sessionUser]);

  useEffect(() => {
    if (myConversations.length > 0 && !myConversations.some((conversation) => conversation.id === selectedConversationId)) {
      setSelectedConversationId(myConversations[0].id);
    }
  }, [myConversations, selectedConversationId]);

  // Cargar conteos vistos desde localStorage al iniciar sesión
  useEffect(() => {
    if (sessionUser) {
      setSeenMessageCounts(getSeenMessageCounts());
      setInitialAlertShown(getInitialAlertShown(sessionUser.id));
      setSeenCountsLoaded(true);
    } else {
      setSeenMessageCounts({});
      setSeenCountsLoaded(false);
      setInitialAlertShown(false);
    }
  }, [sessionUser]);

  // Marcar conversación como vista cuando el usuario está en el chat
  useEffect(() => {
    if (dashboardTab === "chat" && selectedConversationId && sessionUser) {
      const conversation = myConversations.find((c) => c.id === selectedConversationId);
      if (conversation) {
        const messagesFromOthers = conversation.messages.filter(
          (msg) => msg.senderId !== sessionUser.id && msg.kind !== "system"
        ).length;
        markConversationAsSeen(selectedConversationId, messagesFromOthers);
      }
    }
  }, [dashboardTab, selectedConversationId, myConversations, sessionUser]);

  function playNotificationTone(kind: "notification" | "message" = "notification") {
    try {
      const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
      
      if (kind === "notification") {
        // Two-tone chime for notifications (like iPhone)
        const frequencies = [880, 1108.73, 1318.51]; // A5, C#6, E6 chord
        frequencies.forEach((freq, i) => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, audioContext.currentTime);
          gain.gain.setValueAtTime(0, audioContext.currentTime);
          gain.gain.linearRampToValueAtTime(0.08, audioContext.currentTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
          osc.connect(gain);
          gain.connect(audioContext.destination);
          osc.start(audioContext.currentTime + i * 0.05);
          osc.stop(audioContext.currentTime + 0.6);
        });
      } else {
        // Soft message ping
        const osc1 = audioContext.createOscillator();
        const osc2 = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc1.type = "sine";
        osc2.type = "triangle";
        osc1.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        osc2.frequency.setValueAtTime(659.25, audioContext.currentTime); // E5
        osc1.frequency.exponentialRampToValueAtTime(783.99, audioContext.currentTime + 0.15); // G5
        osc2.frequency.exponentialRampToValueAtTime(987.77, audioContext.currentTime + 0.15); // B5
        gain.gain.setValueAtTime(0, audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(0.06, audioContext.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.35);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(audioContext.destination);
        osc1.start();
        osc2.start();
        osc1.stop(audioContext.currentTime + 0.4);
        osc2.stop(audioContext.currentTime + 0.4);
      }
      
      window.setTimeout(() => {
        void audioContext.close();
      }, 350);
    } catch {
      // navegador sin soporte o bloqueo de autoplay
    }
  }

  useEffect(() => {
    if (!sessionUser) return;
    const unreadCount = myNotifications.filter((notification) => !notification.read).length;
    const messageCount = myConversations.reduce((sum, conversation) => sum + conversation.messages.length, 0);

    if (previousNotificationCountRef.current > 0 && unreadCount > previousNotificationCountRef.current) {
      playNotificationTone("notification");
      const latestNotification = myNotifications.find((notification) => !notification.read);
      setLiveAlert({ kind: "notification", text: latestNotification ? `${latestNotification.title}: ${latestNotification.body}` : "Tienes una nueva notificación." });
    }
    // Solo alertar de nuevo mensaje si no estamos viendo el chat actualmente
    if (previousMessageCountRef.current > 0 && messageCount > previousMessageCountRef.current && dashboardTab !== "chat") {
      playNotificationTone("message");
      const latestConversation = myConversations.find((conversation) => conversation.messages.length > 0);
      const latestMessage = latestConversation?.messages[latestConversation.messages.length - 1];
      setLiveAlert({ kind: "message", text: latestMessage?.text || "Tienes un nuevo mensaje en el chat." });
    }

    previousNotificationCountRef.current = unreadCount;
    previousMessageCountRef.current = messageCount;
  }, [myConversations, myNotifications, sessionUser, dashboardTab]);

  // Efecto para mostrar alerta inicial de mensajes no leídos al ingresar a la cuenta
  useEffect(() => {
    // Esperar a que se carguen los conteos de localStorage antes de decidir
    if (!sessionUser || !seenCountsLoaded || initialAlertShown) return;
    
    // Usar actualUnreadMessages que ya filtra los mensajes realmente nuevos
    const unreadMessages = actualUnreadMessages;
    
    // Contar notificaciones no leídas
    const unreadNotifications = myNotifications.filter((n) => !n.read).length;
    
    if (unreadMessages > 0 || unreadNotifications > 0) {
      setUnreadInfo({ messages: unreadMessages, notifications: unreadNotifications });
      setShowUnreadBanner(true);
      playNotificationTone("notification");
      
      // Mostrar alerta flotante
      const parts: string[] = [];
      if (unreadMessages > 0) {
        parts.push(`${unreadMessages} mensaje${unreadMessages > 1 ? "s" : ""} nuevo${unreadMessages > 1 ? "s" : ""}`);
      }
      if (unreadNotifications > 0) {
        parts.push(`${unreadNotifications} notificaci${unreadNotifications > 1 ? "ones" : "ón"} sin leer`);
      }
      setLiveAlert({ kind: "message", text: `¡Bienvenido! Tienes ${parts.join(" y ")}.` });
      setInitialAlertShownStorage(sessionUser.id, true);
      
      // Auto-ocultar el banner después de 3 segundos
      const bannerTimeout = window.setTimeout(() => setShowUnreadBanner(false), 3000);
      return () => window.clearTimeout(bannerTimeout);
    }
    
    setInitialAlertShownStorage(sessionUser.id, true);
  }, [sessionUser, myConversations, myNotifications, actualUnreadMessages, seenCountsLoaded, initialAlertShown]);

  useEffect(() => {
    if (!liveAlert) return;
    const timeout = window.setTimeout(() => setLiveAlert(null), 1500);
    return () => window.clearTimeout(timeout);
  }, [liveAlert]);

  // Auto-limpiar mensajes de error y success después de 2.5 segundos
  useEffect(() => {
    if (!error) return;
    const timeout = window.setTimeout(() => setError(""), 1500);
    return () => window.clearTimeout(timeout);
  }, [error]);

  useEffect(() => {
    if (!success) return;
    const timeout = window.setTimeout(() => setSuccess(""), 1500);
    return () => window.clearTimeout(timeout);
  }, [success]);

  async function loadPublic(base: string) {
    // Mostrar datos previos o vacíos al instante
    setPublicData((prev) => ({
      services: prev.services || [],
      barbers: prev.barbers || [],
      products: prev.products || [],
    }));
    // Mostrar productos cacheados al instante
    setProducts((prev) => prev && prev.length > 0 ? prev : (() => {
      try {
        const cached = window.localStorage.getItem("barbados360.products");
        return cached ? JSON.parse(cached) : [];
      } catch {
        return [];
      }
    })());

    // Cargar datos en background
    Promise.all([
      apiRequest<Record<string, unknown>[]>(base, "/services"),
      apiRequest<Record<string, unknown>[]>(base, "/users"),
      apiRequest<Record<string, unknown>[]>(base, "/products"),
      apiRequest<Record<string, unknown>[]>(base, "/testimonials?approved=true&limit=12"),
    ]).then(([servicesResponse, usersResponse, productsResponse, testimonialsResponse]) => {
      const serviceList = (servicesResponse.data ?? []).map(normalizeService);
      const userList = (usersResponse.data ?? []).map(normalizeUser);
      const productList = (productsResponse.data ?? []).map(normalizeProduct);
      // Normalizar testimonios
      const testimonialList: Testimonial[] = (testimonialsResponse.data ?? []).map((raw) => ({
        id: String(raw.id ?? ""),
        clientId: raw.client_id ? String(raw.client_id) : undefined,
        clientName: String(raw.client_name ?? "Anónimo"),
        clientEmail: raw.client_email ? String(raw.client_email) : undefined,
        clientAvatar: raw.client_avatar ? String(raw.client_avatar) : undefined,
        message: String(raw.message ?? ""),
        rating: Number(raw.rating ?? 5),
        isApproved: Boolean(raw.is_approved),
        isFeatured: Boolean(raw.is_featured),
        createdAt: String(raw.created_at ?? ""),
        approvedAt: raw.approved_at ? String(raw.approved_at) : undefined,
      }));
      setTestimonialsList(testimonialList);
      setPublicData({
        services: serviceList,
        barbers: userList.filter((user) => user.role === "barber" && user.active && user.approved),
        products: productList.filter((product) => product.active),
      });
      setServices(serviceList);
      setUsers(userList);
      setProducts(productList);
      // Guardar en cache localStorage
      try {
        window.localStorage.setItem("barbados360.products", JSON.stringify(productList));
        window.localStorage.setItem("barbados360.services", JSON.stringify(serviceList));
        window.localStorage.setItem("barbados360.users", JSON.stringify(userList));
        window.localStorage.setItem("barbados360.testimonials", JSON.stringify(testimonialList));
      } catch {}
      if (!bookingForm.barberId && userList.some((user) => user.role === "barber" && user.active && user.approved)) {
        const barber = userList.find((user) => user.role === "barber" && user.active && user.approved);
        const service = serviceList[0];
        setBookingForm((current) => ({ ...current, barberId: barber?.id ?? "", serviceId: service?.id ?? "" }));
        setBookingForm((current: BookingForm) => ({ ...current, barberId: barber?.id ?? "", serviceId: service?.id ?? "" }));
      }
    });
  }

  async function bootstrapSession(base: string, userId: string, showErrors = true) {
    try {
      const [usersResponse, servicesResponse, productsResponse, applicationsResponse, appointmentsResponse, conversationsResponse, notificationsResponse, ordersResponse, summaryResponse, profileResponse, cartResponse] =
        await Promise.all([
          apiRequest<Record<string, unknown>[]>(base, "/users"),
          apiRequest<Record<string, unknown>[]>(base, "/services"),
          apiRequest<Record<string, unknown>[]>(base, "/products"),
          apiRequest<Record<string, unknown>[]>(base, "/applications"),
          apiRequest<Record<string, unknown>[]>(base, "/appointments"),
          apiRequest<Record<string, unknown>[]>(base, "/conversations"),
          apiRequest<Record<string, unknown>[]>(base, "/notifications"),
          apiRequest<Record<string, unknown>[]>(base, "/orders"),
          apiRequest<Record<string, unknown>>(base, "/dashboard/summary"),
          apiRequest<Record<string, unknown>>(base, `/users/${userId}/profile`),
          apiRequest<Record<string, unknown>[]>(base, `/cart?client_id=${encodeURIComponent(userId)}`),
        ]);

      const payload: BootstrapData = {
        user: normalizeUser((usersResponse.data ?? []).find((user) => String((user as Record<string, unknown>).id) === userId) as Record<string, unknown>),
        users: (usersResponse.data ?? []).map(normalizeUser),
        services: (servicesResponse.data ?? []).map(normalizeService),
        products: (productsResponse.data ?? []).map(normalizeProduct),
        applications: (applicationsResponse.data ?? []).map(normalizeApplication),
        appointments: (appointmentsResponse.data ?? []).map(normalizeAppointment),
        conversations: (conversationsResponse.data ?? []).map(normalizeConversation),
        notifications: (notificationsResponse.data ?? []).map(normalizeNotification),
        orders: (ordersResponse.data ?? []).map(normalizeOrder),
        cart: (cartResponse.data ?? []).map((item) => ({
          productId: String((item as Record<string, unknown>).product_id ?? (item as Record<string, unknown>).productId ?? ""),
          quantity: Number((item as Record<string, unknown>).quantity ?? 0),
          productName: (item as Record<string, unknown>).product_name ? String((item as Record<string, unknown>).product_name) : undefined,
          productPrice: Number((item as Record<string, unknown>).product_price ?? 0),
          productImage: (item as Record<string, unknown>).product_image ? String((item as Record<string, unknown>).product_image) : undefined,
        })),
        summary: normalizeSummary(summaryResponse.data ?? null),
      };

      if (!payload.user?.id) {
        window.localStorage.removeItem("barbados360.userId");
        setSessionUser(null);
        setInitialAlertShown(false);
        setSeenCountsLoaded(false);
        return;
      }

      setSessionUser(payload.user);
      setUsers(payload.users);
      setServices(payload.services);
      // Guardar en cache localStorage
      try {
        window.localStorage.setItem("barbados360.users", JSON.stringify(payload.users));
        window.localStorage.setItem("barbados360.services", JSON.stringify(payload.services));
      } catch {}
      setApplications(payload.applications);
      setAppointments(payload.appointments);
      setConversations(payload.conversations);
      setNotifications(payload.notifications);
      setOrders(payload.orders);
      setCart(payload.cart);
      setSummary(payload.summary);
      setAccountProfile(normalizeAccountProfile(profileResponse.data ?? null));
      // Actualiza productos, pero respeta el estado manual
      setProducts(payload.products.map((p) => p));
      // Guardar en cache localStorage
      try {
        window.localStorage.setItem("barbados360.products", JSON.stringify(payload.products));
      } catch {}
      setPublicData({
        services: payload.services,
        barbers: payload.users.filter((user) => user.role === "barber" && user.active && user.approved),
        products: sessionUser && sessionUser.role === "admin"
          ? payload.products
          : payload.products.filter((p) => p.active),
      });
      setBookingForm((current) => ({
        ...current,
        barberId: current.barberId || payload.users.find((user) => user.role === "barber" && user.active && user.approved)?.id || "",
        serviceId: current.serviceId || payload.services[0]?.id || "",
      }));
      
      // Cargar todos los testimonios para admin
      if (payload.user.role === "admin") {
        try {
          const allTestimonialsResponse = await apiRequest<Record<string, unknown>[]>(
            base, 
            `/testimonials?approved=false&actor_id=${encodeURIComponent(userId)}&limit=50`
          );
          const allTestimonials: Testimonial[] = (allTestimonialsResponse.data ?? []).map((raw) => ({
            id: String(raw.id ?? ""),
            clientId: raw.client_id ? String(raw.client_id) : undefined,
            clientName: String(raw.client_name ?? "Anónimo"),
            clientEmail: raw.client_email ? String(raw.client_email) : undefined,
            clientAvatar: raw.client_avatar ? String(raw.client_avatar) : undefined,
            message: String(raw.message ?? ""),
            rating: Number(raw.rating ?? 5),
            isApproved: Boolean(raw.is_approved),
            isFeatured: Boolean(raw.is_featured),
            createdAt: String(raw.created_at ?? ""),
            approvedAt: raw.approved_at ? String(raw.approved_at) : undefined,
          }));
          setAdminTestimonials(allTestimonials);
        } catch {
          // Silently fail if testimonials can't be loaded
        }
      }
    } catch (err) {
      if (showErrors) {
        setError(err instanceof Error ? err.message : "No se pudo cargar la sesión.");
      }
    }
  }

  async function refreshSession() {
    if (!apiBase || !sessionUser) return;
    await bootstrapSession(apiBase, sessionUser.id, false);
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!apiBase) return;
    setLoading(true);
    setError("");
    setSuccess("Registrando usuario...");

    apiRequest(apiBase, "/auth/register", {
      method: "POST",
      ...jsonBody(registerForm),
    })
      .then((response) => {
        const createdUserId = String(response.id ?? "");
        window.localStorage.setItem("barbados360.userId", createdUserId);
        // Activar sesión y navegar al dashboard al instante
        setSessionUser({
          id: createdUserId,
          name: registerForm.name,
          email: registerForm.email,
          phone: registerForm.phone,
          role: registerForm.role,
          active: true,
          approved: true,
          avatar: "",
          createdAt: undefined,
        });
        setRoute("dashboard");
        setDashboardTab("overview");
        setRegisterForm({ name: "", email: "", phone: "", password: "", role: "client" });
        // Cargar datos completos en background
        bootstrapSession(apiBase, createdUserId);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "No se pudo registrar la cuenta.");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!apiBase) return;
    setLoading(true);
    setError("");
    setSuccess("Iniciando sesión...");

    apiRequest<{ user_id: string }>(apiBase, "/auth/login", {
      method: "POST",
      ...jsonBody(loginForm),
    })
      .then((response) => {
        const userId = String(response.data?.user_id ?? "");
        window.localStorage.setItem("barbados360.userId", userId);
        window.localStorage.removeItem(`barbados360.alertShown.${userId}`);
        setInitialAlertShown(false);
        setSeenCountsLoaded(false);
        previousNotificationCountRef.current = 0;
        previousMessageCountRef.current = 0;
        // Navegar al dashboard solo si la sesión se carga correctamente
        bootstrapSession(apiBase, userId)
          .then(() => {
            setRoute("dashboard");
            setDashboardTab("overview");
          })
          .catch(() => {
            setError("No se pudo cargar la sesión. Verifica tu cuenta o intenta de nuevo.");
          });
        setLoginForm({ email: "", password: "" });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  async function handleSubmitSuggestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!apiBase) return;
    setSubmittingSuggestion(true);
    setError("");
    setSuccess("Enviando sugerencia...");

    try {
      const payload: Record<string, unknown> = {
        client_name: suggestionForm.name || (sessionUser?.name ?? "Anónimo"),
        client_email: suggestionForm.email || (sessionUser?.email ?? ""),
        message: suggestionForm.message,
        rating: suggestionForm.rating,
      };
      
      if (sessionUser) {
        payload.client_id = sessionUser.id;
        payload.client_avatar = sessionUser.avatar;
      }

      await apiRequest(apiBase, "/testimonials", {
        method: "POST",
        ...jsonBody(payload),
      });
      
      setSuccess("¡Gracias por tu sugerencia! Será revisada pronto.");
      setSuggestionForm({ name: "", email: "", message: "", rating: 5 });
      setShowSuggestionForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar la sugerencia.");
    } finally {
      setSubmittingSuggestion(false);
    }
  }

  async function handleApproveTestimonial(testimonialId: string, approve: boolean) {
    if (!apiBase || !sessionUser) return;
    setLoading(true);
    setSuccess(approve ? "Aprobando testimonio..." : "Ocultando testimonio...");
    try {
      await apiRequest(apiBase, `/testimonials/${testimonialId}`, {
        method: "PATCH",
        ...jsonBody({ actor_id: sessionUser.id, is_approved: approve }),
      });
      // Actualizar lista local
      setAdminTestimonials((prev) =>
        prev.map((t) => (t.id === testimonialId ? { ...t, isApproved: approve } : t))
      );
      // Recargar testimonios públicos si se aprobó
      if (approve) {
        const publicResponse = await apiRequest<Record<string, unknown>[]>(apiBase, "/testimonials?approved=true&limit=12");
        const publicList: Testimonial[] = (publicResponse.data ?? []).map((raw) => ({
          id: String(raw.id ?? ""),
          clientId: raw.client_id ? String(raw.client_id) : undefined,
          clientName: String(raw.client_name ?? "Anónimo"),
          clientEmail: raw.client_email ? String(raw.client_email) : undefined,
          clientAvatar: raw.client_avatar ? String(raw.client_avatar) : undefined,
          message: String(raw.message ?? ""),
          rating: Number(raw.rating ?? 5),
          isApproved: Boolean(raw.is_approved),
          isFeatured: Boolean(raw.is_featured),
          createdAt: String(raw.created_at ?? ""),
          approvedAt: raw.approved_at ? String(raw.approved_at) : undefined,
        }));
        setTestimonialsList(publicList);
      }
      setSuccess(approve ? "Testimonio aprobado y publicado." : "Testimonio ocultado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el testimonio.");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleFeatured(testimonialId: string, featured: boolean) {
    if (!apiBase || !sessionUser) return;
    setSuccess(featured ? "Destacando testimonio..." : "Quitando destacado...");
    try {
      await apiRequest(apiBase, `/testimonials/${testimonialId}`, {
        method: "PATCH",
        ...jsonBody({ actor_id: sessionUser.id, is_featured: featured }),
      });
      setAdminTestimonials((prev) =>
        prev.map((t) => (t.id === testimonialId ? { ...t, isFeatured: featured } : t))
      );
      setSuccess(featured ? "Testimonio destacado." : "Testimonio ya no está destacado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar.");
    }
  }

  async function handleDeleteTestimonial(testimonialId: string) {
    if (!apiBase || !sessionUser) return;
    if (!window.confirm("¿Eliminar este testimonio permanentemente?")) return;
    setLoading(true);
    setSuccess("Eliminando testimonio...");
    try {
      await apiRequest(apiBase, `/testimonials/${testimonialId}?actor_id=${encodeURIComponent(sessionUser.id)}`, {
        method: "DELETE",
      });
      setAdminTestimonials((prev) => prev.filter((t) => t.id !== testimonialId));
      setTestimonialsList((prev) => prev.filter((t) => t.id !== testimonialId));
      setSuccess("Testimonio eliminado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar.");
    } finally {
      setLoading(false);
    }
  }

  // =====================================
  // FUNCIONES PARA CORTES DE BARBERO
  // =====================================
  async function loadBarberCuts(date?: string) {
    if (!apiBase || !sessionUser) return;
    const targetDate = date || cutsDate;
    try {
      if (sessionUser.role === "admin") {
        // Admin carga resumen de todos los barberos
        const response = await apiRequest<Record<string, unknown>[]>(
          apiBase,
          `/cuts/summary?actor_id=${encodeURIComponent(sessionUser.id)}&date=${targetDate}`
        );
        const summaryList: BarberCutsSummary[] = (response.data ?? []).map((raw: Record<string, unknown>) => ({
          barberId: String(raw.barber_id ?? ""),
          barberName: String(raw.barber_name ?? ""),
          avatarUrl: raw.avatar_url ? String(raw.avatar_url) : undefined,
          totalCuts: Number(raw.total_cuts ?? 0),
          totalEarnings: Number(raw.total_earnings ?? 0),
        }));
        setBarberCutsSummary(summaryList);
        setCutsTotal(response.grandTotal ?? 0);
      } else if (sessionUser.role === "barber") {
        // Barbero carga sus propios cortes
        const response = await apiRequest<Record<string, unknown>[]>(
          apiBase,
          `/cuts?actor_id=${encodeURIComponent(sessionUser.id)}&date=${targetDate}`
        );
        const cutsList: BarberCut[] = (response.data ?? []).map((raw: Record<string, unknown>) => ({
          id: String(raw.id ?? ""),
          barberId: String(raw.barber_id ?? ""),
          barberName: raw.barber_name ? String(raw.barber_name) : undefined,
          serviceId: raw.service_id ? String(raw.service_id) : undefined,
          clientName: String(raw.client_name ?? ""),
          serviceName: String(raw.service_name ?? ""),
          price: Number(raw.price ?? 0),
          notes: raw.notes ? String(raw.notes) : undefined,
          cutDate: String(raw.cut_date ?? ""),
          createdAt: String(raw.created_at ?? ""),
        }));
        setBarberCuts(cutsList);
        setCutsTotal(response.total ?? 0);
      }
    } catch (err) {
      console.error("Error cargando cortes:", err);
    }
  }

  // Cargar cortes detallados de un barbero específico (para admin)
  async function loadBarberCutsDetail(barberId: string) {
    if (!apiBase || !sessionUser || sessionUser.role !== "admin") return;
    try {
      const response = await apiRequest<Record<string, unknown>[]>(
        apiBase,
        `/cuts?actor_id=${encodeURIComponent(sessionUser.id)}&barber_id=${encodeURIComponent(barberId)}&date=${cutsDate}`
      );
      const cutsList: BarberCut[] = (response.data ?? []).map((raw: Record<string, unknown>) => ({
        id: String(raw.id ?? ""),
        barberId: String(raw.barber_id ?? ""),
        barberName: raw.barber_name ? String(raw.barber_name) : undefined,
        serviceId: raw.service_id ? String(raw.service_id) : undefined,
        clientName: String(raw.client_name ?? ""),
        serviceName: String(raw.service_name ?? ""),
        price: Number(raw.price ?? 0),
        notes: raw.notes ? String(raw.notes) : undefined,
        cutDate: String(raw.cut_date ?? ""),
        createdAt: String(raw.created_at ?? ""),
      }));
      // Actualizar el summary con los cortes detallados
      setBarberCutsSummary(prev => prev.map(b => 
        b.barberId === barberId ? { ...b, cuts: cutsList } : b
      ));
    } catch (err) {
      console.error("Error cargando detalle de cortes:", err);
    }
  }

  // Expandir/colapsar detalles de un barbero
  function toggleBarberExpand(barberId: string) {
    setExpandedBarberIds(prev => {
      const next = new Set(prev);
      if (next.has(barberId)) {
        next.delete(barberId);
      } else {
        next.add(barberId);
        // Cargar detalles si no están cargados
        const barber = barberCutsSummary.find(b => b.barberId === barberId);
        if (barber && !barber.cuts) {
          void loadBarberCutsDetail(barberId);
        }
      }
      return next;
    });
  }

  async function handleRegisterCut(event: React.FormEvent) {
    event.preventDefault();
    if (!apiBase || !sessionUser || sessionUser.role !== "barber") return;
    if (!cutForm.clientName.trim() || !cutForm.serviceName.trim() || cutForm.price <= 0) {
      setError("Completa todos los campos del corte.");
      return;
    }
    setSubmittingCut(true);
    setSuccess("Registrando corte...");
    try {
      await apiRequest(apiBase, "/cuts", {
        method: "POST",
        body: JSON.stringify({
          actor_id: sessionUser.id,
          client_name: cutForm.clientName.trim(),
          service_id: cutForm.serviceId || null,
          service_name: cutForm.serviceName.trim(),
          price: cutForm.price,
          notes: cutForm.notes.trim(),
          cut_date: cutsDate,
        }),
      });
      setCutForm({ clientName: "", serviceId: "", serviceName: "", price: 0, notes: "" });
      setSuccess("Corte registrado correctamente.");
      await loadBarberCuts(cutsDate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el corte.");
    } finally {
      setSubmittingCut(false);
    }
  }

  async function handleDeleteCut(cutId: string) {
    if (!apiBase || !sessionUser) return;
    if (!window.confirm("¿Eliminar este corte?")) return;
    setLoading(true);
    setSuccess("Eliminando corte...");
    try {
      await apiRequest(apiBase, `/cuts/${cutId}?actor_id=${encodeURIComponent(sessionUser.id)}`, {
        method: "DELETE",
      });
      setBarberCuts((prev) => prev.filter((c) => c.id !== cutId));
      setSuccess("Corte eliminado.");
      await loadBarberCuts(cutsDate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar.");
    } finally {
      setLoading(false);
    }
  }

  // Cargar cortes cuando cambia la fecha o el tab
  useEffect(() => {
    if (sessionUser && (sessionUser.role === "barber" || sessionUser.role === "admin") && dashboardTab === "cuts") {
      void loadBarberCuts(cutsDate);
    }
  }, [cutsDate, dashboardTab, sessionUser?.id]);

  async function handleLogout() {
    const userId = sessionUser?.id;
    window.localStorage.removeItem("barbados360.userId");
    // Limpiar el flag de alerta para que al volver a entrar pueda mostrar nuevas notificaciones en este login
    if (userId) {
      window.localStorage.removeItem(`barbados360.alertShown.${userId}`);
    }
    setSessionUser(null);
    setRoute("home");
    setDashboardTab("overview");
    setSelectedConversationId("");
    setCart([]);
    setShowUnreadBanner(false);
    setInitialAlertShown(false);
    setSeenCountsLoaded(false);
    previousNotificationCountRef.current = 0;
    previousMessageCountRef.current = 0;
  }

  async function handleApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!apiBase) return;
    setLoading(true);
    setError("");
    setSuccess("Enviando postulación...");

    try {
      await apiRequest(apiBase, "/applications", {
        method: "POST",
        ...jsonBody(applyForm),
      });
      setSuccess("Tu postulación fue enviada correctamente.");
      setApplyForm({ name: "", email: "", phone: "", specialty: "", experience: 1, note: "" });
      if (sessionUser) {
        await refreshSession();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar la postulación.");
    } finally {
      setLoading(false);
    }
  }

  async function createAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!apiBase || !sessionUser) return;
    setLoading(true);
    setError("");
    setSuccess("Creando cita...");

    try {
      await apiRequest(apiBase, "/appointments", {
        method: "POST",
        ...jsonBody({
          client_id: sessionUser.id,
          barber_id: bookingForm.barberId,
          service_id: bookingForm.serviceId,
          date: new Date(bookingForm.date).toISOString(),
          notes: bookingForm.notes,
        }),
      });
      await refreshSession();
      setSuccess("Tu cita fue creada correctamente.");
      setDashboardTab("appointments");
      setBookingForm((current) => ({ ...current, notes: "", date: toInputDate(new Date(Date.now() + 86400000)) }));
      setBookingForm((current: BookingForm) => ({ ...current, notes: "", date: toInputDate(new Date(Date.now() + 86400000)) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cita.");
    } finally {
      setLoading(false);
    }
  }

  async function changeAppointmentStatus(appointmentId: string, action: "accept" | "cancel" | "complete") {
    if (!apiBase) return;
    setLoading(true);
    setError("");
    setSuccess("Actualizando cita...");

    try {
      await apiRequest(apiBase, `/appointments/${appointmentId}/${action}`, { method: "POST" });
      await refreshSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la cita.");
    } finally {
      setLoading(false);
    }
  }

  async function createConversation(appointmentId: string) {
    if (!apiBase || !sessionUser) return;
    setLoading(true);
    setError("");
    setSuccess("Creando conversación...");

    try {
      const appointment = appointments.find((item) => item.id === appointmentId);
      const client = appointment ? usersById[appointment.clientId] : null;
      const service = appointment ? servicesById[appointment.serviceId] : null;
      const response = await apiRequest<{ id?: string }>(apiBase, "/conversations", {
        method: "POST",
        ...jsonBody({
          appointment_id: appointmentId,
          sender_id: sessionUser.id,
          title: `${service?.name ?? "Servicio"} · ${client?.name ?? "Conversación"}`,
        }),
      });
      await refreshSession();
      const createdId = String(response.id ?? response.data?.id ?? "");
      if (createdId) setSelectedConversationId(createdId);
      setDashboardTab("chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la conversación.");
    } finally {
      setLoading(false);
    }
  }

  async function createDirectConversation(barberId: string) {
    if (!apiBase || !sessionUser) return;
    setLoading(true);
    setError("");
    setSuccess("Creando chat...");

    try {
      const barber = usersById[barberId];
      const response = await apiRequest<{ id?: string }>(apiBase, "/conversations", {
        method: "POST",
        ...jsonBody({
          barber_id: barberId,
          client_id: sessionUser.id,
          sender_id: sessionUser.id,
          title: `Chat con ${barber?.name ?? "Barbero"}`,
        }),
      });
      await refreshSession();
      const createdId = String(response.id ?? response.data?.id ?? "");
      if (createdId) setSelectedConversationId(createdId);
      setSuccess("Conversación creada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la conversación.");
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!apiBase || !sessionUser || !selectedConversation) return;
    if (!messageDraft.trim() && !attachment) return;
    setError("");
    setSuccess("Enviando mensaje...");
    // Optimistic UI: mostrar mensaje instantáneo en la conversación seleccionada
    if (messageDraft.trim()) {
      const tempId = `temp-${Date.now()}`;
      setConversations((prev: any[]) => prev.map(conv =>
        conv.id === selectedConversationId
          ? { ...conv, messages: [...(conv.messages || []), { id: tempId, senderId: sessionUser.id, kind: "text", text: messageDraft.trim(), createdAt: new Date().toISOString() }] }
          : conv
      ));
    }
    if (attachment) {
      const tempId = `temp-${Date.now()}-att`;
      setConversations((prev: any[]) => prev.map(conv =>
        conv.id === selectedConversationId
          ? { ...conv, messages: [...(conv.messages || []), { id: tempId, senderId: sessionUser.id, kind: attachment.kind, text: attachment.kind === "image" ? "Imagen enviada por el usuario." : "Nota de voz enviada por el usuario.", createdAt: new Date().toISOString() }] }
          : conv
      ));
    }
    setMessageDraft("");
    setAttachment(null);
    setLoading(true);
    try {
      if (messageDraft.trim()) {
        await apiRequest(apiBase, `/conversations/${selectedConversation.id}/messages`, {
          method: "POST",
          ...jsonBody({ sender_id: sessionUser.id, kind: "text", text: messageDraft.trim() }),
        });
      }
      if (attachment) {
        const fileToBase64 = (file: Blob): Promise<string> => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        };
        const base64Data = await fileToBase64(attachment.file);
        await apiRequest(apiBase, `/conversations/${selectedConversation.id}/messages`, {
          method: "POST",
          ...jsonBody({
            sender_id: sessionUser.id,
            kind: attachment.kind,
            text: attachment.kind === "image" ? "Imagen enviada por el usuario." : "Nota de voz enviada por el usuario.",
            duration: attachment.duration,
            media_base64: base64Data,
            media_name: attachment.name,
          }),
        });
      }
      await refreshSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el mensaje.");
      await refreshSession();
    } finally {
      setLoading(false);
    }
  }

  async function clearConversation() {
    if (!apiBase || !sessionUser || !selectedConversation) return;
    setLoading(true);
    setSuccess("Limpiando chat...");
    try {
      await apiRequest(apiBase, `/conversations/${selectedConversation.id}/clear`, {
        method: "POST",
        ...jsonBody({ sender_id: sessionUser.id }),
      });
      await refreshSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo limpiar el chat.");
    } finally {
      setLoading(false);
    }
  }

  async function archiveConversation() {
    if (!apiBase || !sessionUser || !selectedConversation) return;
    setLoading(true);
    setSuccess("Archivando chat...");
    try {
      await apiRequest(apiBase, `/conversations/${selectedConversation.id}`, {
        method: "DELETE",
        ...jsonBody({ sender_id: sessionUser.id }),
      });
      setSelectedConversationId("");
      await refreshSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo archivar la conversación.");
    } finally {
      setLoading(false);
    }
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!apiBase || !sessionUser || sessionUser.role !== "admin") return;
    setLoading(true);
    setSuccess("Creando usuario...");
    try {
      await apiRequest(apiBase, "/users", {
        method: "POST",
        ...jsonBody(userForm),
      });
      await refreshSession();
      setUserForm({ name: "", email: "", phone: "", password: "", role: "client" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el usuario.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleUser(user: User) {
    if (!apiBase || !sessionUser || sessionUser.role !== "admin") return;
    setLoading(true);
    setSuccess("Actualizando usuario...");
    try {
      await apiRequest(apiBase, `/users/${user.id}`, {
        method: "PATCH",
        ...jsonBody({ active: !user.active }),
      });
      await refreshSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el usuario.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(userId: string) {
    if (!apiBase || !sessionUser || sessionUser.role !== "admin") return;
    setLoading(true);
    setSuccess("Eliminando usuario...");
    try {
      await apiRequest(apiBase, `/users/${userId}`, { method: "DELETE" });
      await refreshSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el usuario.");
    } finally {
      setLoading(false);
    }
  }

  async function reviewApplication(applicationId: string, decision: "approve" | "reject") {
    if (!apiBase || !sessionUser || sessionUser.role !== "admin") return;
    setLoading(true);
    setSuccess(decision === "approve" ? "Aprobando postulación..." : "Rechazando postulación...");
    try {
      await apiRequest(apiBase, `/applications/${applicationId}/${decision}`, { method: "POST" });
      await refreshSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo revisar la postulación.");
    } finally {
      setLoading(false);
    }
  }


 
  function mapProductPayload(payload: Partial<Product>) {
    // No renombrar 'active', solo retornar el payload tal cual
    return { ...payload };
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!apiBase || !sessionUser || sessionUser.role !== "admin") return;
    setLoading(true);
    setSuccess("Creando producto...");
    try {
      await apiRequest(apiBase, "/products", {
        method: "POST",
        ...jsonBody(productForm),
      });
      await refreshSession();
      setProductForm({ name: "", category: "Styling", description: "", price: 0, stock: 0, image: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el producto.");
    } finally {
      setLoading(false);
    }
  }

  // PATCH para ocultar/mostrar producto (no borra, solo cambia visibilidad)
  async function patchProduct(productId: string, payload: Partial<Product>) {
    if (!apiBase || !sessionUser || sessionUser.role !== "admin") return;
    setLoading(true);
    // Optimistic UI: refleja el cambio al instante
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...payload } : p));
    setSuccess("Actualizando producto...");
    const mappedPayload = mapProductPayload(payload);
    apiRequest(apiBase, `/products/${productId}`, {
      method: "PATCH",
      ...jsonBody(mappedPayload),
    })
      .then(() => {
        refreshProducts();
        setSuccess("Producto actualizado correctamente.");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "No se pudo actualizar el producto.");
        refreshProducts();
      })
      .finally(() => {
        setLoading(false);
      });
  }

  async function removeProduct(productId: string) {
    if (!apiBase || !sessionUser || sessionUser.role !== "admin") return;
    if (!confirm("¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.")) return;
    setLoading(true);
    setSuccess("Eliminando producto...");
    try {
      await apiRequest(apiBase, `/products/${productId}`, { method: "DELETE" });
      await refreshSession();
      setSuccess("Producto eliminado correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el producto.");
    } finally {
      setLoading(false);
    }
  }

  async function uploadProductImage(productId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !apiBase || !sessionUser || sessionUser.role !== "admin") return;
    setError("");
    setSuccess("Actualizando imagen...");
    // Optimistic UI: mostrar preview instantáneo
    const reader = new FileReader();
    reader.onload = async () => {
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, image: reader.result as string } : p));
      setLoading(true);
      try {
        await patchProduct(productId, { image: reader.result as string });
        await refreshProducts();
        setSuccess("Imagen del producto actualizada.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo actualizar la imagen.");
        await refreshProducts();
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => setError("No se pudo leer el archivo");
    reader.readAsDataURL(file);
  }
  // Nueva función para refrescar productos
  async function refreshProducts() {
    if (!apiBase) return;
    setLoading(true);
    try {
      const actorId = sessionUser ? sessionUser.id : "";
      const response = await apiRequest(apiBase, `/products?actor_id=${actorId}`);
      let productsList = response.data as Product[];
      // Nunca mostrar stock negativo
      productsList = productsList.map(p => ({ ...p, stock: p.stock < 0 ? 0 : p.stock }));
      setProducts(productsList);
      // Guardar en cache localStorage
      try {
        window.localStorage.setItem("barbados360.products", JSON.stringify(productsList));
      } catch {}
      // Admin ve todos, los demás solo activos
      if (sessionUser && sessionUser.role === "admin") {
        setPublicData((current) => ({ ...current, products: productsList }));
      } else {
        setPublicData((current) => ({ ...current, products: productsList.filter((p) => p.active) }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo refrescar productos.");
    } finally {
      setLoading(false);
    }
  }

  async function addToCart(productId: string) {
    if (!apiBase || !sessionUser || sessionUser.role !== "client") return;
    setLoading(true);
    setError("");
    setSuccess("Agregando al carrito...");
    try {
      await apiRequest(apiBase, "/cart", {
        method: "POST",
        ...jsonBody({ client_id: sessionUser.id, product_id: productId, quantity: 1 }),
      });
      await refreshSession();
      setSuccess("Producto agregado al carrito.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar al carrito.");
    } finally {
      setLoading(false);
    }
  }

  async function updateCart(productId: string, delta: number) {
    if (!apiBase || !sessionUser || sessionUser.role !== "client") return;
    const currentItem = cart.find((item) => item.productId === productId);
    if (!currentItem) return;
    const nextQuantity = currentItem.quantity + delta;
    setLoading(true);
    setError("");
    setSuccess("Actualizando carrito...");
    try {
      if (nextQuantity <= 0) {
        await apiRequest(apiBase, `/cart/${productId}`, { method: "DELETE" });
      } else {
        await apiRequest(apiBase, `/cart/${productId}`, {
          method: "PATCH",
          ...jsonBody({ quantity: nextQuantity }),
        });
      }
      await refreshSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el carrito.");
    } finally {
      setLoading(false);
    }
  }

  async function checkout() {
    if (!apiBase || !sessionUser || cart.length === 0) return;
    setLoading(true);
    setSuccess("Procesando compra...");
    try {
      await apiRequest(apiBase, "/orders/checkout", {
        method: "POST",
        ...jsonBody({
          client_id: sessionUser.id,
          items: cart.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
        }),
      });
      setCart([]);
      await refreshSession();
      setDashboardTab("orders");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la compra.");
    } finally {
      setLoading(false);
    }
  }

  async function markNotificationsRead() {
    if (!apiBase || !sessionUser) return;
    setLoading(true);
    setSuccess("Marcando notificaciones...");
    try {
      await apiRequest(apiBase, "/notifications/read-all", {
        method: "POST",
        ...jsonBody({ user_id: sessionUser.id }),
      });
      await refreshSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron marcar las notificaciones.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteOwnAccount() {
    if (!apiBase || !sessionUser) return;
    setLoading(true);
    setSuccess("Eliminando cuenta...");
    try {
      await apiRequest(apiBase, `/users/${sessionUser.id}`, { method: "DELETE" });
      await handleLogout();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la cuenta.");
    } finally {
      setLoading(false);
    }
  }

  async function updateOwnProfile() {
    if (!apiBase || !sessionUser) return;
    setLoading(true);
    setError("");
    setSuccess("Actualizando perfil...");
    try {
      await apiRequest(apiBase, `/users/${sessionUser.id}`, {
        method: "PATCH",
        ...jsonBody({
          name: profileForm.name || sessionUser.name,
          phone: profileForm.phone,
        }),
      });
      await refreshSession();
      setEditingProfile(false);
      setSuccess("Perfil actualizado correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el perfil.");
    } finally {
      setLoading(false);
    }
  }

  // Función auxiliar para obtener la URL base del API real (no proxied)
  function getRealApiBase(): string {
    if (apiBase && !apiBase.startsWith("/")) {
      return apiBase;
    }
    // Si es relativo (/api), construir URL absoluta basada en el host actual
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:8001/api";
    }
    return `http://${host}:8001/api`;
  }

  async function uploadOwnAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !apiBase || !sessionUser) return;

    setError("");
    // Optimistic UI: mostrar el nuevo avatar al instante
    const previousAvatar = sessionUser.avatar;
    const tempUrl = URL.createObjectURL(file);
    setSessionUser((prev) => prev ? { ...prev, avatar: tempUrl } : prev);
    setAccountProfile((prev) => prev && prev.user ? { ...prev, user: { ...prev.user, avatar: tempUrl } } : prev);
    setSuccess("Actualizando foto de perfil...");
    setLoading(true);
    try {
      // Convertir archivo a base64 para evitar problemas con multipart/form-data
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
        reader.readAsDataURL(file);
      });

      // Usar endpoint PUT con base64 (más confiable con proxies y dispositivos móviles)
      const uploadBase = getRealApiBase();
      const response = await fetch(`${uploadBase}/users/${sessionUser.id}/avatar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actor_id: sessionUser.id,
          avatar_base64: base64,
          file_name: file.name,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.message || result.error || `Error ${response.status}`);
      }
      await refreshSession();
      setSuccess("Foto de perfil actualizada correctamente.");
    } catch (err) {
      // Restaurar avatar anterior si falla
      setSessionUser((prev) => prev ? { ...prev, avatar: previousAvatar } : prev);
      setAccountProfile((prev) => prev && prev.user ? { ...prev, user: { ...prev.user, avatar: previousAvatar } } : prev);
      setError(err instanceof Error ? err.message : "No se pudo actualizar la foto de perfil.");
    } finally {
      setLoading(false);
    }
  }

  async function removeOwnAvatar() {
    if (!apiBase || !sessionUser) return;
    setLoading(true);
    setError("");
    setSuccess("Eliminando foto de perfil...");
    try {
      // Usar directamente el endpoint para evitar problemas con proxy
      const deleteBase = getRealApiBase();
      
      const response = await fetch(`${deleteBase}/users/${sessionUser.id}/avatar`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ actor_id: sessionUser.id }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.ok) {
        throw new Error(result.message || result.error || `Error ${response.status}`);
      }
      
      await refreshSession();
      setSuccess("Foto de perfil eliminada correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la foto de perfil.");
    } finally {
      setLoading(false);
    }
  }

  async function onAttachImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setAttachment({ file, previewUrl, kind: "image", name: file.name });
    event.target.value = "";
  }

  // Efecto para actualizar el tiempo de grabación en vivo
  useEffect(() => {
    if (!recording) {
      setRecordingTime(0);
      return;
    }
    const interval = window.setInterval(() => {
      setRecordingTime(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [recording]);

  async function startRecording() {
    // Verificar si estamos en un contexto seguro (HTTPS o localhost)
    const isSecureContext = window.isSecureContext || 
                           window.location.protocol === "https:" || 
                           window.location.hostname === "localhost" || 
                           window.location.hostname === "127.0.0.1";
    
    if (!isSecureContext) {
      setError("⚠️ Para grabar voz desde otro dispositivo, necesitas HTTPS. En desarrollo local usa localhost.");
      alert("El micrófono requiere HTTPS para funcionar desde otros dispositivos. Accede desde localhost en tu PC o configura HTTPS.");
      return;
    }

    if (!navigator.mediaDevices) {
      setError("Tu navegador no soporta acceso al micrófono. Usa Chrome o Firefox actualizado.");
      alert("navigator.mediaDevices no está disponible. Actualiza tu navegador.");
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      setError("Tu navegador no soporta grabación de audio.");
      return;
    }

    try {
      setSuccess("Solicitando permiso de micrófono...");
      
      // Pedir permiso de micrófono - aparecerá el popup del navegador
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      
      // Detectar el mejor formato de audio soportado
      let mimeType = "";
      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
        "audio/ogg",
        "",
      ];
      
      for (const type of mimeTypes) {
        if (type === "" || MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      const recorderOptions: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, recorderOptions);
      chunksRef.current = [];
      startedAtRef.current = Date.now();
      setRecordingTime(0);
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      
      recorder.onstop = () => {
        const actualMime = recorder.mimeType || mimeType || "audio/webm";
        const extension = actualMime.includes("mp4") ? "m4a" : actualMime.includes("ogg") ? "ogg" : "webm";
        const file = new Blob(chunksRef.current, { type: actualMime });
        const durationInSeconds = Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000));
        const previewUrl = URL.createObjectURL(file);
        const minutes = Math.floor(durationInSeconds / 60);
        const seconds = String(durationInSeconds % 60).padStart(2, "0");
        setAttachment({ file, previewUrl, kind: "voice", name: `audio-${Date.now()}.${extension}`, duration: `${minutes}:${seconds}` });
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        setSuccess("✅ Audio grabado. Presiona Enviar.");
      };
      
      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setError("Error durante la grabación.");
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
      };
      
      recorderRef.current = recorder;
      recorder.start(100); // Capturar cada 100ms para mejor calidad
      setRecording(true);
      setSuccess("🎤 GRABANDO... Habla ahora. Presiona DETENER cuando termines.");
    } catch (err) {
      console.error("Error al acceder al micrófono:", err);
      const errorName = err instanceof Error ? err.name : "Unknown";
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      if (errorName === "NotAllowedError") {
        setError("❌ Permiso de micrófono DENEGADO. Ve a configuración del navegador y actívalo.");
        alert("Permiso de micrófono denegado. En Chrome Android: Configuración > Permisos > Micrófono > Permitir");
      } else if (errorName === "NotFoundError") {
        setError("❌ No se encontró micrófono en este dispositivo.");
      } else if (errorName === "NotReadableError") {
        setError("❌ El micrófono está siendo usado por otra aplicación.");
      } else {
        setError(`❌ Error de micrófono: ${errorMessage}`);
        alert(`Error: ${errorName} - ${errorMessage}`);
      }
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  const kpiUsers = summary?.users ?? users.length;
  const kpiRevenue = summary?.revenueYear ?? orders.reduce((sum, order) => sum + order.total, 0);
  const kpiInventory = summary?.inventoryValue ?? products.reduce((sum, product) => sum + product.price * product.stock, 0);
  const kpiPending = summary?.pendingAppointments ?? appointments.filter((appointment) => appointment.status === "pending").length;
  const monthlyRevenue = summary?.monthlyRevenue ?? [];
  const displayedAppointments =
    sessionUser?.role === "admin"
      ? appointments
      : sessionUser?.role === "barber"
        ? appointments.filter((appointment) => appointment.barberId === sessionUser.id)
        : appointments.filter((appointment) => appointment.clientId === sessionUser?.id);


  // Si la API no está lista, muestra un banner de error pero renderiza la app igual
  // Esto permite máxima fluidez y feedback inmediato

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-brand">
          <img src={barbadosLogo} alt="Barbados Logo" className="brand-logo" />
          <div className="brand-text">
            <h1>Barbados</h1>
            <span className="brand-tagline">ESTILO QUE DEFINE</span>
          </div>
        </div>

        <nav className="site-nav">
          <button className={`nav-link ${route === "home" ? "nav-link--active" : ""}`} onClick={() => setRoute("home")} type="button">Inicio</button>
          <button className={`nav-link ${route === "services" ? "nav-link--active" : ""}`} onClick={() => setRoute("services")} type="button">Servicios</button>
          <button className={`nav-link ${route === "shop" ? "nav-link--active" : ""}`} onClick={() => setRoute("shop")} type="button">Tienda</button>
          <button className={`nav-link ${route === "apply" ? "nav-link--active" : ""}`} onClick={() => setRoute("apply")} type="button">Trabaja con nosotros</button>
          {!sessionUser ? (
            <>
              <button className={`nav-link ${route === "login" ? "nav-link--active" : ""}`} onClick={() => setRoute("login")} type="button">Login</button>
              <button className={`nav-link ${route === "register" ? "nav-link--active" : ""}`} onClick={() => setRoute("register")} type="button">Registro</button>
            </>
          ) : (
            <>
              <button className={`nav-link ${route === "dashboard" ? "nav-link--active" : ""}`} onClick={() => setRoute("dashboard")} type="button">Mi panel</button>
              <button className="button button--ghost button--small" onClick={() => void handleLogout()} type="button">Salir</button>
            </>
          )}
        </nav>
      </header>

      {error && (
        <div className="alert alert--danger">
          <strong>Error:</strong> {error}
        </div>
      )}
      {success && (
        <div className="alert alert--success">
          <strong>OK:</strong> {success}
        </div>
      )}
      {liveAlert && (
        <div className={`notification-toast notification-toast--${liveAlert.kind}`}>
          <div className="notification-toast__icon">
            {liveAlert.kind === "message" ? "💬" : "🔔"}
          </div>
          <div className="notification-toast__content">
            <strong className="notification-toast__title">{liveAlert.kind === "message" ? "Nuevo mensaje" : "Nueva notificación"}</strong>
            <p className="notification-toast__text">{liveAlert.text}</p>
          </div>
          <button className="notification-toast__close" onClick={() => setLiveAlert(null)} type="button">×</button>
        </div>
      )}

      {showUnreadBanner && sessionUser && (
        <div className="unread-banner">
          <div className="unread-banner__icon">📬</div>
          <div className="unread-banner__content">
            <strong>¡Tienes mensajes pendientes!</strong>
            <p>
              {unreadInfo.messages > 0 && <span>💬 {unreadInfo.messages} mensaje{unreadInfo.messages > 1 ? "s" : ""}</span>}
              {unreadInfo.messages > 0 && unreadInfo.notifications > 0 && <span> · </span>}
              {unreadInfo.notifications > 0 && <span>🔔 {unreadInfo.notifications} notificación{unreadInfo.notifications > 1 ? "es" : ""}</span>}
            </p>
          </div>
          <button className="unread-banner__action" onClick={() => { setShowUnreadBanner(false); setDashboardTab("chat"); }} type="button">
            Ver chats
          </button>
          <button className="unread-banner__action unread-banner__action--secondary" onClick={() => { markAllConversationsAsSeen(); setShowUnreadBanner(false); }} type="button">
            Marcar como leído
          </button>
          <button className="unread-banner__close" onClick={() => setShowUnreadBanner(false)} type="button">×</button>
        </div>
      )}

      {route === "home" && (
        <main className="landing-elite">
          {/* Hero Split - Diseño Profesional */}
          <section className="hero-elite" style={{ backgroundImage: `url(${heroFallbackImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <div className="hero-elite__backdrop"></div>
            <div className="hero-elite__left">
              <div className="hero-elite__content">
                <span className="elite-label">
                  <span className="elite-label__icon">💈</span>
                  Sistema Profesional
                </span>
                
                <h1 className="hero-elite__title">
                  Gestiona tu barbería<br/>
                  <span className="text-gold">de forma inteligente</span>
                </h1>
                
                <p className="hero-elite__text">
                  La plataforma todo-en-uno para barberías modernas. 
                  Reservas, clientes, inventario y finanzas en un solo lugar.
                </p>

                <div className="hero-elite__cta">
                  <button 
                    className="btn-elite btn-elite--primary" 
                    onClick={() => setRoute(sessionUser ? "dashboard" : "register")}
                    type="button"
                  >
                    Empezar gratis
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </button>
                  <button 
                    className="btn-elite btn-elite--ghost" 
                    onClick={() => setRoute("services")}
                    type="button"
                  >
                    Ver demo
                  </button>
                </div>
              </div>
            </div>
            
            <div className="hero-elite__right">
              <div className="hero-elite__visual">
                <img src={barbadosLogo} alt="Barbados Logo" className="hero-elite__logo" />
              </div>
            </div>
          </section>

          {/* Servicios Horizontales */}
          <section className="section-elite">
            <div className="section-elite__head">
              <div className="section-elite__label">Servicios</div>
              <h2 className="section-elite__title">Nuestros servicios</h2>
            </div>

            <div className="services-elite">
              {publicData.services.map((service, idx) => (
                <article className="service-elite" key={service.id}>
                  <div className="service-elite__number">{String(idx + 1).padStart(2, '0')}</div>
                  <div className="service-elite__icon">
                    {idx === 0 ? '✂️' : idx === 1 ? '🧔' : '💈'}
                  </div>
                  <div className="service-elite__body">
                    <h3>{service.name}</h3>
                    <p>{service.description}</p>
                  </div>
                  <div className="service-elite__meta">
                    <span className="service-elite__price">{money.format(service.price)}</span>
                    <span className="service-elite__time">{service.duration} min</span>
                  </div>
                  <button 
                    className="service-elite__btn"
                    onClick={() => {
                      if (!sessionUser) setRoute("register");
                      else {
                        setBookingForm(f => ({ ...f, serviceId: service.id }));
                          setBookingForm((f: BookingForm) => ({ ...f, serviceId: service.id }));
                          setBookingForm((f: BookingForm) => ({ ...f, serviceId: service.id }));
                        setDashboardTab("appointments");
                        setRoute("dashboard");
                      }
                    }}
                    type="button"
                  >
                    Reservar
                  </button>
                </article>
              ))}
            </div>
          </section>

          {/* Full Width Card - Plataforma Principal */}
          <section className="section-elite section-elite--dark">
            <div className="impact-card card-full">
              <div className="card-full__content">
                <div className="card-full__tag">
                  <span>🚀</span> Plataforma Completa
                </div>
                <h2 className="card-full__title">
                  Gestiona todo desde <span>un solo lugar</span>
                </h2>
                <p className="card-full__desc">
                  Sistema integral que conecta reservas, clientes, inventario y finanzas. 
                  Todo lo que tu barbería necesita para crecer.
                </p>
                <div className="card-full__features">
                  <div className="card-full__feature">
                    <span className="card-full__feature-icon">📅</span>
                    Reservas 24/7
                  </div>
                  <div className="card-full__feature">
                    <span className="card-full__feature-icon">💬</span>
                    Chat integrado
                  </div>
                  <div className="card-full__feature">
                    <span className="card-full__feature-icon">📊</span>
                    Analíticas
                  </div>
                  <div className="card-full__feature">
                    <span className="card-full__feature-icon">💰</span>
                    Control financiero
                  </div>
                </div>
              </div>
              <div className="card-full__visual">
                <img src={barbershop2} alt="Herramientas de barbería" loading="lazy" />
              </div>
            </div>
          </section>

          {/* Accordion - Funcionalidades Desplegables */}
          <section className="section-elite">
            <div className="section-elite__head section-elite__head--center">
              <div className="section-elite__label section-elite__label--gold">Funcionalidades</div>
              <h2 className="section-elite__title">Todo lo que necesitas</h2>
              <p className="section-elite__desc">Descubre todas las herramientas de nuestra plataforma</p>
            </div>

            <div className="accordion">
              <AccordionItem 
                icon="📅" 
                title="Sistema de Reservas Inteligente"
                defaultOpen={true}
              >
                <p>Tus clientes reservan citas online las 24 horas del día. Sistema automático de confirmaciones y recordatorios por notificación.</p>
                <div className="card-full__features" style={{marginTop: '1rem'}}>
                  <div className="card-full__feature">Calendario visual</div>
                  <div className="card-full__feature">Recordatorios automáticos</div>
                  <div className="card-full__feature">Disponibilidad en tiempo real</div>
                </div>
              </AccordionItem>
              
              <AccordionItem icon="💬" title="Chat en Vivo con Clientes">
                <p>Comunícate directamente con tus clientes. Envía mensajes de texto, fotos de estilos sugeridos, y audios explicativos.</p>
                <div className="card-full__features" style={{marginTop: '1rem'}}>
                  <div className="card-full__feature">Mensajes instantáneos</div>
                  <div className="card-full__feature">Envío de fotos</div>
                  <div className="card-full__feature">Notas de voz</div>
                </div>
              </AccordionItem>
              
              <AccordionItem icon="📊" title="Dashboard y Analíticas">
                <p>Visualiza el rendimiento de tu negocio con gráficos interactivos. Controla ingresos, citas completadas y métricas clave.</p>
                <div className="card-full__features" style={{marginTop: '1rem'}}>
                  <div className="card-full__feature">Gráficos mensuales</div>
                  <div className="card-full__feature">Reportes detallados</div>
                  <div className="card-full__feature">KPIs en tiempo real</div>
                </div>
              </AccordionItem>
              
              <AccordionItem icon="🛒" title="Tienda de Productos">
                <p>Vende productos de cuidado capilar y barba directamente a tus clientes. Gestiona inventario y pedidos fácilmente.</p>
                <div className="card-full__features" style={{marginTop: '1rem'}}>
                  <div className="card-full__feature">Catálogo online</div>
                  <div className="card-full__feature">Control de stock</div>
                  <div className="card-full__feature">Órdenes organizadas</div>
                </div>
              </AccordionItem>
              
              <AccordionItem icon="💰" title="Control de Ganancias">
                <p>Registra cada corte realizado y visualiza tus ingresos en tiempo real. Nunca pierdas el control de tus finanzas.</p>
                <div className="card-full__features" style={{marginTop: '1rem'}}>
                  <div className="card-full__feature">Registro por barbero</div>
                  <div className="card-full__feature">Ingresos diarios</div>
                  <div className="card-full__feature">Comisiones automáticas</div>
                </div>
              </AccordionItem>
            </div>
          </section>

          {/* Galería Masonry */}
          <section className="section-elite">
            <div className="section-elite__head section-elite__head--center">
              <div className="section-elite__label">Galería</div>
              <h2 className="section-elite__title">Nuestro trabajo</h2>
            </div>

            <div className="masonry-grid">
              <div className="masonry-item masonry-item--tall">
                <img src={barbershop1} alt="Barbados" loading="lazy" />
                <span className="masonry-tag">Barbados</span>
              </div>
              <div className="masonry-item">
                <img src={barbershop2} alt="Estilo" loading="lazy" />
                <span className="masonry-tag">Estilo</span>
              </div>
              <div className="masonry-item">
                <img src={showcaseStyle} alt="Corte" loading="lazy" />
                <span className="masonry-tag">Corte</span>
              </div>
              <div className="masonry-item masonry-item--wide">
                <img src={showcaseBeard} alt="Barba" loading="lazy" />
                <span className="masonry-tag">Barba</span>
              </div>
              <div className="masonry-item">
                <img src={showcaseHaircut} alt="Fade" loading="lazy" />
                <span className="masonry-tag">Fade</span>
              </div>
            </div>
          </section>

          {/* Stats Row - Métricas destacadas */}
          <section className="section-elite section-elite--dark">
            <div className="stat-row">
              <div className="stat-row__item">
                <div className="stat-row__value">500+</div>
                <div className="stat-row__label">Clientes satisfechos</div>
              </div>
              <div className="stat-row__item">
                <div className="stat-row__value">1200+</div>
                <div className="stat-row__label">Cortes realizados</div>
              </div>
              <div className="stat-row__item">
                <div className="stat-row__value">4.9</div>
                <div className="stat-row__label">Calificación promedio</div>
              </div>
              <div className="stat-row__item">
                <div className="stat-row__value">6+</div>
                <div className="stat-row__label">Años de experiencia</div>
              </div>
            </div>
          </section>

          {/* Full Width Card Reverse - Por qué elegirnos */}
          <section className="section-elite">
            <div className="impact-card card-full card-full--reverse">
              <div className="card-full__content">
                <div className="card-full__tag">
                  <span>✨</span> Por qué elegirnos
                </div>
                <h2 className="card-full__title">
                  Experiencia <span>profesional</span> garantizada
                </h2>
                <p className="card-full__desc">
                  Nuestro equipo de barberos certificados combina técnicas tradicionales con 
                  las últimas tendencias para darte el mejor estilo.
                </p>
                <div className="card-full__features">
                  <div className="card-full__feature">
                    <span className="card-full__feature-icon">✓</span>
                    Barberos certificados
                  </div>
                  <div className="card-full__feature">
                    <span className="card-full__feature-icon">✓</span>
                    Productos premium
                  </div>
                  <div className="card-full__feature">
                    <span className="card-full__feature-icon">✓</span>
                    Ambiente exclusivo
                  </div>
                </div>
              </div>
              <div className="card-full__visual">
                <img src={showcaseStyle} alt="Estilo profesional" loading="lazy" />
              </div>
            </div>
          </section>

          {/* Equipo */}
          <section className="section-elite section-elite--dark">
            <div className="section-elite__head section-elite__head--center">
              <div className="section-elite__label section-elite__label--gold">Equipo</div>
              <h2 className="section-elite__title">Nuestros barberos</h2>
            </div>

            <div className="team-elite">
              {publicData.barbers.map((barber) => (
                <article className="barber-elite" key={barber.id}>
                  <div className="barber-elite__img">
                    <img src={apiBase ? absoluteApiUrl(apiBase, barber.avatar) : barber.avatar} alt={barber.name} />
                    <div className="barber-elite__online">
                      <span></span> Online
                    </div>
                  </div>
                  <div className="barber-elite__info">
                    <h4>{barber.name}</h4>
                    <span>Barbero Profesional</span>
                  </div>
                  <button 
                    className="btn-elite btn-elite--sm"
                    onClick={() => setRoute(sessionUser ? "dashboard" : "login")}
                    type="button"
                  >
                    Agendar
                  </button>
                </article>
              ))}
            </div>
          </section>

          {/* Testimonios */}
          <section className="section-elite">
            <div className="section-elite__head section-elite__head--center">
              <div className="section-elite__label">Testimonios</div>
              <h2 className="section-elite__title">Opiniones de clientes</h2>
            </div>

            <div className="testimonials-elite">
              {testimonialsList.length > 0 ? (
                testimonialsList.slice(0, 3).map((t) => (
                  <article className="testimonial-elite" key={t.id}>
                    <div className="testimonial-elite__quote">"</div>
                    <p>{t.message}</p>
                    <div className="testimonial-elite__rating">{'★'.repeat(t.rating)}</div>
                    <div className="testimonial-elite__author">
                      {t.clientAvatar ? (
                        <img src={apiBase ? absoluteApiUrl(apiBase, t.clientAvatar) : t.clientAvatar} alt={t.clientName} />
                      ) : (
                        <div className="avatar-initial">{t.clientName.charAt(0)}</div>
                      )}
                      <span>{t.clientName}</span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="testimonials-elite__empty">
                  <span>💬</span>
                  <p>Sé el primero en compartir tu experiencia</p>
                </div>
              )}
            </div>

            {!showSuggestionForm ? (
              <div className="testimonial-elite__cta">
                <button 
                  className="btn-elite btn-elite--outline"
                  onClick={() => setShowSuggestionForm(true)}
                  type="button"
                >
                  Dejar mi opinión
                </button>
              </div>
            ) : (
              <form className="form-elite" onSubmit={handleSubmitSuggestion}>
                <h4>Comparte tu experiencia</h4>
                {!sessionUser && (
                  <div className="form-elite__row">
                    <input
                      type="text"
                      placeholder="Tu nombre"
                      value={suggestionForm.name}
                      onChange={(e) => setSuggestionForm({ ...suggestionForm, name: e.target.value })}
                      required
                    />
                    <input
                      type="email"
                      placeholder="Email (opcional)"
                      value={suggestionForm.email}
                      onChange={(e) => setSuggestionForm({ ...suggestionForm, email: e.target.value })}
                    />
                  </div>
                )}
                <div className="form-elite__rating">
                  {[1,2,3,4,5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={suggestionForm.rating >= s ? 'active' : ''}
                      onClick={() => setSuggestionForm({ ...suggestionForm, rating: s })}
                    >★</button>
                  ))}
                </div>
                <textarea
                  placeholder="Cuéntanos tu experiencia..."
                  value={suggestionForm.message}
                  onChange={(e) => setSuggestionForm({ ...suggestionForm, message: e.target.value })}
                  required
                />
                <div className="form-elite__actions">
                  <button type="submit" className="btn-elite btn-elite--primary" disabled={submittingSuggestion}>
                    {submittingSuggestion ? "Enviando..." : "Enviar"}
                  </button>
                  <button type="button" className="btn-elite btn-elite--ghost" onClick={() => setShowSuggestionForm(false)}>
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* Contacto Minimal */}
          <section className="contact-elite">
            <div className="contact-elite__grid">
              <div className="contact-elite__card">
                <span>📍</span>
                <strong>Ubicación</strong>
                <p>Calle Principal #123</p>
              </div>
              <div className="contact-elite__card">
                <span>🕐</span>
                <strong>Horario</strong>
                <p>Lun-Sáb 9am-8pm</p>
              </div>
              <div className="contact-elite__card">
                <span>📞</span>
                <strong>Teléfono</strong>
                <p>+503 2222-3333</p>
              </div>
              <div className="contact-elite__card">
                <span>✉️</span>
                <strong>Email</strong>
                <p>info@barbados.com</p>
              </div>
            </div>
          </section>

          {/* CTA Final */}
          <section className="cta-elite">
            <div className="cta-elite__inner">
              <h2>¿Listo para comenzar?</h2>
              <p>Únete a cientos de clientes satisfechos</p>
              <button 
                className="btn-elite btn-elite--primary btn-elite--lg"
                onClick={() => setRoute(sessionUser ? "dashboard" : "register")}
                type="button"
              >
                Empezar gratis
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </section>
        </main>
      )}

      {route === "services" && (
        <main className="content-shell">
          <section className="panel panel--full">
            <SectionHeader title="✂️ Cortes y Servicios" subtitle="Explora la variedad de servicios profesionales que ofrecemos en Barbados." />
            <div className="services-grid">
              {services.map((service) => (
                <article className="service-card" key={service.id}>
                  <div className="service-card__icon">✂️</div>
                  <h4 className="service-card__title">{service.name}</h4>
                  <p className="service-card__description">{service.description}</p>
                  <div className="service-card__meta">
                    <strong className="service-card__price">{money.format(service.price)}</strong>
                    <span className="service-card__duration">⏱ {service.duration} min</span>
                  </div>
                  <button 
                    className="service-card__book-btn" 
                    onClick={() => {
                      if (!sessionUser) {
                        setRoute("login");
                      } else {
                        setBookingForm(f => ({ ...f, serviceId: service.id }));
                        setDashboardTab("appointments");
                        setRoute("dashboard");
                      }
                    }} 
                    type="button"
                  >
                    {sessionUser ? "✂️ Agendar Cita" : "🔑 Iniciar Sesión"}
                  </button>
                </article>
              ))}
            </div>
          </section>
        </main>
      )}

      {route === "shop" && (
        <main className="content-shell">
          <section className="panel panel--full">
            <SectionHeader title="🛍️ Tienda de productos" subtitle="Geles, pómadas, champús y accesorios para el cuidado de tu cabello y barba. ¡Compra ahora!" />
            <div className="cards-grid">
              {publicData.products.map((product) => {
                const categoryImages: Record<string, string> = {
                  "Styling": "https://images.unsplash.com/photo-1552821206-e4a8b71c87d5?w=500&h=500&fit=crop",
                  "Shampoo": "https://images.unsplash.com/photo-1587854692152-cbe660dbde0e?w=500&h=500&fit=crop",
                  "Conditioner": "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=500&h=500&fit=crop",
                  "Beard": "https://images.unsplash.com/photo-1596740841155-71015c5a1dcd?w=500&h=500&fit=crop",
                  "Haircut": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=500&fit=crop",
                };
                const productImage = product.image || categoryImages[product.category] || "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=500&h=500&fit=crop";
                return (
                  <article className="shop-card shop-card--interactive" key={product.id}>
                    <div className="shop-image-wrapper">
                      <img className="shop-thumb" src={productImage} alt={product.name} loading="lazy" />
                      <div className="shop-overlay">
                        {sessionUser ? (
                          <button 
                            className="button button--primary button--large" 
                            onClick={() => addToCart(product.id)} 
                            type="button"
                          >
                            🛒 Comprar
                          </button>
                        ) : (
                          <button 
                            className="button button--primary button--large" 
                            onClick={() => setRoute("register")}
                            type="button"
                          >
                            Registrarse para comprar
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="shop-body">
                      <div className="entity-card__header">
                        <div>
                          <h4>{product.name}</h4>
                          <p className="shop-category">📦 {product.category}</p>
                        </div>
                        <Badge label={product.stock > 0 ? `${product.stock} stock` : "Agotado"} variant={product.stock > 0 ? "success" : "danger"} />
                      </div>
                      <p className="shop-description">{product.description}</p>
                      <div className="shop-meta">
                        <strong className="shop-price">{money.format(product.price)}</strong>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </main>
      )}

      {route === "apply" && (
        <main className="page-shell-auth">
          <form className="auth-card" onSubmit={(event) => void handleApply(event)}>
            <span className="eyebrow">Postulación</span>
            <h2>Únete a nuestro equipo de barberos</h2>
            <p>Queremos conocer tu experiencia y especialidades. Completa el formulario y nos pondremos en contacto contigo pronto.</p>
            <input className="input" placeholder="Nombre completo" value={applyForm.name} onChange={(event) => setApplyForm((current) => ({ ...current, name: event.target.value }))} />
            <input className="input" placeholder="Correo" value={applyForm.email} onChange={(event) => setApplyForm((current) => ({ ...current, email: event.target.value }))} />
            <input className="input" placeholder="Teléfono" value={applyForm.phone} onChange={(event) => setApplyForm((current) => ({ ...current, phone: event.target.value }))} />
            <input className="input" placeholder="Especialidad" value={applyForm.specialty} onChange={(event) => setApplyForm((current) => ({ ...current, specialty: event.target.value }))} />
            <input className="input" type="number" min={1} placeholder="Años de experiencia" value={applyForm.experience} onChange={(event) => setApplyForm((current) => ({ ...current, experience: Number(event.target.value) }))} />
            <textarea className="textarea" placeholder="Cuéntanos tu experiencia" value={applyForm.note} onChange={(event) => setApplyForm((current) => ({ ...current, note: event.target.value }))} />
            <button className="button button--primary" disabled={loading} type="submit">Enviar postulación</button>
          </form>
        </main>
      )}

      {(route === "login" || route === "register") && (
        <main className="page-shell-auth auth-layout-grid">
          <section className="auth-side-card">
            <span className="eyebrow">Tu cuenta personal</span>
            <h2>{route === "login" ? "Inicia sesión" : "Crea tu cuenta"}</h2>
            <p>
              Accede a tu perfil de Barbados. Gestiona tus reservas, historial de servicios, compras y comunícate directamente con tu barbero.
            </p>
            <div className="coverage-grid">
              {[
                "Crea tu perfil de cliente verificado.",
                "Accede desde cualquier dispositivo.",
                "Sincroniza tus datos automáticamente.",
              ].map((item) => (
                <div className="coverage-item" key={item}>
                  <span>✓</span>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </section>

          {route === "login" ? (
            <form className="auth-card" onSubmit={(event) => void handleLogin(event)}>
              <span className="eyebrow">Bienvenido</span>
              <h2>Inicia sesión en tu cuenta</h2>
              <input className="input" placeholder="Correo" value={loginForm.email} onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))} />
              <input className="input" type="password" placeholder="Contraseña" value={loginForm.password} onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))} />
              <button className="button button--primary" disabled={loading} type="submit">Entrar</button>
              <button className="button button--ghost" onClick={() => setRoute("register")} type="button">Ir a registro</button>
            </form>
          ) : (
            <form className="auth-card" onSubmit={(event) => void handleRegister(event)}>
              <span className="eyebrow">Únete a nosotros</span>
              <h2>Crea tu cuenta</h2>
              <input className="input" placeholder="Nombre completo" value={registerForm.name} onChange={(event) => setRegisterForm((current) => ({ ...current, name: event.target.value }))} />
              <input className="input" type="email" placeholder="Correo electrónico" value={registerForm.email} onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))} />
              <input className="input" type="tel" placeholder="Teléfono (opcional)" value={registerForm.phone} onChange={(event) => setRegisterForm((current) => ({ ...current, phone: event.target.value }))} />
              <input className="input" type="password" placeholder="Contraseña" value={registerForm.password} onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))} />
              <button className="button button--primary" disabled={loading} type="submit">Registrar cuenta</button>
              <button className="button button--ghost" onClick={() => setRoute("login")} type="button">Ya tengo cuenta</button>
            </form>
          )}
        </main>
      )}

      {route === "dashboard" && sessionUser && (
        <main className="dashboard-shell">
          <aside className="dashboard-sidebar">
            <div className="profile-card">
              <img className="avatar avatar--large" src={(accountProfile?.user.avatar || sessionUser.avatar) ? (apiBase ? absoluteApiUrl(apiBase, accountProfile?.user.avatar ?? sessionUser.avatar) : (accountProfile?.user.avatar ?? sessionUser.avatar)) : barbadosLogo} alt={sessionUser.name} />
              <strong>{accountProfile?.user.name ?? sessionUser.name}</strong>
              <span>{roleLabel(sessionUser.role)}</span>
              <small>{accountProfile?.user.phone ?? sessionUser.phone}</small>
              <div className="actions-inline actions-inline--wrap actions-inline--center">
                <label className="button button--ghost button--small file-button">
                  📷 Cambiar foto
                  <input hidden accept="image/jpeg,image/png,image/gif,image/webp,image/*" type="file" onChange={(event) => void uploadOwnAvatar(event)} />
                </label>
                <button className="button button--danger button--small" onClick={() => void removeOwnAvatar()} type="button">🗑️ Borrar</button>
              </div>
            </div>
            <div className="nav-list">
              {[
                ["overview", "Resumen"],
                ...(sessionUser.role === "admin" ? [["users", "Usuarios"], ["applications", "Postulaciones"], ["products", "Productos"], ["orders", "Órdenes"], ["testimonials", "Opiniones"], ["cuts", "Ganancias"]] : []),
                ...(sessionUser.role === "barber" ? [["cuts", "Mis Cortes"]] : []),
                ...(sessionUser.role !== "admin" ? [["appointments", "Citas"]] : []),
                ["chat", "Chat"],
                ["notifications", "Notificaciones"],
                ...(sessionUser.role === "client" ? [["account", "Mi cuenta"]] : []),
              ].map(([value, label]) => {
                // Usar actualUnreadMessages para el badge del chat (solo mensajes nuevos no vistos)
                const unreadMsgCount = value === "chat" ? actualUnreadMessages : 0;
                const unreadNotifCount = value === "notifications" ? myNotifications.filter((n) => !n.read).length : 0;
                const pendingTestimonials = value === "testimonials" ? adminTestimonials.filter((t) => !t.isApproved).length : 0;
                const badgeCount = unreadMsgCount || unreadNotifCount || pendingTestimonials;
                
                return (
                  <button key={value} className={`nav-button ${dashboardTab === value ? "nav-button--active" : ""}`} onClick={() => setDashboardTab(value as DashboardTab)} type="button">
                    {label}
                    {badgeCount > 0 && <span className="nav-badge">{badgeCount > 99 ? "99+" : badgeCount}</span>}
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="dashboard-content">
            <div className="panel panel--full">
              <SectionHeader
                title={`Panel de ${roleLabel(sessionUser.role)}`}
                subtitle="Frontend React consumiendo el backend PHP y la base de datos PostgreSQL."
                action={<button className="button button--ghost button--small" onClick={() => void refreshSession()} type="button">Sincronizar</button>}
              />
              <div className="mini-stats mini-stats--dynamic">
                <div className="mini-stat mini-stat--accent"><span>Mi rol</span><strong>{roleLabel(sessionUser.role)}</strong><small>Acceso segmentado por perfil</small></div>
                <div className="mini-stat mini-stat--success"><span>Mis citas</span><strong>{accountProfile?.stats.appointmentsTotal ?? myAppointments.length}</strong><small>Seguimiento del servicio</small></div>
                <div className="mini-stat mini-stat--info"><span>Chats</span><strong>{myConversations.length}</strong><small>Conversaciones activas</small></div>
                <div className="mini-stat mini-stat--warning"><span>Notificaciones</span><strong>{accountProfile?.stats.notificationsUnread ?? myNotifications.filter((notification) => !notification.read).length}</strong><small>Alertas recientes</small></div>
              </div>
            </div>

            {dashboardTab === "overview" && (
              <div className="dashboard-grid dashboard-grid--full">
                {sessionUser.role === "admin" && (
                  <>
                    <div className="panel panel--span-2">
                      <SectionHeader title="📊 Panel de Control" subtitle="Métricas clave del negocio en tiempo real" />
                      <div className="kpi-grid">
                        <div className="kpi-card kpi-card--success" style={{ "--kpi-index": 0 } as React.CSSProperties}>
                          <span className="kpi-icon">💰</span>
                          <span className="kpi-title">Ingresos del año</span>
                          <strong className="kpi-value">{money.format(kpiRevenue)}</strong>
                        </div>
                        <div className="kpi-card kpi-card--info" style={{ "--kpi-index": 1 } as React.CSSProperties}>
                          <span className="kpi-icon">👥</span>
                          <span className="kpi-title">Total Usuarios</span>
                          <strong className="kpi-value">{kpiUsers}</strong>
                        </div>
                        <div className="kpi-card kpi-card--warning" style={{ "--kpi-index": 2 } as React.CSSProperties}>
                          <span className="kpi-icon">📦</span>
                          <span className="kpi-title">Inventario</span>
                          <strong className="kpi-value">{money.format(kpiInventory)}</strong>
                        </div>
                        <div className="kpi-card kpi-card--danger" style={{ "--kpi-index": 3 } as React.CSSProperties}>
                          <span className="kpi-icon">⏰</span>
                          <span className="kpi-title">Citas Pendientes</span>
                          <strong className="kpi-value">{kpiPending}</strong>
                        </div>
                      </div>
                    </div>
                    <div className="panel">
                      <SectionHeader title="📈 Ganancias por mes" subtitle="Tendencia de ingresos mensuales" />
                      <div className="metric-bars metric-bars--condensed">
                        {monthlyRevenue.map((value, index) => {
                          const max = Math.max(...monthlyRevenue, 1);
                          const size = Math.max(16, Math.round((value / max) * 100));
                          return (
                            <div className="metric-column" key={`${index}-${value}`}>
                              <span className="metric-amount">{money.format(value)}</span>
                              <div className="metric-track"><div className="metric-fill" style={{ "--size": `${size}%` } as React.CSSProperties} /></div>
                              <span className="metric-label">{["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][index] ?? index + 1}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
                <div className={sessionUser.role === "admin" ? "panel panel--span-3" : "panel panel--full"}>
                  <SectionHeader title="✂️ Actividad reciente" subtitle={sessionUser.role === "admin" ? "Todas las citas del sistema" : sessionUser.role === "barber" ? "Tus próximas citas" : "Tus citas reservadas"} />
                  <div className="data-list">
                    {displayedAppointments.slice(0, sessionUser.role === "client" ? 5 : 10).map((appointment) => (
                      <div className="list-row" key={appointment.id}>
                        <div className="list-row-main">
                          <strong>{servicesById[appointment.serviceId]?.name ?? "Servicio"}</strong>
                          {sessionUser.role === "admin" && (
                            <span>
                              Cliente: {usersById[appointment.clientId]?.name ?? "-"} · Barbero: {usersById[appointment.barberId]?.name ?? "-"}
                            </span>
                          )}
                          {sessionUser.role === "barber" && <span>Cliente: {usersById[appointment.clientId]?.name ?? "-"}</span>}
                          {sessionUser.role === "client" && <span>Barbero: {usersById[appointment.barberId]?.name ?? "-"}</span>}
                          <small>{dateTime.format(new Date(appointment.date))}</small>
                        </div>
                        <Badge label={statusLabel(appointment.status)} variant={tone(appointment.status)} />
                      </div>
                    ))}
                  </div>
                </div>
                {sessionUser.role === "client" && (
                  <div className="panel">
                    <SectionHeader title="🛒 Mi carrito" subtitle="Productos para comprar." />
                    {cartDetailed.length === 0 ? (
                      <EmptyState title="Carrito vacío" text="Agrega productos desde la tienda." />
                    ) : (
                      <>
                        <div className="data-list">
                          {cartDetailed.map((entry) => (
                            <div className="cart-row" key={entry.product.id}>
                              <div className="list-row-main">
                                <strong>{entry.product.name}</strong>
                                <span>{entry.product.category}</span>
                                <small>{money.format(entry.product.price)}</small>
                              </div>
                              <div className="actions-inline">
                                <button className="button button--ghost button--small" onClick={() => updateCart(entry.product.id, -1)} type="button">-</button>
                                <Badge label={String(entry.item.quantity)} variant="info" />
                                <button className="button button--ghost button--small" onClick={() => updateCart(entry.product.id, 1)} type="button">+</button>
                                <strong>{money.format(entry.product.price * entry.item.quantity)}</strong>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="checkout-card">
                          <div className="checkout-line"><span>Total</span><strong>{money.format(cartTotal)}</strong></div>
                          <button className="button button--primary" onClick={() => void checkout()} type="button">Finalizar compra</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {dashboardTab === "users" && sessionUser.role === "admin" && (
              <div className="dashboard-grid dashboard-grid--full">
                <div className="panel panel--span-2">
                  <SectionHeader title="Crear usuarios" subtitle="Alta de clientes y barberos." />
                  <form className="form-grid" onSubmit={(event) => void createUser(event)}>
                    <input className="input" placeholder="Nombre" value={userForm.name} onChange={(event) => setUserForm((current) => ({ ...current, name: event.target.value }))} />
                                        <input className="input" placeholder="Nombre" value={userForm.name} onChange={(event) => setUserForm((current: UserForm) => ({ ...current, name: event.target.value }))} />
                                        <input className="input" placeholder="Correo" value={userForm.email} onChange={(event) => setUserForm((current: UserForm) => ({ ...current, email: event.target.value }))} />
                                        <input className="input" placeholder="Teléfono" value={userForm.phone} onChange={(event) => setUserForm((current: UserForm) => ({ ...current, phone: event.target.value }))} />
                                        <input className="input" type="password" placeholder="Contraseña" value={userForm.password} onChange={(event) => setUserForm((current: UserForm) => ({ ...current, password: event.target.value }))} />
                                        <select className="select" value={userForm.role} onChange={(event) => setUserForm((current: UserForm) => ({ ...current, role: event.target.value as UserForm["role"] }))}>
                                          <option value="client">Cliente</option>
                                          <option value="barber">Barbero</option>
                                        </select>
                                        <div className="field-actions"><button className="button button--primary" type="submit">Crear usuario</button></div>
                                      </form>
                </div>
                <div className="panel panel--span-3">
                  <SectionHeader title="Usuarios del sistema" subtitle="Activar, desactivar o eliminar usuarios." />
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr><th>Usuario</th><th>Rol</th><th>Email</th><th>Estado</th><th>Acciones</th></tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.id}>
                            <td>{user.name}</td>
                            <td>{roleLabel(user.role)}</td>
                            <td>{user.email}</td>
                            <td><Badge label={user.active ? "Activo" : "Inactivo"} variant={user.active ? "success" : "danger"} /></td>
                            <td>
                              {user.role !== "admin" && (
                                <div className="actions-inline actions-inline--wrap">
                                  <button className="button button--ghost button--small" onClick={() => void toggleUser(user)} type="button">{user.active ? "Desactivar" : "Activar"}</button>
                                  <button className="button button--danger button--small" onClick={() => void deleteUser(user.id)} type="button">Eliminar</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {dashboardTab === "applications" && sessionUser.role === "admin" && (
              <div className="panel panel--full">
                <SectionHeader title="Postulaciones" subtitle="Aprobación y rechazo de candidatos barberos." />
                <div className="cards-grid">
                  {applications.map((application) => (
                    <article className="entity-card" key={application.id}>
                      <div className="entity-card__header">
                        <div>
                          <h4>{application.name}</h4>
                          <p>{application.specialty}</p>
                        </div>
                        <Badge label={statusLabel(application.status)} variant={tone(application.status)} />
                      </div>
                      <div className="entity-card__body">
                        <span>{application.email}</span>
                        <span>{application.phone}</span>
                        <span>{application.experience} años de experiencia</span>
                        <p>{application.note}</p>
                      </div>
                      {application.status === "pending" && (
                        <div className="actions-inline actions-inline--wrap">
                          <button className="button button--success button--small" onClick={() => void reviewApplication(application.id, "approve")} type="button">Aprobar</button>
                          <button className="button button--danger button--small" onClick={() => void reviewApplication(application.id, "reject")} type="button">Rechazar</button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            )}

            {dashboardTab === "products" && sessionUser.role === "admin" && (
              <div className="dashboard-grid dashboard-grid--full">
                <div className="panel panel--span-2">
                  <SectionHeader title="Crear producto" subtitle="Agregar nueva mercancía al inventario." />
                  <form className="form-grid" onSubmit={(event) => void createProduct(event)}>
                    <input className="input" placeholder="Nombre" value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} />
                                        <input className="input" placeholder="Nombre" value={productForm.name} onChange={(event) => setProductForm((current: ProductForm) => ({ ...current, name: event.target.value }))} />
                    <input className="input" placeholder="Categoría" value={productForm.category} onChange={(event) => setProductForm((current) => ({ ...current, category: event.target.value }))} />
                                        <input className="input" placeholder="Categoría" value={productForm.category} onChange={(event) => setProductForm((current: ProductForm) => ({ ...current, category: event.target.value }))} />
                    <input className="input" type="number" placeholder="Precio" value={productForm.price} onChange={(event) => setProductForm((current) => ({ ...current, price: Number(event.target.value) }))} />
                                        <input className="input" type="number" placeholder="Precio" value={productForm.price} onChange={(event) => setProductForm((current: ProductForm) => ({ ...current, price: Number(event.target.value) }))} />
                    <input className="input" type="number" placeholder="Stock" value={productForm.stock} onChange={(event) => setProductForm((current) => ({ ...current, stock: Number(event.target.value) }))} />
                                        <input className="input" type="number" placeholder="Stock" value={productForm.stock} onChange={(event) => setProductForm((current: ProductForm) => ({ ...current, stock: Number(event.target.value) }))} />
                    <input className="input field--full" placeholder="URL de imagen" value={productForm.image} onChange={(event) => setProductForm((current) => ({ ...current, image: event.target.value }))} />
                                        <input className="input field--full" placeholder="URL de imagen" value={productForm.image} onChange={(event) => setProductForm((current: ProductForm) => ({ ...current, image: event.target.value }))} />
                    <textarea className="textarea field--full" placeholder="Descripción" value={productForm.description} onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))} />
                                        <textarea className="textarea field--full" placeholder="Descripción" value={productForm.description} onChange={(event) => setProductForm((current: ProductForm) => ({ ...current, description: event.target.value }))} />
                    <div className="field-actions"><button className="button button--primary" type="submit">Guardar producto</button></div>
                  </form>
                </div>
                <div className="panel panel--span-3">
                  <SectionHeader title="Inventario" subtitle="Activar, desactivar, reabastecer o eliminar productos." />
                  <div className="table-wrapper">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Imagen</th>
                          <th>Producto</th>
                          <th>Categoría</th>
                          <th>Precio</th>
                          <th>Stock</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((product) => (
                          <tr key={product.id}>
                            <td>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                <img src={product.image} alt={product.name} style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 8 }} />
                                <div style={{ display: "flex", gap: 2 }}>
                                  <label className="button button--ghost button--small" style={{ fontSize: "0.65rem", padding: "2px 4px", cursor: loading ? "not-allowed" : "pointer" }}>
                                    📁
                                    <input hidden accept="image/*" type="file" disabled={loading} onChange={(e) => void uploadProductImage(product.id, e)} />
                                  </label>
                                  <button className="button button--ghost button--small" style={{ fontSize: "0.65rem", padding: "2px 4px" }} disabled={loading} onClick={() => {
                                    const newUrl = prompt("Nueva URL de imagen:", product.image);
                                    if (newUrl && newUrl !== product.image) void patchProduct(product.id, { image: newUrl });
                                  }} type="button">🔗</button>
                                </div>
                              </div>
                            </td>
                            <td>
                              {editingProductId === product.id ? (
                                <input
                                  className="input"
                                  value={editProductForm.name}
                                  onChange={e => setEditProductForm(f => ({ ...f, name: e.target.value }))}
                                  style={{ width: 120 }}
                                  disabled={loading}
                                />
                              ) : (
                                <strong>{product.name}</strong>
                              )}
                            </td>
                            <td>
                              {editingProductId === product.id ? (
                                <input
                                  className="input"
                                  value={editProductForm.category}
                                  onChange={e => setEditProductForm(f => ({ ...f, category: e.target.value }))}
                                  style={{ width: 100 }}
                                  disabled={loading}
                                />
                              ) : (
                                product.category
                              )}
                            </td>
                            <td>
                              {editingProductId === product.id ? (
                                <input
                                  className="input"
                                  type="number"
                                  value={editProductForm.price}
                                  onChange={e => setEditProductForm(f => ({ ...f, price: Number(e.target.value) }))}
                                  style={{ width: 80 }}
                                  disabled={loading}
                                />
                              ) : (
                                money.format(product.price)
                              )}
                            </td>
                            <td>
                              {sessionUser && sessionUser.role === "admin" ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <button
                                    className="button button--ghost button--small"
                                    onClick={() => {
                                      if (product.stock > 0) {
                                        setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: p.stock - 1 } : p));
                                        patchProduct(product.id, { stock: product.stock - 1 })
                                          .catch(() => refreshProducts());
                                      }
                                    }}
                                    disabled={product.stock <= 0 || loading}
                                    type="button"
                                  >-1</button>
                                  <input
                                    type="number"
                                    min={0}
                                    value={editingProductId === product.id ? editProductForm.stock : (product.stock < 0 ? 0 : product.stock)}
                                    style={{ width: 60 }}
                                    disabled={loading}
                                    onChange={e => {
                                      let newStock = Number(e.target.value);
                                      if (isNaN(newStock) || newStock < 0) newStock = 0;
                                      if (editingProductId === product.id) {
                                        setEditProductForm(f => ({ ...f, stock: newStock }));
                                      } else {
                                        setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: newStock } : p));
                                        patchProduct(product.id, { stock: newStock })
                                          .catch(() => refreshProducts());
                                      }
                                    }}
                                  />
                                  <button className="button button--success button--small" onClick={() => {
                                    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: p.stock + 1 } : p));
                                    patchProduct(product.id, { stock: product.stock + 1 })
                                      .catch(() => refreshProducts());
                                  }} disabled={loading} type="button">+1</button>
                                  <button className="button button--success button--small" onClick={() => {
                                    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: p.stock + 5 } : p));
                                    patchProduct(product.id, { stock: product.stock + 5 })
                                      .catch(() => refreshProducts());
                                  }} disabled={loading} type="button">+5</button>
                                </div>
                              ) : (
                                product.stock < 0 ? 0 : product.stock
                              )}
                            </td>
                            <td>
                              {editingProductId === product.id ? (
                                <textarea
                                  className="textarea"
                                  value={editProductForm.description}
                                  onChange={e => setEditProductForm(f => ({ ...f, description: e.target.value }))}
                                  style={{ width: 140, minHeight: 30 }}
                                  disabled={loading}
                                />
                              ) : (
                                <span style={{ fontSize: 12, color: '#666' }}>{product.description?.slice(0, 40) || ''}{product.description?.length > 40 ? '…' : ''}</span>
                              )}
                            </td>
                            <td><Badge label={product.active ? "Activo" : "Oculto"} variant={product.active ? "success" : "danger"} /></td>
                            <td>
                              <div className="actions-inline actions-inline--wrap">
                                {sessionUser && sessionUser.role === "admin" && (
                                  <>
                                    {editingProductId === product.id ? (
                                      <>
                                        <button
                                          className="button button--primary button--small"
                                          onClick={async () => {
                                            setError("");
                                            setSuccess("");
                                            try {
                                              await patchProduct(product.id, {
                                                name: editProductForm.name,
                                                category: editProductForm.category,
                                                price: editProductForm.price,
                                                description: editProductForm.description,
                                                stock: editProductForm.stock
                                              });
                                              setEditingProductId(null);
                                              await refreshProducts();
                                              setSuccess("Guardado");
                                            } catch {
                                              setError("Error al guardar");
                                              await refreshProducts();
                                            }
                                          }}
                                          type="button"
                                          disabled={loading}
                                        >Guardar</button>
                                        <button
                                          className="button button--ghost button--small"
                                          onClick={() => setEditingProductId(null)}
                                          type="button"
                                          disabled={loading}
                                        >Cancelar</button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          className="button button--ghost button--small"
                                          onClick={() => {
                                            setEditProductForm({
                                              name: product.name,
                                              category: product.category,
                                              price: product.price,
                                              description: product.description || "",
                                              stock: product.stock
                                            });
                                            setEditingProductId(product.id);
                                          }}
                                          type="button"
                                          disabled={loading}
                                        >Editar</button>
                                        {product.active && (
                                          <button
                                            className="button button--ghost button--small"
                                            onClick={async () => {
                                              setError("");
                                              setSuccess("");
                                              setProducts(prev => prev.map(p => p.id === product.id ? { ...p, active: false } : p));
                                              try {
                                                await patchProduct(product.id, { active: false });
                                                await refreshProducts();
                                              } catch {
                                                await refreshProducts();
                                              }
                                            }}
                                            type="button"
                                            disabled={loading}
                                            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                                          >
                                            Desactivar
                                            {success && <span style={{ color: '#2ecc40', fontSize: 18 }}>✔️</span>}
                                            {error && <span style={{ color: '#ff4136', fontSize: 18 }}>⚠️</span>}
                                          </button>
                                        )}
                                        {!product.active && (
                                          <button
                                            className="button button--success button--small"
                                            onClick={async () => {
                                              setError("");
                                              setSuccess("");
                                              setProducts(prev => prev.map(p => p.id === product.id ? { ...p, active: true } : p));
                                              try {
                                                await patchProduct(product.id, { active: true });
                                                await refreshProducts();
                                              } catch {
                                                await refreshProducts();
                                              }
                                            }}
                                            type="button"
                                            disabled={loading}
                                            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                                          >
                                            Activar
                                            {success && <span style={{ color: '#2ecc40', fontSize: 18 }}>✔️</span>}
                                            {error && <span style={{ color: '#ff4136', fontSize: 18 }}>⚠️</span>}
                                          </button>
                                        )}
                                        <button className="button button--danger button--small" onClick={() => void removeProduct(product.id)} disabled={loading} type="button">🗑️</button>
                                      </>
                                    )}
                                  </>
                                )}
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

            {dashboardTab === "appointments" && (
              <div className="dashboard-grid dashboard-grid--full">
                {sessionUser.role === "client" && (
                  <div className="panel panel--span-2">
                    <SectionHeader title="Reservar cita" subtitle="Al agendar se habilita la conversación con el barbero." />
                    <form className="form-grid" onSubmit={(event) => void createAppointment(event)}>
                      <select className="select" value={bookingForm.barberId} onChange={(event) => setBookingForm((current: BookingForm) => ({ ...current, barberId: event.target.value }))}>
                        {activeBarbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}
                      </select>
                      <select className="select" value={bookingForm.serviceId} onChange={(event) => setBookingForm((current: BookingForm) => ({ ...current, serviceId: event.target.value }))}>
                        {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                      </select>
                      <input className="input" type="datetime-local" value={bookingForm.date} onChange={(event) => setBookingForm((current: BookingForm) => ({ ...current, date: event.target.value }))} />
                      <textarea className="textarea field--full" placeholder="Describe el servicio" value={bookingForm.notes} onChange={(event) => setBookingForm((current: BookingForm) => ({ ...current, notes: event.target.value }))} />
                      <div className="field-actions"><button className="button button--primary" type="submit">Agendar</button></div>
                    </form>
                  </div>
                )}
                <div className="panel panel--span-3">
                  <SectionHeader title="Gestión de citas" subtitle="Acepta, cancela, completa o abre conversación." />
                  <div className="cards-grid">
                    {displayedAppointments.map((appointment) => (
                      <article className="entity-card" key={appointment.id}>
                        <div className="entity-card__header">
                          <div>
                            <h4>{servicesById[appointment.serviceId]?.name ?? "Servicio"}</h4>
                            <p>Cliente: {usersById[appointment.clientId]?.name ?? "-"}</p>
                          </div>
                          <Badge label={statusLabel(appointment.status)} variant={tone(appointment.status)} />
                        </div>
                        <div className="entity-card__body">
                          <span>Barbero: {usersById[appointment.barberId]?.name ?? "-"}</span>
                          <span>{dateOnly.format(new Date(appointment.date))}</span>
                          <p>{appointment.notes}</p>
                        </div>
                        <div className="actions-inline actions-inline--wrap">
                          {sessionUser.role === "barber" && appointment.status === "pending" && <button className="button button--success button--small" onClick={() => void changeAppointmentStatus(appointment.id, "accept")} type="button">Aceptar</button>}
                          {sessionUser.role === "barber" && appointment.status === "accepted" && <button className="button button--success button--small" onClick={() => void changeAppointmentStatus(appointment.id, "complete")} type="button">Completar</button>}
                          {(sessionUser.role === "client" || sessionUser.role === "barber" || sessionUser.role === "admin") && appointment.status !== "cancelled" && appointment.status !== "completed" && <button className="button button--danger button--small" onClick={() => void changeAppointmentStatus(appointment.id, "cancel")} type="button">Cancelar</button>}
                          <button className="button button--primary button--small" onClick={() => void createConversation(appointment.id)} type="button">Abrir chat</button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {dashboardTab === "chat" && (
              <div className="panel panel--full">
                <SectionHeader title="Chat en tiempo real" subtitle={sessionUser.role === "admin" ? "Comunícate directamente con tus barberos." : "Solo existe cuando hay una cita asociada."} />
                <div className="chat-layout">
                  <aside className="chat-sidebar">
                    {sessionUser.role === "admin" && (
                      <div className="admin-chat-starter">
                        <label className="label">Iniciar chat con barbero:</label>
                        <select 
                          className="input" 
                          defaultValue="" 
                          onChange={(e) => {
                            if (e.target.value) {
                              void createDirectConversation(e.target.value);
                              e.target.value = "";
                            }
                          }}
                        >
                          <option value="">Seleccionar barbero...</option>
                          {activeBarbers.map((barber) => (
                            <option key={barber.id} value={barber.id}>{barber.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {myConversations.length === 0 ? (
                      <EmptyState title="Sin conversaciones" text={sessionUser.role === "admin" ? "Selecciona un barbero arriba para iniciar un chat." : "Primero debes tener una cita y abrir una conversación."} />
                    ) : (
                      myConversations.map((conversation) => {
                        const otherUserId = conversation.clientId === sessionUser.id ? conversation.barberId : conversation.clientId;
                        const otherUser = usersById[otherUserId];
                        const lastMessage = conversation.messages[conversation.messages.length - 1];
                        return (
                          <button className={`conversation-item ${selectedConversation?.id === conversation.id ? "conversation-item--active" : ""}`} key={conversation.id} onClick={() => setSelectedConversationId(conversation.id)} type="button">
                            <img className="conversation-item__avatar" src={otherUser?.avatar ? (apiBase ? absoluteApiUrl(apiBase, otherUser.avatar) : otherUser.avatar) : "https://ui-avatars.com/api/?name=User"} alt={otherUser?.name ?? "Usuario"} />
                            <div className="conversation-item__info">
                              <strong>{otherUser?.name ?? conversation.title}</strong>
                              <span>{conversation.title}</span>
                              <small>{lastMessage?.text ?? "Sin mensajes"}</small>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </aside>
                  <div className="chat-main">
                    {!selectedConversation ? (
                      <EmptyState title="Selecciona una conversación" text="Abre un chat vinculado a una cita existente." />
                    ) : (
                      <>
                        <div className="chat-toolbar">
                          <div className="chat-toolbar__users">
                            <img className="chat-toolbar__avatar" src={usersById[selectedConversation.clientId]?.avatar ? (apiBase ? absoluteApiUrl(apiBase, usersById[selectedConversation.clientId].avatar) : usersById[selectedConversation.clientId].avatar) : "https://ui-avatars.com/api/?name=C"} alt="Cliente" />
                            <img className="chat-toolbar__avatar" src={usersById[selectedConversation.barberId]?.avatar ? (apiBase ? absoluteApiUrl(apiBase, usersById[selectedConversation.barberId].avatar) : usersById[selectedConversation.barberId].avatar) : "https://ui-avatars.com/api/?name=B"} alt="Barbero" />
                            <div>
                              <h4>{selectedConversation.title}</h4>
                              <p>
                                Cliente: {usersById[selectedConversation.clientId]?.name ?? "-"} · Barbero: {usersById[selectedConversation.barberId]?.name ?? "-"}
                              </p>
                            </div>
                          </div>
                          <div className="actions-inline actions-inline--wrap">
                            <button className="button button--ghost button--small" onClick={() => void clearConversation()} type="button">Limpiar chat</button>
                            <button className="button button--danger button--small" onClick={() => void archiveConversation()} type="button">Archivar</button>
                          </div>
                        </div>
                        <div className="messages-area">
                          {selectedConversation.messages.map((message) => {
                            const own = message.senderId === sessionUser.id;
                            const senderUser = usersById[message.senderId];
                            return (
                              <div className={`message-row ${own ? "message-row--own" : ""}`} key={message.id}>
                                {!own && <img className="message-avatar" src={senderUser?.avatar ? (apiBase ? absoluteApiUrl(apiBase, senderUser.avatar) : senderUser.avatar) : "https://ui-avatars.com/api/?name=U"} alt={senderUser?.name ?? "Usuario"} />}
                                <div className={`message-bubble ${own ? "message-bubble--own" : ""}`}>
                                  <strong>{senderUser?.name ?? "Sistema"}</strong>
                                  <p>{message.text}</p>
                                  {message.kind === "image" && message.mediaUrl && <img className="message-image" src={apiBase ? absoluteApiUrl(apiBase, message.mediaUrl) : message.mediaUrl} alt={message.mediaName ?? "Imagen"} />}
                                  {message.kind === "voice" && message.mediaUrl && (
                                    <div className="voice-card">
                                      <audio 
                                        controls 
                                        preload="metadata"
                                        controlsList="nodownload"
                                        src={apiBase ? absoluteApiUrl(apiBase, message.mediaUrl) : message.mediaUrl}
                                        style={{ width: "100%", minWidth: "200px", height: "40px" }}
                                      />
                                      <span className="voice-duration">🎤 {message.duration ?? "0:00"}</span>
                                    </div>
                                  )}
                                  <small>{dateTime.format(new Date(message.createdAt))}</small>
                                </div>
                                {own && <img className="message-avatar" src={sessionUser.avatar ? (apiBase ? absoluteApiUrl(apiBase, sessionUser.avatar) : sessionUser.avatar) : "https://ui-avatars.com/api/?name=Me"} alt="Yo" />}
                              </div>
                            );
                          })}
                        </div>
                        <div className="composer-card">
                          <div className="composer-input-row">
                            <textarea className="textarea" placeholder="Escribe tu mensaje" value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} />
                          </div>
                          {attachment && (
                            <div className="attachment-chip">
                              {attachment.kind === "image" && <img src={attachment.previewUrl} alt={attachment.name} />}
                              {attachment.kind === "voice" && <audio controls src={attachment.previewUrl} />}
                              <span>{attachment.kind === "image" ? attachment.name : `🎤 ${attachment.duration}`}</span>
                              <button className="button button--ghost button--small" onClick={() => setAttachment(null)} type="button">✕</button>
                            </div>
                          )}
                          <div className="composer-actions">
                            <label className="button button--ghost button--small file-button">🖼️ Imagen<input hidden accept="image/jpeg,image/png,image/gif,image/webp,image/*" type="file" onChange={(event) => void onAttachImage(event)} /></label>
                            {!recording ? (
                              <button className="button button--ghost button--small" onClick={() => void startRecording()} type="button">
                                <span className="mic-icon">🎤</span> Voz
                              </button>
                            ) : (
                              <button className="button button--danger button--small recording-btn" onClick={stopRecording} type="button">
                                <span className="mic-icon mic-icon--recording">🎤</span> 
                                {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, "0")}
                              </button>
                            )}
                            <button className="button button--primary" onClick={() => void sendMessage()} type="button">Enviar</button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {dashboardTab === "orders" && sessionUser.role === "admin" && (
              <div className="panel panel--full">
                <SectionHeader title="Órdenes de compra" subtitle="Control comercial completo de ventas, cliente, productos comprados y último servicio asociado." />
                <div className="cards-grid">
                  {orders.map((order) => (
                    <article className="entity-card entity-card--interactive" key={order.id}>
                      <div className="entity-card__header">
                        <div>
                          <h4>Orden {order.id}</h4>
                          <p>{dateTime.format(new Date(order.createdAt))}</p>
                        </div>
                        <Badge label={money.format(order.total)} variant="success" />
                      </div>
                      <div className="entity-card__body">
                        <strong>{order.clientName ?? usersById[order.clientId]?.name ?? "Cliente"}</strong>
                        <span>{order.clientEmail ?? usersById[order.clientId]?.email ?? ""}</span>
                        <span>{order.clientPhone ?? usersById[order.clientId]?.phone ?? ""}</span>
                        <span>Último corte/servicio: {order.latestServiceName ?? "Sin referencia"}</span>
                        {order.latestAppointmentDate && <span>Última cita: {dateTime.format(new Date(order.latestAppointmentDate))}</span>}
                        {order.latestAppointmentNotes && <p>{order.latestAppointmentNotes}</p>}
                      </div>
                      <div className="order-items-list">
                        {order.items.map((item) => (
                          <div className="order-item-row" key={`${order.id}-${item.productId}`}>
                            <div>
                              <strong>{item.productName ?? products.find((product) => product.id === item.productId)?.name ?? "Producto"}</strong>
                              <span>Cantidad: {item.quantity}</span>
                            </div>
                            <div className="order-item-values">
                              <small>{money.format(item.unitPrice ?? 0)} c/u</small>
                              <strong>{money.format(item.subtotal ?? 0)}</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {dashboardTab === "notifications" && (
              <div className="dashboard-grid dashboard-grid--full">
                <div className="panel panel--span-2">
                  <SectionHeader title="Notificaciones" subtitle="Alertas de citas, mensajes y sistema." action={<button className="button button--ghost button--small" onClick={() => void markNotificationsRead()} type="button">Marcar leídas</button>} />
                  <div className="data-list">
                    {myNotifications.map((notification) => (
                      <div className="list-row" key={notification.id}>
                        <div className="list-row-main">
                          <strong>{notification.title}</strong>
                          <span>{notification.body}</span>
                          <small>{dateTime.format(new Date(notification.createdAt))}</small>
                        </div>
                        <Badge label={notification.read ? "Leída" : "Nueva"} variant={notification.read ? "info" : "warning"} />
                      </div>
                    ))}
                  </div>
                </div>
                {sessionUser.role === "client" && (
                  <div className="panel">
                    <SectionHeader title="Carrito" subtitle="Tus compras en curso." />
                    {cartDetailed.length === 0 ? (
                      <EmptyState title="Carrito vacío" text="Agrega productos desde la tienda." />
                    ) : (
                      <>
                        <div className="data-list">
                          {cartDetailed.map((entry) => (
                            <div className="cart-row" key={entry.product.id}>
                              <div className="list-row-main">
                                <strong>{entry.product.name}</strong>
                                <span>{entry.product.category}</span>
                                <small>{money.format(entry.product.price)}</small>
                              </div>
                              <div className="actions-inline">
                                <button className="button button--ghost button--small" onClick={() => updateCart(entry.product.id, -1)} type="button">-</button>
                                <Badge label={String(entry.item.quantity)} variant="info" />
                                <button className="button button--ghost button--small" onClick={() => updateCart(entry.product.id, 1)} type="button">+</button>
                                <strong>{money.format(entry.product.price * entry.item.quantity)}</strong>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="checkout-card">
                          <div className="checkout-line"><span>Total</span><strong>{money.format(cartTotal)}</strong></div>
                          <button className="button button--primary" onClick={() => void checkout()} type="button">Finalizar compra</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {dashboardTab === "account" && sessionUser.role === "client" && (
              <div className="dashboard-grid dashboard-grid--full">
                <div className="panel panel--span-2">
                  <SectionHeader title="Mi cuenta" subtitle="Perfil real del cliente con datos comerciales y control de imagen." />
                  {!editingProfile ? (
                    <>
                      <div className="cards-grid">
                        <div className="entity-card">
                          <strong>Nombre</strong>
                          <span>{accountProfile?.user.name ?? sessionUser.name}</span>
                        </div>
                        <div className="entity-card">
                          <strong>Correo</strong>
                          <span>{accountProfile?.user.email ?? sessionUser.email}</span>
                        </div>
                        <div className="entity-card">
                          <strong>Teléfono</strong>
                          <span>{(accountProfile?.user.phone ?? sessionUser.phone) || "No registrado"}</span>
                        </div>
                        <div className="entity-card">
                          <strong>Citas completadas</strong>
                          <span>{accountProfile?.stats.appointmentsCompleted ?? 0}</span>
                        </div>
                      </div>
                      <div style={{ marginTop: "1rem" }}>
                        <button className="button button--primary" onClick={() => { setProfileForm({ name: sessionUser.name, phone: sessionUser.phone ?? "" }); setEditingProfile(true); }} type="button">Editar perfil</button>
                      </div>
                    </>
                  ) : (
                    <form className="form-stack" onSubmit={(event) => { event.preventDefault(); void updateOwnProfile(); }}>
                      <label className="form-field">
                        <span>Nombre</span>
                        <input className="input" placeholder="Tu nombre completo" value={profileForm.name} onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))} />
                      </label>
                      <label className="form-field">
                        <span>Teléfono</span>
                        <input className="input" type="tel" placeholder="Ej: +503 7000-0000" value={profileForm.phone} onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))} />
                      </label>
                      <div className="form-actions">
                        <button className="button button--primary" disabled={loading} type="submit">Guardar cambios</button>
                        <button className="button button--ghost" onClick={() => setEditingProfile(false)} type="button">Cancelar</button>
                      </div>
                    </form>
                  )}
                  <div className="danger-zone">
                    <p>Si eliminas tu cuenta, se cancelarán tus citas y el administrador será notificado.</p>
                    <button className="button button--danger" onClick={() => void deleteOwnAccount()} type="button">Eliminar cuenta</button>
                  </div>
                </div>
                <div className="panel">
                  <SectionHeader title="Actividad reciente" subtitle="Últimas citas y notificaciones del perfil." />
                  <div className="data-list">
                    {(accountProfile?.recentAppointments ?? []).slice(0, 4).map((appointment) => (
                      <div className="list-row" key={appointment.id}>
                        <div className="list-row-main">
                          <strong>{servicesById[appointment.serviceId]?.name ?? "Servicio"}</strong>
                          <span>{dateTime.format(new Date(appointment.date))}</span>
                        </div>
                        <Badge label={statusLabel(appointment.status)} variant={tone(appointment.status)} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {dashboardTab === "testimonials" && sessionUser.role === "admin" && (
              <div className="dashboard-grid dashboard-grid--full">
                <div className="panel panel--full">
                  <SectionHeader 
                    title="💬 Opiniones de clientes" 
                    subtitle="Revisa y aprueba las sugerencias de los clientes para que aparezcan en la página principal."
                    action={
                      <div className="actions-inline">
                        <Badge label={`${adminTestimonials.filter((t) => !t.isApproved).length} pendientes`} variant="warning" />
                        <Badge label={`${adminTestimonials.filter((t) => t.isApproved).length} aprobados`} variant="success" />
                      </div>
                    }
                  />
                  
                  {adminTestimonials.length === 0 ? (
                    <EmptyState title="Sin opiniones" text="Aún no hay sugerencias de clientes." />
                  ) : (
                    <div className="testimonials-admin-grid">
                      {adminTestimonials.map((testimonial) => (
                        <div 
                          className={`testimonial-admin-card ${testimonial.isApproved ? 'testimonial-admin-card--approved' : 'testimonial-admin-card--pending'}`} 
                          key={testimonial.id}
                        >
                          <div className="testimonial-admin-header">
                            <div className="testimonial-admin-info">
                              <strong>{testimonial.clientName}</strong>
                              {testimonial.clientEmail && <small>{testimonial.clientEmail}</small>}
                              <small className="testimonial-admin-date">{dateTime.format(new Date(testimonial.createdAt))}</small>
                            </div>
                            <div className="testimonial-admin-status">
                              <Badge 
                                label={testimonial.isApproved ? "Publicado" : "Pendiente"} 
                                variant={testimonial.isApproved ? "success" : "warning"} 
                              />
                              {testimonial.isFeatured && <Badge label="⭐ Destacado" variant="info" />}
                            </div>
                          </div>
                          
                          <div className="testimonial-admin-rating">
                            {'⭐'.repeat(testimonial.rating)}{'☆'.repeat(5 - testimonial.rating)}
                          </div>
                          
                          <p className="testimonial-admin-message">"{testimonial.message}"</p>
                          
                          <div className="testimonial-admin-actions">
                            {!testimonial.isApproved ? (
                              <button 
                                className="button button--success button--small" 
                                onClick={() => void handleApproveTestimonial(testimonial.id, true)}
                                disabled={loading}
                                type="button"
                              >
                                ✅ Aprobar y publicar
                              </button>
                            ) : (
                              <button 
                                className="button button--ghost button--small" 
                                onClick={() => void handleApproveTestimonial(testimonial.id, false)}
                                disabled={loading}
                                type="button"
                              >
                                🚫 Ocultar
                              </button>
                            )}
                            
                            <button 
                              className={`button button--small ${testimonial.isFeatured ? 'button--warning' : 'button--ghost'}`}
                              onClick={() => void handleToggleFeatured(testimonial.id, !testimonial.isFeatured)}
                              disabled={!testimonial.isApproved}
                              type="button"
                              title={testimonial.isApproved ? (testimonial.isFeatured ? "Quitar destacado" : "Destacar") : "Debes aprobar primero"}
                            >
                              {testimonial.isFeatured ? '⭐ Destacado' : '☆ Destacar'}
                            </button>
                            
                            <button 
                              className="button button--danger button--small" 
                              onClick={() => void handleDeleteTestimonial(testimonial.id)}
                              disabled={loading}
                              type="button"
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Panel de Cortes - Para Barberos */}
            {dashboardTab === "cuts" && sessionUser.role === "barber" && (
              <div className="dashboard-grid dashboard-grid--full">
                <div className="panel panel--span-2">
                  <SectionHeader 
                    title="✂️ Registrar Corte" 
                    subtitle="Agrega los servicios que realizaste hoy"
                  />
                  <form className="form-grid" onSubmit={(event) => void handleRegisterCut(event)}>
                    <input 
                      className="input" 
                      placeholder="Nombre del cliente" 
                      value={cutForm.clientName} 
                      onChange={(e) => setCutForm({ ...cutForm, clientName: e.target.value })} 
                      required
                    />
                    <select 
                      className="select" 
                      value={cutForm.serviceId} 
                      onChange={(e) => {
                        const service = services.find((s) => s.id === e.target.value);
                        setCutForm({ 
                          ...cutForm, 
                          serviceId: e.target.value, 
                          serviceName: service?.name ?? cutForm.serviceName,
                          price: service?.price ?? cutForm.price
                        });
                      }}
                    >
                      <option value="">Seleccionar servicio...</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>{service.name} - {money.format(service.price)}</option>
                      ))}
                    </select>
                    <input 
                      className="input" 
                      placeholder="Tipo de corte/servicio" 
                      value={cutForm.serviceName} 
                      onChange={(e) => setCutForm({ ...cutForm, serviceName: e.target.value })} 
                      required
                    />
                    <input 
                      className="input" 
                      type="number" 
                      placeholder="Precio" 
                      value={cutForm.price || ""} 
                      onChange={(e) => setCutForm({ ...cutForm, price: Number(e.target.value) })} 
                      min="0"
                      step="0.01"
                      required
                    />
                    <input 
                      className="input field--full" 
                      placeholder="Notas (opcional)" 
                      value={cutForm.notes} 
                      onChange={(e) => setCutForm({ ...cutForm, notes: e.target.value })} 
                    />
                    <div className="field-actions">
                      <button className="button button--primary" type="submit" disabled={submittingCut}>
                        {submittingCut ? "Registrando..." : "💈 Registrar corte"}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="panel">
                  <SectionHeader 
                    title="📊 Resumen del día" 
                    subtitle={cutsDate}
                    action={
                      <input 
                        type="date" 
                        className="input" 
                        value={cutsDate} 
                        onChange={(e) => setCutsDate(e.target.value)}
                        style={{ maxWidth: "150px" }}
                      />
                    }
                  />
                  <div className="kpi-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    <div className="kpi-card kpi-card--success" style={{ "--kpi-index": 0 } as React.CSSProperties}>
                      <span className="kpi-icon">✂️</span>
                      <span className="kpi-title">Cortes hoy</span>
                      <strong className="kpi-value">{barberCuts.length}</strong>
                    </div>
                    <div className="kpi-card kpi-card--info" style={{ "--kpi-index": 1 } as React.CSSProperties}>
                      <span className="kpi-icon">💰</span>
                      <span className="kpi-title">Ganancia del día</span>
                      <strong className="kpi-value">{money.format(cutsTotal)}</strong>
                    </div>
                  </div>
                </div>

                <div className="panel panel--span-3">
                  <SectionHeader 
                    title="📋 Cortes registrados" 
                    subtitle="Lista de servicios del día seleccionado"
                  />
                  {barberCuts.length === 0 ? (
                    <EmptyState title="Sin cortes" text="No hay cortes registrados para esta fecha." />
                  ) : (
                    <div className="data-list">
                      {barberCuts.map((cut) => (
                        <div className="list-row" key={cut.id}>
                          <div className="list-row-main">
                            <strong>{cut.serviceName}</strong>
                            <span>Cliente: {cut.clientName}</span>
                            {cut.notes && <small>{cut.notes}</small>}
                          </div>
                          <div className="actions-inline">
                            <Badge label={money.format(cut.price)} variant="success" />
                            <button 
                              className="button button--danger button--small" 
                              onClick={() => void handleDeleteCut(cut.id)}
                              type="button"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Panel de Ganancias - Para Admin */}
            {dashboardTab === "cuts" && sessionUser.role === "admin" && (
              <div className="dashboard-grid dashboard-grid--full">
                <div className="panel panel--span-2">
                  <SectionHeader 
                    title="💰 Ganancias por Barbero" 
                    subtitle="Resumen de ingresos del día"
                    action={
                      <input 
                        type="date" 
                        className="input" 
                        value={cutsDate} 
                        onChange={(e) => setCutsDate(e.target.value)}
                        style={{ maxWidth: "180px" }}
                      />
                    }
                  />
                  {barberCutsSummary.length === 0 ? (
                    <EmptyState title="Sin registros" text="No hay cortes registrados para esta fecha." />
                  ) : (
                    <div className="data-list">
                      {barberCutsSummary.map((barber) => (
                        <div key={barber.barberId} className="barber-cuts-section">
                          <div 
                            className="list-row list-row--clickable" 
                            onClick={() => toggleBarberExpand(barber.barberId)}
                            style={{ cursor: "pointer" }}
                          >
                            <div className="list-row-main" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                              <span className="expand-icon" style={{ fontSize: "1rem", transition: "transform 0.2s" }}>
                                {expandedBarberIds.has(barber.barberId) ? "▼" : "▶"}
                              </span>
                              {barber.avatarUrl ? (
                                <img 
                                  src={barber.avatarUrl.startsWith("http") ? barber.avatarUrl : `${apiBase}${barber.avatarUrl}`} 
                                  alt={barber.barberName} 
                                  className="avatar avatar--small"
                                  style={{ width: "48px", height: "48px", borderRadius: "50%" }}
                                />
                              ) : (
                                <div className="avatar avatar--small" style={{ width: "48px", height: "48px", borderRadius: "50%", background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                                  {barber.barberName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <strong>{barber.barberName}</strong>
                                <span>{barber.totalCuts} cortes realizados</span>
                              </div>
                            </div>
                            <Badge label={money.format(barber.totalEarnings)} variant="success" />
                          </div>
                          
                          {/* Detalles de cortes expandibles */}
                          {expandedBarberIds.has(barber.barberId) && (
                            <div className="cuts-detail-list" style={{ 
                              marginLeft: "2rem", 
                              marginTop: "0.5rem",
                              marginBottom: "1rem",
                              padding: "0.75rem",
                              background: "rgba(var(--gold-rgb), 0.05)",
                              borderRadius: "8px",
                              borderLeft: "3px solid var(--gold)"
                            }}>
                              {!barber.cuts ? (
                                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Cargando detalles...</p>
                              ) : barber.cuts.length === 0 ? (
                                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Sin cortes registrados.</p>
                              ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                  {barber.cuts.map((cut) => (
                                    <div 
                                      key={cut.id} 
                                      className="cut-detail-item"
                                      style={{ 
                                        display: "flex", 
                                        justifyContent: "space-between", 
                                        alignItems: "center",
                                        padding: "0.5rem 0.75rem",
                                        background: "rgba(255,255,255,0.03)",
                                        borderRadius: "6px",
                                        fontSize: "0.9rem"
                                      }}
                                    >
                                      <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                                        <strong style={{ color: "var(--gold)" }}>{cut.serviceName}</strong>
                                        <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                                          Cliente: {cut.clientName}
                                        </span>
                                        {cut.notes && (
                                          <small style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                                            {cut.notes}
                                          </small>
                                        )}
                                      </div>
                                      <span style={{ 
                                        color: "var(--success)", 
                                        fontWeight: "bold",
                                        fontSize: "0.95rem"
                                      }}>
                                        {money.format(cut.price)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="panel">
                  <SectionHeader 
                    title="📊 Total del Día" 
                    subtitle={cutsDate}
                  />
                  <div className="kpi-grid" style={{ gridTemplateColumns: "1fr" }}>
                    <div className="kpi-card kpi-card--success" style={{ "--kpi-index": 0 } as React.CSSProperties}>
                      <span className="kpi-icon">💵</span>
                      <span className="kpi-title">Ingresos totales</span>
                      <strong className="kpi-value">{money.format(cutsTotal)}</strong>
                    </div>
                  </div>
                  <div className="kpi-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: "1rem" }}>
                    <div className="kpi-card kpi-card--info" style={{ "--kpi-index": 1 } as React.CSSProperties}>
                      <span className="kpi-icon">👥</span>
                      <span className="kpi-title">Barberos activos</span>
                      <strong className="kpi-value">{barberCutsSummary.length}</strong>
                    </div>
                    <div className="kpi-card kpi-card--warning" style={{ "--kpi-index": 2 } as React.CSSProperties}>
                      <span className="kpi-icon">✂️</span>
                      <span className="kpi-title">Total cortes</span>
                      <strong className="kpi-value">{barberCutsSummary.reduce((sum, b) => sum + b.totalCuts, 0)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </main>
      )}
    </div>
  );
}
