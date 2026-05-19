import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api, Product, isSessionConflictError } from '../services/api';
import Card from '../components/Card';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart } from 'lucide-react';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

export default function Store() {
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<'barber' | 'food' | 'drink' | 'service'>('barber');
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const { addToCart } = useCart();
  const { user, duplicatedSession } = useAuth();
  const canBuyProducts = user ? user.role === 'user' : true;

  const loadProducts = async (background = false) => {
    if (!background || !loadedOnce) setLoading(true);
    try {
      const data = await api.getProducts({ category });
      setProducts(data);
      setLoadedOnce(true);
    } catch (err: any) {
      if (isSessionConflictError(err)) {
        console.warn('Ignored session conflict while loading products');
      } else {
        console.error('Error loading products:', err);
        setProducts([]);
      }
    } finally {
      if (!background || !loadedOnce) setLoading(false);
    }
  };

  const location = useLocation();

  useEffect(() => {
    // If URL has ?category=..., use it first
    const params = new URLSearchParams(location.search);
    const q = params.get('category');
    if (q && (q === 'barber' || q === 'food' || q === 'drink' || q === 'service')) {
      setCategory(q as any);
      void loadProducts(false);
      return;
    }

      void loadProducts(false);
  }, [location.search, category]);

  useAutoRefresh(() => loadProducts(true), { intervalMs: 30000, enabled: !duplicatedSession });

  const categoryLabel = (c: 'barber' | 'food' | 'drink' | 'service') => {
    if (c === 'barber') return 'Barbería';
    if (c === 'food') return 'mercancia';
    if (c === 'drink') return 'Bebidas';
    return 'Servicios';
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-contrast">Tienda de {categoryLabel(category)}</h1>
        <p className="muted text-sm sm:text-base">Productos seleccionados para una experiencia premium.</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3 rounded-2xl p-2 glass-card w-fit">
        <button
          onClick={() => setCategory('barber')}
          className={`px-4 py-2 rounded-lg font-semibold ${category === 'barber' ? 'accent-btn text-contrast' : 'text-contrast'} focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2`}
        >
          Barbería
        </button>
        <button
          onClick={() => setCategory('food')}
          className={`px-4 py-2 rounded-lg font-semibold ${category === 'food' ? 'accent-btn text-contrast' : 'text-contrast'} focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2`}
        >
          Mercancia
        </button>
        <button
          onClick={() => setCategory('drink')}
          className={`px-4 py-2 rounded-lg font-semibold ${category === 'drink' ? 'accent-btn text-contrast' : 'text-contrast'} focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2`}
        >
          Bebidas
        </button>
      </div>

      {loading ? (
        <p className="muted">Cargando productos...</p>
      ) : products.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-xl shadow-sm">
          <ShoppingCart className="w-16 h-16 mx-auto muted mb-4" />
          <h2 className="text-xl font-medium text-contrast">No hay productos disponibles</h2>
          <p className="muted mt-2">El administrador aún no ha agregado elementos para esta categoría.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map(product => (
            <Card
              key={product.id}
              title={product.name}
              subtitle={`Stock: ${product.stock}`}
              image={product.image_url || 'https://via.placeholder.com/300?text=Producto'}
              className="relative"
              footer={
                <button
                  onClick={() => addToCart(product)}
                  disabled={!canBuyProducts}
                  className="w-full accent-btn flex items-center justify-center gap-2 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2"
                >
                  <ShoppingCart className="w-4 h-4" /> {canBuyProducts ? 'Agregar' : 'Solo clientes compran'}
                </button>
              }
            >
              <p className="text-sm muted mb-3 line-clamp-3 min-h-[60px]">{product.description?.trim() ? product.description : 'Sin descripcion disponible.'}</p>
              <div className="flex justify-between items-center mt-3">
                <span className="text-xl font-bold card-title">${product.price.toFixed(2)}</span>
                <span className="text-xs px-2 py-1 rounded-full border border-white/15 muted uppercase tracking-wide">{categoryLabel(product.category as any)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}