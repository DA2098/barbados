import { useState, useEffect } from 'react';
import { api, Message, User, Product, isSessionConflictError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import { useCart } from '../context/CartContext';
import { useAutoRefresh } from '../hooks/useAutoRefresh';


export default function ClientPanel() {
  const { user, duplicatedSession } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<'barber' | 'food' | 'drink'>('barber');
  const { addToCart } = useCart();
  
  const [newMessage, setNewMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  

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
      if (isSessionConflictError(error)) {
        console.warn('Ignored session conflict while loading conversation');
      } else {
        console.error('Error fetching conversation:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadConversation();
    void loadProducts(category);
  }, [user]);

  useEffect(() => {
    void loadProducts(category);
  }, [category]);

  useAutoRefresh(() => void loadProducts(category, true), { intervalMs: 30000, enabled: !duplicatedSession });

  const loadProducts = async (cat: typeof category, background = false) => {
    if (!background) setLoading(true);
    try {
      const items = await api.getProducts({ category: cat as any });
      setProducts(items);
    } catch (err) {
      if (isSessionConflictError(err)) {
        console.warn('Ignored session conflict while loading products');
      } else {
        console.error('Error cargando productos:', err);
        setProducts([]);
      }
    } finally {
      setLoading(false);
    }
  };


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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="col-span-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4 text-contrast">Tienda de {category === 'barber' ? 'Barbería' : category === 'food' ? 'Lencería' : 'Bebidas'}</h1>
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-6">
          <span className="px-4 py-2 rounded-lg font-semibold accent-btn text-contrast">Servicios</span>
        </div>
        <div className="mb-4 flex flex-wrap gap-3 rounded-2xl p-2 glass-card w-fit">
          <button onClick={() => setCategory('barber')} className={`px-4 py-2 rounded-lg font-semibold ${category === 'barber' ? 'accent-btn text-contrast' : 'text-contrast'}`}>Barbería</button>
          <button onClick={() => setCategory('food')} className={`px-4 py-2 rounded-lg font-semibold ${category === 'food' ? 'accent-btn text-contrast' : 'text-contrast'}`}>Lencería</button>
          <button onClick={() => setCategory('drink')} className={`px-4 py-2 rounded-lg font-semibold ${category === 'drink' ? 'accent-btn text-contrast' : 'text-contrast'}`}>Bebidas</button>
        </div>

        {loading ? (
          <p className="muted">Cargando productos...</p>
        ) : products.length === 0 ? (
          <div className="glass-card p-6 rounded">No hay productos para esta categoría.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product) => (
              <Card
                key={product.id}
                title={product.name}
                subtitle={`Stock: ${product.stock}`}
                image={product.image_url || 'https://via.placeholder.com/300?text=Producto'}
                className="relative"
                footer={
                  <button onClick={() => addToCart(product)} className="w-full accent-btn flex items-center justify-center gap-2 py-2.5">
                    Agregar
                  </button>
                }
              >
                <p className="text-sm muted mb-3 line-clamp-3 min-h-[60px]">{product.description?.trim() ? product.description : 'Sin descripcion disponible.'}</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xl font-bold card-title">${product.price.toFixed(2)}</span>
                  <span className="text-xs px-2 py-1 rounded-full border border-white/15 muted uppercase tracking-wide">{product.category}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
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