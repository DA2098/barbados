export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'barber' | 'user';
  barber_approved?: boolean;
  phone?: string;
  avatar_url?: string | null;
}

export interface Product {
  duration_minutes: number;
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  image_url: string;
  category: 'service' | 'barber' | 'food' | 'drink';
  is_visible: boolean;
}

export interface BarberLog {
  id: string;
  barberId: string;
  barberName: string;
  type: string;
  name: string;
  price: number;
  date: string;
}

export interface Conversation {
  id: string;
  conversation_type: 'client_barber' | 'barber_admin';
  last_message_at: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  messageType: 'text' | 'image';
  body?: string | null;
  imageUrl?: string | null;
  createdAt: string;
}

export interface AdminChatSession {
  conversationId: string;
  conversationType: string;
  barber: { id: string; name: string; avatar: string | null };
  client: { id: string; name: string; avatar: string | null };
  lastMessageAt: string | null;
  createdAt: string;
  messageCount: number;
}

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  barberId: string;
  barberName: string;
  serviceId?: string | null;
  serviceName: string;
  serviceImageUrl?: string | null;
  serviceDescription?: string | null;
  appointmentDate: string;
  notes?: string | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface AppointmentReview {
  id: string;
  appointmentId: string;
  userId: string;
  userName: string;
  serviceName: string;
  rating: number;
  comment: string;
  isPublished: boolean;
  createdAt: string;
  publishedAt?: string | null;
}

export interface BarberApplication {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  phone: string;
  experienceYears: number;
  specialties: string;
  availability: string;
  motivation: string;
  portfolioUrl?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string | null;
}

export interface PaymentCheckoutResponse {
  provider: 'stripe' | 'paypal';
  paymentMethod: 'card' | 'paypal';
  kind: 'cart' | 'appointment';
  referenceId: string;
  checkoutUrl: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  userId: string;
  kind: 'cart' | 'appointment';
  paymentMethod: 'card' | 'paypal';
  paymentProvider: 'stripe' | 'paypal';
  paymentReference: string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  billingName: string;
  billingEmail: string;
  payload: Record<string, unknown>;
  createdAt: string;
  paidAt?: string;
}

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;

const normalizeApiBase = (value?: string) => {
  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  const fallback = isLocal
    ? 'http://localhost:3000/api'
    : 'https://barbados-api.onrender.com/api';
  const trimmed = value?.trim();
  if (!trimmed) return fallback;

  try {
    const parsed = new URL(trimmed, window.location.origin);

    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      if (!parsed.hostname) return fallback;

      const hasApiPath = parsed.pathname !== '/' && parsed.pathname !== '';
      const resolvedPath = hasApiPath ? parsed.pathname : '/api';
      return `${parsed.origin}${resolvedPath}${parsed.search}`.replace(/\/$/, '');
    }

    return fallback;
  } catch {
    return fallback;
  }
};

const API_URL = normalizeApiBase(env?.VITE_API_URL);
const SESSION_META_KEY = 'auth_session_meta';
const SESSION_CONFLICT_FLAG_KEY = 'barbados_session_conflict_flag';
const SESSION_CONFLICT_LATCH_KEY = 'barbados_session_conflict_latched';

const createClientSessionId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const ensureClientSessionId = () => {
  try {
    const rawMeta = localStorage.getItem(SESSION_META_KEY);
    if (rawMeta) {
      const parsed = JSON.parse(rawMeta) as { sessionId?: string; userId?: string };
      if (parsed?.sessionId) return String(parsed.sessionId);
    }
  } catch {
    // Ignore malformed meta and rotate to a fresh one.
  }

  const sessionId = createClientSessionId();
  localStorage.setItem(SESSION_META_KEY, JSON.stringify({ sessionId, userId: null, startedAt: new Date().toISOString() }));
  return sessionId;
};

