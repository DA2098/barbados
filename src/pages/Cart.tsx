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
        <div className="glass-card rounded-3xl p-10 border border-white/10">
          <h2 className="text-2xl font-bold text-contrast mb-4">Tu carrito está vacío</h2>
        <button
          onClick={() => navigate('/store')}
          className="accent-btn px-5 py-2.5 rounded-2xl font-semibold"
        >
          Ir a la tienda
        </button>
        </div>
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
    <div className="max-w-6xl mx-auto p-4 sm:p-6" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="glass-card rounded-3xl p-6 md:p-8 mb-6 border border-white/10">
        <span className="hero-kicker">CHECKOUT</span>
        <h1 className="text-3xl font-extrabold mb-3 text-contrast mt-4">Carrito de Compras</h1>
        <p className="muted text-sm max-w-2xl">Resumen claro de lo que vas a pagar, con métodos de pago visibles y sin ruido.</p>
      </div>

      <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-6">
      <div className="glass-card rounded-3xl p-6 border border-white/10">
        <ul className="divide-y divide-white/10">
          {items.map((item) => (
            <li key={item.product.id} className="py-4 flex justify-between items-center gap-4">
              <div className="flex gap-4 items-center">
                <img
                  src={item.product.image_url || 'https://via.placeholder.com/100'}
                  alt={item.product.name}
                  className="w-16 h-16 object-cover rounded-2xl border border-white/10"
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
                  className="text-danger hover:opacity-85 transition"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="glass-card rounded-3xl p-6 border border-white/10" style={{ backgroundColor: 'var(--surface)' }}>
        <div className="space-y-5 w-full">
          <div>
            <p className="muted text-sm">Total a pagar</p>
            <p className="text-4xl font-extrabold text-contrast mt-1">${total.toFixed(2)}</p>
            {!user && <p className="text-xs muted mt-1">Debes iniciar sesión para pagar y generar factura.</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`px-4 py-3 rounded-2xl font-semibold ${paymentMethod === 'card' ? 'accent-btn' : 'nav-btn'}`}
            >
              Tarjeta
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('paypal')}
              className={`px-4 py-3 rounded-2xl font-semibold ${paymentMethod === 'paypal' ? 'accent-btn' : 'nav-btn'}`}
            >
              PayPal
            </button>
          </div>
          <button
            onClick={handleCheckout}
            disabled={processing}
            className="w-full accent-btn px-8 py-3 rounded-2xl font-bold text-lg disabled:opacity-60"
          >
            {processing ? 'Redirigiendo al pago...' : paymentMethod === 'card' ? 'Pagar con tarjeta' : 'Pagar con PayPal'}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}