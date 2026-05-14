import { useState, useEffect } from 'react';
import { api, Message, AppNotification, Conversation } from '../services/api';
import { useAuth } from '../context/AuthContext';


export default function ClientPanel() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);


  useEffect(() => {
    const fetchConversation = async () => {
      if (!user?.id) return;
      try {
        const conversations: Conversation[] = await api.getConversationsByUser(user.id);
        if (conversations.length > 0) {
          setConversationId(conversations[0].id);
          const msgs: Message[] = await api.getMessages(conversations[0].id, user.id);
          setMessages(msgs);
        }
      } catch (error) {
        console.error('Error fetching conversation:', error);
      }
    };
    fetchConversation();
  }, [user]);


  useEffect(() => {
    const handleNewMessageNotification = async () => {
      if (!user?.id || !conversationId) return;
      try {
        const notifications: AppNotification[] = await api.getNotifications(user.id);
        const newMessageNotification = notifications.find(
          (notification) => notification.type === 'new_message'
        );
        if (newMessageNotification) {
          alert(`Nuevo mensaje del administrador: ${newMessageNotification.body}`);
          const msgs: Message[] = await api.getMessages(conversationId, user.id);
          setMessages((prev: Message[]) => [...prev, ...msgs]);
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
      setMessages((prev: Message[]) => [...prev, {
        id: (Date.now()).toString(),
        conversationId,
        senderId: user.id,
        senderName: user.name,
        messageType: 'text',
        body: newMessage,
        createdAt: new Date().toISOString(),
      } as Message]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };


  if (!user) {
    return <div className="p-8 text-center text-contrast font-bold" style={{ backgroundColor: 'var(--bg)' }}>Por favor, inicia sesión para acceder al chat.</div>;
  }

  return (
    <div className="p-4" style={{ backgroundColor: 'var(--bg)' }}>
      <h1 className="text-2xl font-bold mb-4 text-contrast">Chat con el Administrador</h1>
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