const patchGlobalFetchForSessionHeaders = () => {
  if (typeof window === 'undefined') return;

  const globalRef = window as Window & { __barbadosFetchPatched?: boolean };
  if (globalRef.__barbadosFetchPatched) return;

  class SessionConflictError extends Error {
    public response: Response | null = null;
    constructor(message = 'session_conflict', response: Response | null = null) {
      super(message);
      this.name = 'SessionConflictError';
      this.response = response;
    }
  }

  (window as any).__SessionConflictError = SessionConflictError;

  const getRequestUrl = (input: RequestInfo | URL) => {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.toString();
    return input.url;
  };

  const readActionFromUrl = (rawUrl: string) => {
    try {
      const parsed = new URL(rawUrl, window.location.origin);
      return String(parsed.searchParams.get('action') || '').toLowerCase();
    } catch {
      return '';
    }
  };

  const isApiRequest = (rawUrl: string) => {
    try {
      const parsed = new URL(rawUrl, window.location.origin);
      const apiBase = new URL(API_URL, window.location.origin);
      return parsed.origin === apiBase.origin && parsed.pathname === apiBase.pathname;
    } catch {
      return rawUrl.includes('/api?action=');
    }
  };

  const isConflictLatched = () => {
    try {
      return localStorage.getItem(SESSION_CONFLICT_LATCH_KEY) === '1';
    } catch {
      return false;
    }
  };

  const setConflictLatched = (value: boolean) => {
    try {
      if (value) localStorage.setItem(SESSION_CONFLICT_LATCH_KEY, '1');
      else localStorage.removeItem(SESSION_CONFLICT_LATCH_KEY);
    } catch {
      // ignore storage errors
    }
  };

  // Clear conflict latch once the user takes an explicit decision in the UI.
  window.addEventListener('barbados:session-decision', () => setConflictLatched(false));

  // Reset broadcast guard when the user takes an explicit decision in the UI.
  window.addEventListener('barbados:session-decision', () => {
    try {
      // noop here - conflictBroadcasted is reset below in the closure where it exists
    } catch {}
  });

  const nativeFetch = window.fetch.bind(window);
  // In-memory guard to avoid broadcasting the same conflict repeatedly
  // when multiple requests return 409 at the same time (in-flight parallel requests).
  let conflictBroadcasted = false;
  // Reset the in-memory broadcast guard when the user decides in the UI.
  window.addEventListener('barbados:session-decision', () => {
    try {
      conflictBroadcasted = false;
      setConflictLatched(false);
    } catch {}
  });
  const showEmergencyBanner = (message: string) => {
    try {
      const id = '__barbados_emergency_banner';
      if (document.getElementById(id)) return;
      const container = document.createElement('div');
      container.id = id;
      container.style.position = 'fixed';
      container.style.inset = '0';
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.zIndex = '2147483647';
      container.style.background = 'linear-gradient(90deg, rgba(0,0,0,0.7), rgba(0,0,0,0.85))';

      const box = document.createElement('div');
      box.style.background = '#7f1d1d';
      box.style.color = 'white';
      box.style.padding = '24px';
      box.style.borderRadius = '12px';
      box.style.boxShadow = '0 10px 30px rgba(0,0,0,0.6)';
      box.style.maxWidth = '720px';
      box.style.textAlign = 'center';

      const h = document.createElement('div');
      h.style.fontSize = '18px';
      h.style.fontWeight = '700';
      h.style.marginBottom = '8px';
      h.textContent = 'Sesión duplicada detectada';

      const p = document.createElement('div');
      p.style.fontSize = '14px';
      p.style.opacity = '0.95';
      p.style.marginBottom = '12px';
      p.textContent = message;

      const btn = document.createElement('button');
      btn.textContent = 'Cerrar aviso';
      btn.style.padding = '10px 14px';
      btn.style.border = 'none';
      btn.style.borderRadius = '8px';
      btn.style.background = '#111827';
      btn.style.color = 'white';
      btn.style.fontWeight = '600';
      btn.style.cursor = 'pointer';

      btn.addEventListener('click', () => {
        try { container.remove(); } catch {};
      });

      // Auto-close after a reasonable time to avoid blocking the app indefinitely
      try {
        const AUTO_CLOSE_MS = 12000; // 12 seconds
        setTimeout(() => {
          try { container.remove(); } catch {}
        }, AUTO_CLOSE_MS);
      } catch {}

      box.appendChild(h);
      box.appendChild(p);
      box.appendChild(btn);
      container.appendChild(box);
      document.body.appendChild(container);
    } catch {
      // ignore DOM errors
    }
  };
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const requestUrl = getRequestUrl(input);
    const action = readActionFromUrl(requestUrl);
    const apiRequest = isApiRequest(requestUrl);

    // After first conflict, short-circuit polling/realtime loops to avoid repeated 409 noise.
    // Keep login/logout available so user can resolve the state.
    if (apiRequest && isConflictLatched() && action !== 'login' && action !== 'logout') {
      throw new SessionConflictError('Session conflict latched');
    }

    const mergedHeaders = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));

    try {
      const rawUser = localStorage.getItem('auth_user');
      if (rawUser && !mergedHeaders.has('x-user-id')) {
        const parsedUser = JSON.parse(rawUser) as { id?: string };
        if (parsedUser?.id) {
          mergedHeaders.set('x-user-id', String(parsedUser.id));
        }
      }

      const sessionId = ensureClientSessionId();
      if (!mergedHeaders.has('x-session-id')) {
        mergedHeaders.set('x-session-id', sessionId);
      }
    } catch {
      // Keep request running even if localStorage parsing fails.
    }

    const response = await nativeFetch(input, { ...init, headers: mergedHeaders });
    const conflictHeader = response.headers.get('x-session-conflict');
    const isSessionConflict = response.status === 409 && (conflictHeader === '1' || conflictHeader === null || conflictHeader === '');
    if (isSessionConflict) {
      try {
        // If we've already broadcasted this conflict recently, skip re-broadcasts.
        if (conflictBroadcasted) {
          // Still latch to ensure short-circuiting behavior for subsequent requests.
          setConflictLatched(true);
        } else {
          conflictBroadcasted = true;
          setConflictLatched(true);
          console.warn('🔴 Session conflict detected - dispatching event');
          const rawUser = localStorage.getItem('auth_user');
          const parsedUser = rawUser ? (JSON.parse(rawUser) as { id?: string }) : null;
          const rawMeta = localStorage.getItem(SESSION_META_KEY);
          const parsedMeta = rawMeta ? (JSON.parse(rawMeta) as { sessionId?: string }) : null;
          localStorage.setItem(
            SESSION_CONFLICT_FLAG_KEY,
            JSON.stringify({
              userId: parsedUser?.id ?? null,
              sessionId: parsedMeta?.sessionId ?? null,
              detectedAt: new Date().toISOString(),
            })
          );
          const signalConflict = (window as any).__barbadosOnSessionConflict;
          if (typeof signalConflict === 'function') {
            signalConflict();
          }
          window.dispatchEvent(new CustomEvent('barbados:session-conflict'));
          console.warn('✓ Session conflict event dispatched');
          try {
            // emergency visual for users who miss the modal
            showEmergencyBanner('Tu cuenta se ha iniciado en otro dispositivo. Revisa la sesión duplicada en la barra superior.');
          } catch {}
        }
      } catch (e) {
        console.error('Error dispatching session-conflict event:', e);
      }
      // Throw a specific error so higher-level code can handle it differently
      throw new SessionConflictError('Session conflict detected', response);
    }

    return response;
  };

  globalRef.__barbadosFetchPatched = true;
};

