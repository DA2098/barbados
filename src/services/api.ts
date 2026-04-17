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

export interface AppNotification {
  id: string;
  type: 'new_message' | 'new_image' | 'system';
  title: string;
  body: string;
  payload?: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
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

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;

const API_URL =
  env?.VITE_API_URL?.trim() ||
  '/api.php';

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
    const res = await fetch(`${API_URL}?action=login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      throw new Error(await parseApiError(res, 'Credenciales incorrectas'));
    }
    return await res.json();
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

  async deleteProduct(id: string): Promise<void> {
    const res = await fetch(`${API_URL}?action=products&id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al eliminar producto'));
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

  // --- NOTIFICATIONS ---
  async getNotifications(userId: string): Promise<{ unreadCount: number; items: AppNotification[] }> {
    const res = await fetch(`${API_URL}?action=notifications&userId=${userId}`);
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al obtener notificaciones'));
    return await res.json();
  },

  async markNotificationsRead(userId: string, markAll: boolean = true, notificationId?: string): Promise<void> {
    const idParam = notificationId ? `&id=${notificationId}` : '';
    const res = await fetch(`${API_URL}?action=notifications&userId=${userId}${idParam}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll })
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al actualizar notificaciones'));
  },

  // --- APPOINTMENTS ---
  async createAppointment(payload: {
    userId: string;
    barberId: string;
    serviceId?: string;
    serviceName: string;
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

  async deleteAppointment(appointmentId: string, actorId: string): Promise<void> {
    const res = await fetch(`${API_URL}?action=appointments&id=${appointmentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actorId })
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al eliminar cita'));
  },

  async updateAppointmentStatus(payload: { appointmentId: string; actorId: string; status: 'pending' | 'confirmed' | 'completed' | 'cancelled' }): Promise<void> {
    const res = await fetch(`${API_URL}?action=appointments&id=${payload.appointmentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actorId: payload.actorId, status: payload.status })
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al actualizar estado de cita'));
  },

  async createAppointmentReview(payload: { appointmentId: string; userId: string; rating: number; comment: string }): Promise<void> {
    const res = await fetch(`${API_URL}?action=appointment-reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al crear calificación'));
  },

  async getAppointmentReviews(userId?: string, publishedOnly: boolean = false): Promise<AppointmentReview[]> {
    const params = new URLSearchParams({ action: 'appointment-reviews' });
    if (userId) params.set('userId', userId);
    if (publishedOnly) params.set('published', '1');

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
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al actualizar publicación de reseña'));
  },

  async deleteAppointmentReview(reviewId: string, actorId: string): Promise<void> {
    const res = await fetch(`${API_URL}?action=appointment-reviews&id=${reviewId}&actorId=${actorId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al eliminar reseña'));
  }
};
