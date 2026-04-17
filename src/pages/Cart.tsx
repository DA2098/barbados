import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';

export default function Cart() {
  const { items, removeFromCart } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-12 text-center">
        <h2 className="text-2xl font-bold text-gray-700 mb-4">Tu carrito está vacío</h2>
        <button
          onClick={() => navigate('/store')}
          className="text-indigo-600 hover:underline font-semibold"
        >
          Ir a la tienda
        </button>
      </div>
    );
  }

  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Carrito de Compras</h1>
      
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <ul className="divide-y">
          {items.map((item) => (
            <li key={item.product.id} className="py-4 flex justify-between items-center">
              <div className="flex gap-4 items-center">
                <img
                  src={item.product.image_url || 'https://via.placeholder.com/100'}
                  alt={item.product.name}
                  className="w-16 h-16 object-cover rounded"
                />
                <div>
                  <h3 className="font-semibold">{item.product.name}</h3>
                  <p className="text-gray-500">${item.product.price.toFixed(2)} x {item.quantity}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span className="font-bold">${(item.product.price * item.quantity).toFixed(2)}</span>
                <button
                  onClick={() => removeFromCart(item.product.id)}
                  className="text-red-500 hover:text-red-700 transition"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-slate-50 border rounded-xl p-6 flex justify-between items-center">
        <div>
          <p className="text-gray-500 text-sm">Total a pagar</p>
          <p className="text-3xl font-bold text-slate-900">${total.toFixed(2)}</p>
        </div>
        <button 
          onClick={() => window.alert('El método de pago aún no está implementado en esta versión.')}
          className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-indigo-700 transition"
        >
          Finalizar Compra
        </button>
      </div>
    </div>
  );
}