patchGlobalFetchForSessionHeaders();

export const isSessionConflictError = (err: unknown) => {
  try {
    if (!err || typeof err !== 'object') return false;
    // If SessionConflictError class was attached on window, prefer instanceof
    const win = window as any;
    if (typeof win.__SessionConflictError === 'function' && err instanceof win.__SessionConflictError) return true;
    const name = (err as any).name || '';
    return String(name).toLowerCase() === 'sessionconflicterror' || String((err as any).message || '').toLowerCase().includes('session_conflict');
  } catch {
    return false;
  }
};

export const clearSessionConflictFlag = () => {
  try {
    localStorage.removeItem(SESSION_CONFLICT_FLAG_KEY);
    localStorage.removeItem(SESSION_CONFLICT_LATCH_KEY);
  } catch {
    // ignore storage errors
  }
};

export const getSessionConflictFlag = () => {
  try {
    const raw = localStorage.getItem(SESSION_CONFLICT_FLAG_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { userId?: string | null; sessionId?: string | null; detectedAt?: string };
  } catch {
    return null;
  }
};

const normalizePrice = (value: unknown) => Number(value);

const parseApiError = async (res: Response, fallback: string) => {
  const contentType = res.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      const error = await res.json();
      return error.error || fallback;
    }

    const rawText = (await res.text()).trim();
    if (!rawText) return fallback;

    // Recorta HTML largo de PHP/Apache y deja solo texto útil.
    const compactText = rawText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return compactText.slice(0, 240) || fallback;
  } catch {
    return fallback;
  }
};

