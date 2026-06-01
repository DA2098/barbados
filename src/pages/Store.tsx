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
      <div className="glass-card rounded-3xl p-6 md:p-8 border border-white/10 mb-6 sm:mb-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-2xl">
            <span className="hero-kicker">TIENDA BARBADOS</span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-contrast mt-4">Compra por categoría, ve precio y decide rápido</h1>
            <p className="muted text-sm sm:text-base mt-4 leading-relaxed">
              Inventario visible, presentación limpia y productos organizados para no perder tiempo.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 min-w-[120px]">
              <p className="text-xs uppercase tracking-[0.24em] muted">Categoría</p>
              <p className="mt-2 text-lg font-extrabold text-contrast">{categoryLabel(category)}</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 min-w-[120px]">
              <p className="text-xs uppercase tracking-[0.24em] muted">Productos</p>
              <p className="mt-2 text-lg font-extrabold text-contrast">{products.length}</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 min-w-[120px]">
              <p className="text-xs uppercase tracking-[0.24em] muted">Acceso</p>
              <p className="mt-2 text-lg font-extrabold text-contrast">{canBuyProducts ? 'Compra' : 'Vista'}</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 min-w-[120px]">
              <p className="text-xs uppercase tracking-[0.24em] muted">Estado</p>
              <p className="mt-2 text-lg font-extrabold text-contrast">{loading ? 'Cargando' : 'Listo'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3 rounded-3xl p-2 glass-card border border-white/10 w-fit">
        <button
          onClick={() => setCategory('barber')}
          className={`px-4 py-2 rounded-2xl font-semibold ${category === 'barber' ? 'accent-btn text-contrast' : 'nav-btn'}`}
        >
          Barbería
        </button>
        <button
          onClick={() => setCategory('food')}
          className={`px-4 py-2 rounded-2xl font-semibold ${category === 'food' ? 'accent-btn text-contrast' : 'nav-btn'}`}
        >
          Mercancia
        </button>
        <button
          onClick={() => setCategory('drink')}
          className={`px-4 py-2 rounded-2xl font-semibold ${category === 'drink' ? 'accent-btn text-contrast' : 'nav-btn'}`}
        >
          Bebidas
        </button>
      </div>

      {loading ? (
        <p className="muted">Cargando productos...</p>
      ) : products.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-3xl border border-white/10">
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
                  className="w-full accent-btn flex items-center justify-center gap-2 py-2.5 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
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