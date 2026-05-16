import { useEffect, useMemo, useRef, useState } from 'react';
import { api, Conversation, Message, User } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { useRealtimeUserEvents } from '../hooks/useRealtimeUserEvents';

export default function Chat() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [contacts, setContacts] = useState<User[]>([]);
  const [selectedContact, setSelectedContact] = useState<User | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const avatarFallback = (name: string) => name.charAt(0).toUpperCase();

  const title = useMemo(() => {
    if (!user) return 'Chat';
    if (user.role === 'user') return 'Chat con Barbero';
    if (user.role === 'barber') return 'Chat con Clientes y Admin';
    return 'Chat con Barberos y Clientes';
  }, [user]);

  const loadContacts = async () => {
    if (!user) return;
    const data = await api.getChatContacts(user.id);
    setContacts(data);

    // Mantiene el contacto seleccionado sincronizado (avatar/nombre/rol) en tiempo real.
    if (selectedContact) {
      const refreshedSelected = data.find((contact) => contact.id === selectedContact.id);
      if (refreshedSelected) {
        setSelectedContact(refreshedSelected);
      }
    }

    const peerId = searchParams.get('peerId');
    if (peerId) {
      const selectedByQuery = data.find((contact) => contact.id === peerId);
      if (selectedByQuery) {
        setSelectedContact(selectedByQuery);
        return;
      }
    }

    if (!selectedContact && data.length > 0) {
      setSelectedContact(data[0]);
    }
  };

  const refreshConversation = async () => {
    if (!user || !selectedContact) return;
    const convo = await api.getOrCreateConversation(user.id, selectedContact.id);
    setConversation(convo);
    const msgs = await api.getMessages(convo.id, user.id);
    setMessages(msgs);
  };

  const openConversation = async (peer: User) => {
    if (!user) return;
    const convo = await api.getOrCreateConversation(user.id, peer.id);
    setConversation(convo);
    const msgs = await api.getMessages(convo.id, user.id);
    setMessages(msgs);
  };

  const loadMessages = async () => {
    if (!user || !conversation) return;
    const msgs = await api.getMessages(conversation.id, user.id);
    setMessages(msgs);
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    loadContacts().finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!selectedContact) return;
    openConversation(selectedContact);
  }, [selectedContact?.id]);

  useAutoRefresh(async () => {
    if (!user || !selectedContact) return;
    await refreshConversation();
  }, { intervalMs: 15000, enabled: !!user && !!selectedContact });

  useAutoRefresh(async () => {
    if (!user) return;
    await loadContacts();
  }, { intervalMs: 30000, enabled: !!user });

  useRealtimeUserEvents(user?.id, async () => {
    if (!user) return;
    await loadContacts();
    if (selectedContact) {
      await refreshConversation();
    }
  }, !!user);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !conversation || !text.trim()) return;
    setSending(true);
    try {
      await api.sendMessage(conversation.id, user.id, {
        messageType: 'text',
        body: text.trim()
      });
      setText('');
      await loadMessages();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  const sendImage = async (file: File) => {
    if (!user || !conversation) return;
    setUploading(true);
    try {
      const uploaded = await api.uploadChatImage(user.id, file);
      await api.sendMessage(conversation.id, user.id, {
        messageType: 'image',
        mediaId: uploaded.mediaId
      });
      await loadMessages();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const clearConversation = async () => {
    if (!user || !conversation || !selectedContact) return;
    if (!confirm('¿Borrar el historial de este chat?')) return;

    try {
      await api.deleteConversation(conversation.id, user.id);
      setConversation(null);
      setMessages([]);
      await openConversation(selectedContact);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!user) {
    return <div className="p-8 text-center text-contrast" style={{ backgroundColor: 'var(--bg)' }}>Debes iniciar sesión para usar el chat.</div>
  }

  if (loading) {
    return <div className="p-8 text-center text-contrast" style={{ backgroundColor: 'var(--bg)' }}>Cargando chat...</div>
  }

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6" style={{ backgroundColor: 'var(--bg)' }}>
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-contrast">{title}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <aside className="glass-card rounded-xl p-4 h-[42vh] md:h-[70vh] overflow-y-auto">
          <h2 className="font-semibold mb-3">Contactos</h2>
          {contacts.length === 0 && <p className="text-sm muted">No hay contactos disponibles.</p>}
          <div className="space-y-2">
            {contacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`w-full text-left p-3 rounded-lg border transition ${
                  selectedContact?.id === contact.id ? 'border-white/20 bg-white/5 text-contrast' : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  {contact.avatar_url ? (
                    <img src={contact.avatar_url} alt={contact.name} onError={(e) => { e.currentTarget.style.display = 'none'; }} className="w-10 h-10 rounded-full object-cover border border-white/40 shrink-0" />
                  ) : null}
                  {!contact.avatar_url || (contact.avatar_url && !contact.avatar_url) ? (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${selectedContact?.id === contact.id ? 'bg-white/20 text-contrast' : 'bg-white/10 text-contrast'}`}>
                      {avatarFallback(contact.name)}
                    </div>
                  ) : null}
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{contact.name}</p>
                    <p className={`text-xs truncate ${selectedContact?.id === contact.id ? 'text-contrast' : 'muted'}`}>{contact.role}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="md:col-span-2 glass-card rounded-xl h-[58vh] md:h-[70vh] flex flex-col overflow-hidden">
          <header className="p-3 sm:p-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {selectedContact ? (
                selectedContact.avatar_url ? (
                  <img src={selectedContact.avatar_url} alt={selectedContact.name} onError={(e) => { e.currentTarget.style.display = 'none'; }} className="w-10 h-10 rounded-full object-cover border" />
                ) : null
              ) : null}
              {!selectedContact || (selectedContact && !selectedContact.avatar_url) ? (
                <div className="w-10 h-10 rounded-full bg-white/10 text-contrast flex items-center justify-center font-bold uppercase">
                  {selectedContact ? avatarFallback(selectedContact.name) : '?'}
                </div>
              ) : null}
              <div className="min-w-0">
                <h2 className="font-semibold truncate text-contrast">{selectedContact ? selectedContact.name : 'Selecciona un contacto'}</h2>
                {selectedContact && <p className="text-xs muted capitalize truncate">{selectedContact.role}</p>}
              </div>
            </div>
            {conversation && (
              <button
                type="button"
                onClick={clearConversation}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded badge-danger text-xs font-semibold w-full sm:w-auto transition"
              >
                <Trash2 className="w-4 h-4" />
                Borrar historial
              </button>
            )}
          </header>

          <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-4 bg-transparent">
            {messages.map((message) => {
              const isMine = message.senderId === user.id;
              return (
                <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex items-end gap-2 max-w-[85%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                    {message.senderAvatar ? (
                      <img src={message.senderAvatar} alt={message.senderName} onError={(e) => { e.currentTarget.style.display = 'none'; }} className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0" />
                    ) : null}
                    {!message.senderAvatar || (message.senderAvatar && !message.senderAvatar) ? (
                      <div className="w-9 h-9 rounded-full bg-white/10 text-contrast flex items-center justify-center font-bold shrink-0">
                        {avatarFallback(message.senderName)}
                      </div>
                    ) : null}
                    <div className={`rounded-xl p-3 ${isMine ? 'bg-white/15 text-contrast border border-white/20' : 'bg-white/5 border border-white/10'}`}>
                      <p className={`text-xs font-semibold mb-1 ${isMine ? 'text-contrast' : 'muted'}`}>{message.senderName}</p>
                      {message.messageType === 'image' && message.imageUrl && (
                        <a href={message.imageUrl} target="_blank" rel="noreferrer">
                          <img src={message.imageUrl} alt="Referencia" className="max-h-60 rounded-lg mb-2" />
                        </a>
                      )}
                      {message.body && <p className="wrap-break-word">{message.body}</p>}
                      <p className="text-[11px] mt-1 muted">
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <footer className="p-3 border-t bg-transparent">
            <form onSubmit={sendText} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <label className="px-3 py-2 border border-white/20 rounded cursor-pointer hover:border-white/40 text-sm text-center sm:text-left text-contrast transition">
                {uploading ? 'Subiendo...' : 'Imagen'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) sendImage(file);
                    e.currentTarget.value = '';
                  }}
                />
              </label>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="flex-1 border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 min-w-0"
              />
              <button
                disabled={sending || !conversation}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 w-full sm:w-auto"
              >
                {sending ? 'Enviando...' : 'Enviar'}
              </button>
            </form>
          </footer>
        </section>
      </div>
    </div>
  );
}