export const api = {
  // --- AUTH ---
  async login(email: string, password: string): Promise<User> {
    const sessionId = ensureClientSessionId();
    const res = await fetch(`${API_URL}?action=login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      throw new Error(await parseApiError(res, 'Credenciales incorrectas'));
    }
    return await res.json();
  },

  async logout(userId?: string): Promise<void> {
    if (!userId) return;
    const res = await fetch(`${API_URL}?action=logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!res.ok) {
      throw new Error(await parseApiError(res, 'Error al cerrar sesión'));
    }
  },

  async register(name: string, email: string, password: string, role: 'user' | 'barber' = 'user'): Promise<User> {
    const res = await fetch(`${API_URL}?action=register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role })
    });
    if (!res.ok) {
      throw new Error(await parseApiError(res, 'Error al registrarse'));
    }
    return await res.json();
  },

  async createAdmin(adminId: string, name: string, email: string, password: string, phone?: string): Promise<User> {
    const res = await fetch(`${API_URL}?action=create-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId, name, email, password, phone: phone ?? '' })
    });
    if (!res.ok) {
      throw new Error(await parseApiError(res, 'Error al crear administrador'));
    }
    return await res.json();
  },

  async createBarber(adminId: string, name: string, email: string, password: string, phone?: string): Promise<User> {
    const res = await fetch(`${API_URL}?action=create-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId, name, email, password, role: 'barber', phone: phone ?? '' })
    });
    if (!res.ok) {
      throw new Error(await parseApiError(res, 'Error al crear barbero'));
    }
    const data = await res.json();
    return data.user || data;
  },

  async createClient(adminId: string, name: string, email: string, password: string, phone?: string): Promise<User> {
    const res = await fetch(`${API_URL}?action=create-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId, name, email, password, role: 'user', phone: phone ?? '' })
    });
    if (!res.ok) {
      throw new Error(await parseApiError(res, 'Error al crear cliente'));
    }
    const data = await res.json();
    return data.user || data;
  },

  // --- USERS ---
  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_URL}?action=users`);
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al obtener usuarios'));
    return await res.json();
  },

  async deleteUser(id: string): Promise<void> {
    const res = await fetch(`${API_URL}?action=users&id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al eliminar usuario'));
  },

  async updateProfile(id: string, data: Partial<User>): Promise<User> {
    const res = await fetch(`${API_URL}?action=users&id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al actualizar perfil'));
    return await res.json();
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<User> {
    const res = await fetch(`${API_URL}?action=change-password&id=${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al cambiar contraseña'));
    return await res.json();
  },

  async updateUserRole(adminId: string, userId: string, role: 'admin' | 'barber' | 'user', barberApproved: boolean = true): Promise<User> {
    const res = await fetch(`${API_URL}?action=user-role&id=${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId, role, barber_approved: barberApproved })
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al actualizar rol'));
    return await res.json();
  },

  async submitBarberApplication(payload: {
    userId: string;
    phone: string;
    experienceYears: number;
    specialties: string;
    availability: string;
    motivation: string;
    portfolioUrl?: string;
  }): Promise<BarberApplication> {
    const res = await fetch(`${API_URL}?action=barber-applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al enviar postulación'));
    return await res.json();
  },

  async getMyBarberApplication(userId: string): Promise<BarberApplication | null> {
    const res = await fetch(`${API_URL}?action=barber-applications&userId=${userId}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al obtener postulación'));
    return await res.json();
  },

  async getBarberApplications(adminId: string): Promise<BarberApplication[]> {
    const res = await fetch(`${API_URL}?action=barber-applications&adminId=${adminId}`);
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al obtener postulaciones'));
    return await res.json();
  },

  async uploadAvatar(userId: string, file: File): Promise<string> {
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('file', file);

    const res = await fetch(`${API_URL}?action=upload-avatar`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) throw new Error(await parseApiError(res, 'Error al subir avatar'));
    const data = await res.json();
    return data.avatar_url as string;
  },

  async uploadServiceImage(userId: string, file: File): Promise<string> {
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('file', file);

    const res = await fetch(`${API_URL}?action=upload-service-image`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) throw new Error(await parseApiError(res, 'Error al subir imagen del servicio'));
    const data = await res.json();
    return data.image_url as string;
  },

  async createPaymentSession(payload: {
    userId: string;
    kind: 'cart' | 'appointment';
    method: 'card' | 'paypal';
    cartItems?: Array<{ productId: string; name: string; price: number; quantity: number; description?: string }>;
    appointment?: {
      barberId: string;
      barberName: string;
      serviceId?: string | null;
      serviceName: string;
      servicePrice: number;
      appointmentDate: string;
      notes?: string;
    };
  }): Promise<PaymentCheckoutResponse> {
    const res = await fetch(`${API_URL}?action=payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: 'create', ...payload })
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al iniciar el pago'));
    return await res.json();
  },

  async confirmPayment(payload: {
    provider: 'stripe' | 'paypal';
    referenceId: string;
    userId: string;
  }): Promise<Invoice> {
    const res = await fetch(`${API_URL}?action=payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: 'confirm', ...payload })
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al confirmar el pago'));
    return await res.json();
  },

  async getInvoices(userId: string): Promise<Invoice[]> {
    const res = await fetch(`${API_URL}?action=invoices&userId=${userId}`);
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al obtener facturas'));
    return await res.json();
  },

  getInvoiceDownloadUrl(invoiceId: string, userId: string): string {
    return `${API_URL}?action=invoices&id=${invoiceId}&userId=${userId}&download=1`;
  },

  // --- PRODUCTS ---
  async getProducts(options?: { category?: 'service' | 'barber' | 'food' | 'drink'; includeHidden?: boolean }): Promise<Product[]> {
    const params = new URLSearchParams({ action: 'products' });
    if (options?.category) params.set('category', options.category);
    if (options?.includeHidden) params.set('includeHidden', '1');

    const res = await fetch(`${API_URL}?${params.toString()}`);
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al obtener productos'));
    const products = await res.json();
    return products.map((product: Product & { price: unknown; is_visible?: unknown; category?: unknown }) => ({
      ...product,
      price: normalizePrice(product.price),
      category: (product.category as Product['category']) || 'food',
      is_visible: Boolean(product.is_visible)
    }));
  },

  async addProduct(product: Omit<Product, 'id'>): Promise<void> {
    const res = await fetch(`${API_URL}?action=products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al añadir producto'));
  },

  async updateProduct(id: string, product: Omit<Product, 'id'>): Promise<void> {
    const res = await fetch(`${API_URL}?action=products&id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al actualizar producto'));
  },

  async deleteProduct(id: string, category?: 'service' | 'barber' | 'food' | 'drink'): Promise<void> {
    const res = await fetch(`${API_URL}?action=products&id=${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: category || 'food' })
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al eliminar producto'));
  },

  async getServices(options?: { includeHidden?: boolean }): Promise<Product[]> {
    const params = new URLSearchParams({ action: 'services' });
    if (options?.includeHidden) params.set('includeHidden', '1');

    const res = await fetch(`${API_URL}?${params.toString()}`);
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al obtener servicios'));
    const services = await res.json();
    return services.map((service: Product & { price: unknown; is_visible?: unknown }) => ({
      ...service,
      price: normalizePrice(service.price),
      category: 'service' as const,
      is_visible: Boolean(service.is_visible)
    }));
  },

  // --- BARBER LOGS ---
  async addBarberLog(log: Omit<BarberLog, 'id' | 'date'>): Promise<void> {
    const res = await fetch(`${API_URL}?action=logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        barberId: log.barberId,
        type: log.type,
        name: log.name,
        price: log.price
      })
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al añadir registro de barbero'));
  },

  async getBarberLogs(): Promise<BarberLog[]> {
    const res = await fetch(`${API_URL}?action=logs`);
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al obtener registros'));
    const logs = await res.json();
    return logs.map((log: BarberLog & { price: unknown }) => ({
      ...log,
      price: normalizePrice(log.price)
    }));
  },

  async deleteBarberLog(logId: string): Promise<void> {
    const res = await fetch(`${API_URL}?action=logs&id=${logId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al eliminar registro'));
  },

  async deleteBarberLogsByRange(dateRange: 'today' | 'month' | 'year'): Promise<void> {
    const res = await fetch(`${API_URL}?action=logs&dateRange=${dateRange}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(await parseApiError(res, `Error al eliminar logs de ${dateRange}`));
  },

  // --- APPOINTMENTS ---
  async createAppointment(payload: {
    userId: string;
    barberId: string;
    serviceId?: string;
    serviceName?: string;
    appointmentDate: string;
    notes?: string;
  }): Promise<void> {
    const res = await fetch(`${API_URL}?action=appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al agendar cita'));
  },

  async getAppointments(userId: string): Promise<Appointment[]> {
    const res = await fetch(`${API_URL}?action=appointments&userId=${userId}`);
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al obtener citas'));
    return await res.json();
  },

  async updateAppointmentStatus(payload: {
    appointmentId: string;
    actorId: string;
    status: Appointment['status'];
  }): Promise<void> {
    const res = await fetch(`${API_URL}?action=appointments&id=${payload.appointmentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actorId: payload.actorId, status: payload.status })
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al actualizar estado de la cita'));
  },

  async deleteAppointment(appointmentId: string, actorId: string): Promise<void> {
    const res = await fetch(`${API_URL}?action=appointments&id=${appointmentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actorId })
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al eliminar cita'));
  },

  // --- APPOINTMENT REVIEWS ---
  async createAppointmentReview(payload: {
    appointmentId: string;
    userId: string;
    rating: number;
    comment: string;
  }): Promise<void> {
    const res = await fetch(`${API_URL}?action=appointment-reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al enviar calificación'));
  },

  async getAppointmentReviews(userId?: string, publishedOnly: boolean = false): Promise<AppointmentReview[]> {
    const params = new URLSearchParams({ action: 'appointment-reviews' });
    if (publishedOnly) {
      params.set('published', '1');
    } else if (userId) {
      params.set('userId', userId);
    }

    const res = await fetch(`${API_URL}?${params.toString()}`);
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al obtener calificaciones'));
    return await res.json();
  },

  async updateAppointmentReview(reviewId: string, actorId: string, isPublished: boolean): Promise<void> {
    const res = await fetch(`${API_URL}?action=appointment-reviews&id=${reviewId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actorId, isPublished })
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al actualizar reseña'));
  },

  async deleteAppointmentReview(reviewId: string, actorId: string): Promise<void> {
    const res = await fetch(`${API_URL}?action=appointment-reviews&id=${reviewId}&actorId=${actorId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al eliminar reseña'));
  },

  // --- CHAT ---
  async getChatContacts(userId: string): Promise<User[]> {
    const res = await fetch(`${API_URL}?action=chat-contacts&userId=${userId}`);
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al obtener contactos'));
    return await res.json();
  },

  async getOrCreateConversation(requesterId: string, peerId: string): Promise<Conversation> {
    const res = await fetch(`${API_URL}?action=conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requesterId, peerId })
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al abrir conversación'));
    return await res.json();
  },

  async deleteConversation(conversationId: string, actorId: string): Promise<void> {
    const res = await fetch(`${API_URL}?action=conversations&id=${conversationId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actorId })
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al eliminar conversación'));
  },

  async getMessages(conversationId: string, userId: string): Promise<Message[]> {
    const res = await fetch(`${API_URL}?action=messages&conversationId=${conversationId}&userId=${userId}`);
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al obtener mensajes'));
    return await res.json();
  },

  async deleteMessage(messageId: string, actorId: string): Promise<void> {
    const res = await fetch(`${API_URL}?action=messages&id=${messageId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actorId })
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al eliminar mensaje'));
  },

  async uploadChatImage(userId: string, file: File): Promise<{ mediaId: string; imageUrl: string }> {
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('file', file);

    const res = await fetch(`${API_URL}?action=upload-chat-media`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al subir imagen'));
    return await res.json();
  },

  async sendMessage(
    conversationId: string,
    senderId: string,
    payload: { messageType: 'text' | 'image'; body?: string; mediaId?: string }
  ): Promise<void> {
    const res = await fetch(`${API_URL}?action=messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, senderId, ...payload })
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al enviar mensaje'));
  },

  async getAdminChatMonitor(adminId: string): Promise<AdminChatSession[]> {
    const res = await fetch(`${API_URL}?action=admin-chat-monitor&adminId=${adminId}`);
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al obtener chats'));
    return await res.json();
  },

  async getConversationsByUser(userId: string): Promise<Conversation[]> {
    const res = await fetch(`${API_URL}?action=get_conversations&user_id=${userId}`);
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al obtener conversaciones'));
    return await res.json();
  },

  async toggleClientMessaging(conversationId: string, allowMessaging: boolean): Promise<void> {
    const res = await fetch(`${API_URL}?action=toggle_client_messaging`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: conversationId, allow_messaging: allowMessaging })
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al actualizar permisos de mensajería'));
  },
};
