import { useState, useEffect } from 'react';
import { api, Message, AppNotification, User } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Store from './Store';


export default function ClientPanel() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [newMessage, setNewMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const { addToCart } = useCart();

  const loadConversation = async () => {
    if (!user?.id) return;

    try {
      const allUsers = await api.getUsers();
      const admin = allUsers.find((entry: User) => entry.role === 'admin');
      if (!admin) {
        setConversationId(null);
        setMessages([]);
        return;
      }

      const conversation = await api.getOrCreateConversation(user.id, admin.id);
      setConversationId(conversation.id);
      const msgs = await api.getMessages(conversation.id, user.id);
      setMessages(msgs);
    } catch (error) {
      console.error('Error fetching conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadConversation();
  }, [user]);


  useEffect(() => {
    const handleNewMessageNotification = async () => {
      if (!user?.id || !conversationId) return;
      try {
        const notifications: AppNotification[] = await api.getNotifications(user.id);
        const conversationNotifications = notifications.filter((notification) => {
          if (notification.type !== 'new_message' && notification.type !== 'new_image') return false;
          const payloadConversationId = notification.payload?.conversationId;
          return !payloadConversationId || String(payloadConversationId) === String(conversationId);
        });

        if (conversationNotifications.length > 0) {
          const latest = conversationNotifications[0];
          alert(`Nuevo mensaje del administrador: ${latest.body}`);
          const msgs: Message[] = await api.getMessages(conversationId, user.id);
          setMessages(msgs);
          await api.markNotificationsRead(user.id, true);
        }
      } catch (error) {
        console.error('Error al obtener notificaciones:', error);
      }
    };
    const interval = setInterval(handleNewMessageNotification, 10000); // Verificar cada 10 segundos
    return () => clearInterval(interval);
  }, [user, conversationId]);


  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !user?.id) return;
    try {
      await api.sendMessage(conversationId, user.id, { messageType: 'text', body: newMessage });
      const msgs: Message[] = await api.getMessages(conversationId, user.id);
      setMessages(msgs);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };


  if (!user) {
    return <div className="p-8 text-center text-contrast font-bold" style={{ backgroundColor: 'var(--bg)' }}>Por favor, inicia sesión para acceder al chat.</div>;
  }

  if (loading) {
    return <div className="p-8 text-center text-contrast" style={{ backgroundColor: 'var(--bg)' }}>Cargando chat...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6" style={{ backgroundColor: 'var(--bg)' }}>

      <Store />
      <div className="glass-card p-4 rounded-md h-96 overflow-y-scroll">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-3 my-3 rounded-lg ${msg.senderId === user.id ? 'bg-white/15 text-contrast border border-white/20' : 'bg-white/5 text-contrast border border-white/10'}`}
          >
            {msg.body}
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          className="flex-1 form-input px-3 py-2 rounded-lg"
          placeholder="Escribe un mensaje..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button
          className="accent-btn px-4 py-2 rounded-lg"
          onClick={handleSendMessage}
        >
          Enviar
        </button>
      </div>
    </div>
  );
}