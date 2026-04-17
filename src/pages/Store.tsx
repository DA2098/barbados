import { useState, useEffect } from 'react';
import { api, Product } from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart } from 'lucide-react';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

export default function Store() {
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<'barber' | 'food' | 'drink'>('barber');
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const { addToCart } = useCart();
  const { user } = useAuth();
  const canBuyProducts = user ? user.role === 'user' : true;

  const loadProducts = async (background = false) => {
    if (!background || !loadedOnce) {
      setLoading(true);
    }

    try {
      const data = await api.getProducts({ category });
      setProducts(data);
      setLoadedOnce(true);
    } finally {
      if (!background || !loadedOnce) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadProducts(false);
  }, [category]);

  useAutoRefresh(() => loadProducts(true), { intervalMs: 30000 });

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Tienda de {category === 'barber' ? 'Barberia' : category === 'food' ? 'Comida' : 'Bebidas'}</h1>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={() => setCategory('barber')}
          className={`px-4 py-2 rounded-lg font-semibold ${category === 'barber' ? 'bg-indigo-600 text-white' : 'bg-white border'}`}
        >
          Barberia
        </button>
        <button
          onClick={() => setCategory('food')}
          className={`px-4 py-2 rounded-lg font-semibold ${category === 'food' ? 'bg-indigo-600 text-white' : 'bg-white border'}`}
        >
          Comida
        </button>
        <button
          onClick={() => setCategory('drink')}
          className={`px-4 py-2 rounded-lg font-semibold ${category === 'drink' ? 'bg-indigo-600 text-white' : 'bg-white border'}`}
        >
          Bebidas
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando productos...</p>
      ) : products.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl shadow-sm border border-gray-100">
          <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-medium text-gray-600">No hay productos disponibles</h2>
          <p className="text-gray-400 mt-2">El administrador aun no ha agregado productos para esta categoria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map(product => (
            <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
              <div className="h-48 bg-gray-100 overflow-hidden">
                <img 
                  src={product.image_url || 'https://via.placeholder.com/300?text=Producto'} 
                  alt={product.name} 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xl font-bold text-indigo-600">${product.price.toFixed(2)}</span>
                  <span className="text-sm text-gray-500">Stock: {product.stock}</span>
                </div>
                <button
                  onClick={() => addToCart(product)}
                  disabled={!canBuyProducts}
                  className="w-full bg-slate-900 text-white py-2 rounded flex items-center justify-center gap-2 hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="w-4 h-4" /> {canBuyProducts ? 'Agregar' : 'Solo clientes compran'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}