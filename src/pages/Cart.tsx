import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Cart() {
  const { items, removeFromCart } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');
  const [processing, setProcessing] = useState(false);

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-12 text-center" style={{ backgroundColor: 'var(--bg)' }}>
        <h2 className="text-2xl font-bold text-contrast mb-4">Tu carrito está vacío</h2>
        <button
          onClick={() => navigate('/store')}
          className="text-contrast font-semibold hover:opacity-80 transition-opacity"
        >
          Ir a la tienda
        </button>
      </div>
    );
  }

  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (items.length === 0) return;

    setProcessing(true);
    try {
      const checkout = await api.createPaymentSession({
        userId: user.id,
        kind: 'cart',
        method: paymentMethod,
        cartItems: items.map((item) => ({
          productId: item.product.id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          description: item.product.description || ''
        }))
      });

      window.location.href = checkout.checkoutUrl;
    } catch (error: any) {
      alert(error.message || 'No se pudo iniciar el pago');
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6" style={{ backgroundColor: 'var(--bg)' }}>
      <h1 className="text-3xl font-bold mb-8 text-contrast">Carrito de Compras</h1>
      
      <div className="glass-card rounded-xl p-6 mb-6">
        <ul className="divide-y divide-white/10">
          {items.map((item) => (
            <li key={item.product.id} className="py-4 flex justify-between items-center">
              <div className="flex gap-4 items-center">
                <img
                  src={item.product.image_url || 'https://via.placeholder.com/100'}
                  alt={item.product.name}
                  className="w-16 h-16 object-cover rounded"
                />
                <div>
                  <h3 className="font-semibold text-contrast">{item.product.name}</h3>
                  <p className="muted">${item.product.price.toFixed(2)} x {item.quantity}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span className="font-bold text-contrast">${(item.product.price * item.quantity).toFixed(2)}</span>
                <button
                  onClick={() => removeFromCart(item.product.id)}
                  className="text-red-500 hover:text-red-400 transition"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="glass-card rounded-xl p-6 flex justify-between items-center" style={{ backgroundColor: 'var(--surface)' }}>
        <div className="space-y-3 w-full">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="muted text-sm">Total a pagar</p>
              <p className="text-3xl font-bold text-contrast">${total.toFixed(2)}</p>
              {!user && <p className="text-xs muted mt-1">Debes iniciar sesión para pagar y generar factura.</p>}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`px-4 py-2 rounded-lg font-semibold ${paymentMethod === 'card' ? 'accent-btn' : 'glass-card border border-white/10 text-contrast'}`}
              >
                Tarjeta
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('paypal')}
                className={`px-4 py-2 rounded-lg font-semibold ${paymentMethod === 'paypal' ? 'accent-btn' : 'glass-card border border-white/10 text-contrast'}`}
              >
                PayPal
              </button>
            </div>
          </div>
          <button
            onClick={handleCheckout}
            disabled={processing}
            className="accent-btn px-8 py-3 rounded-lg font-bold text-lg disabled:opacity-60"
          >
            {processing ? 'Redirigiendo al pago...' : paymentMethod === 'card' ? 'Pagar con tarjeta' : 'Pagar con PayPal'}
          </button>
        </div>
      </div>
    </div>
  );
}