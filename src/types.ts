export type Role = "admin" | "barber" | "client";
export type AppointmentStatus = "pending" | "accepted" | "completed" | "cancelled";
export type ApplicationStatus = "pending" | "approved" | "rejected";
export type MessageKind = "text" | "image" | "voice" | "system";
export type NotificationType = "appointment" | "message" | "application" | "order" | "inventory" | "account" | "info" | "cut";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  active: boolean;
  approved: boolean;
  avatar: string;
  createdAt?: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  image: string;
  active: boolean;
}

export interface BarberApplication {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  experience: number;
  note: string;
  status: ApplicationStatus;
  submittedAt: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  barberId: string;
  serviceId: string;
  date: string;
  notes: string;
  status: AppointmentStatus;
}

export interface Message {
  id: string;
  senderId: string;
  kind: MessageKind;
  text: string;
  mediaUrl?: string;
  mediaName?: string;
  duration?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  appointmentId: string;
  barberId: string;
  clientId: string;
  title: string;
  active: boolean;
  messages: Message[];
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
  productName?: string;
  productPrice?: number;
  productImage?: string;
}

export interface OrderItemDetail {
  productId: string;
  quantity: number;
  unitPrice?: number;
  subtotal?: number;
  productName?: string;
  productImage?: string;
}

export interface Order {
  id: string;
  clientId: string;
  total: number;
  status: string;
  createdAt: string;
  items: OrderItemDetail[];
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  latestServiceName?: string;
  latestAppointmentDate?: string;
  latestAppointmentNotes?: string;
}

export interface DashboardSummary {
  users: number;
  activeBarbers: number;
  pendingApplications: number;
  pendingAppointments: number;
  acceptedAppointments: number;
  completedAppointments: number;
  activeConversations: number;
  products: number;
  inventoryValue: number;
  revenueYear: number;
  firstSixMonths: number;
  monthlyRevenue: number[];
}

export interface PublicHomeData {
  services: Service[];
  barbers: User[];
  products: Product[];
}

export interface BootstrapData {
  user: User;
  users: User[];
  services: Service[];
  products: Product[];
  applications: BarberApplication[];
  appointments: Appointment[];
  conversations: Conversation[];
  notifications: NotificationItem[];
  orders: Order[];
  cart: CartItem[];
  summary: DashboardSummary | null;
}

export interface ProfileStats {
  appointmentsTotal: number;
  appointmentsPending: number;
  appointmentsAccepted: number;
  appointmentsCompleted: number;
  notificationsUnread: number;
}

export interface Testimonial {
  id: string;
  clientId?: string;
  clientName: string;
  clientEmail?: string;
  clientAvatar?: string;
  message: string;
  rating: number;
  isApproved: boolean;
  isFeatured: boolean;
  createdAt: string;
  approvedAt?: string;
}

export interface BarberCut {
  id: string;
  barberId: string;
  barberName?: string;
  serviceId?: string;
  clientName: string;
  serviceName: string;
  price: number;
  notes?: string;
  cutDate: string;
  createdAt: string;
}

export interface BarberCutsSummary {
  barberId: string;
  barberName: string;
  avatarUrl?: string;
  totalCuts: number;
  totalEarnings: number;
  cuts?: BarberCut[];
}

export interface AccountProfile {
  user: User;
  stats: ProfileStats;
  recentAppointments: Appointment[];
  recentNotifications: NotificationItem[];
}

export interface PendingAttachment {
  file: Blob;
  previewUrl: string;
  kind: "image" | "voice";
  name: string;
  duration?: string;
}
