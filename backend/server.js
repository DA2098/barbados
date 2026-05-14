import express from 'express';
import cors from 'cors';
import 'dotenv/config.js';
import { initializeDatabase } from './initDB.js';
import pool from './db.js';
import bcrypt from 'bcrypt';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Inicializar DB al arrancar (sin bloquear si falla)
initializeDatabase().catch(err => {
  console.warn('⚠ Advertencia: No se pudo inicializar la BD:', err.message);
  console.warn('⚠ La BD se inicializará automáticamente cuando se conecte.');
});

// Helpers
async function getUserById(id) {
  const result = await pool.query(
    'SELECT id, name, email, role, barber_approved, phone, avatar_url FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

function normalizeUser(user) {
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    barber_approved: user.barber_approved ?? true,
    phone: user.phone || '',
    avatar_url: user.avatar_url || null
  };
}

async function adminCount() {
  const result = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
  return parseInt(result.rows[0].count);
}

function normalizeProductCategory(category) {
  const normalized = String(category || '').toLowerCase().trim();
  if (['barber', 'barberia', 'barbería', 'barber-shop'].includes(normalized)) {
    return 'barber';
  }
  if (['service', 'servicio', 'corte'].includes(normalized)) {
    return 'service';
  }
  if (['food', 'comida', 'menu', 'menú'].includes(normalized)) {
    return 'food';
  }
  if (['drink', 'bebida', 'bebidas'].includes(normalized)) {
    return 'drink';
  }
  return 'food';
}

async function createNotification(userId, type, title, body, payload) {
  await pool.query(
    'INSERT INTO notifications (user_id, type, title, body, payload) VALUES ($1, $2, $3, $4, $5)',
    [userId, type, title, body, JSON.stringify(payload)]
  );
}

function resolveConversationType(roleA, roleB) {
  const roles = [roleA, roleB].sort();
  if (JSON.stringify(roles) === JSON.stringify(['barber', 'user'])) {
    return 'client_barber';
  }
  if (JSON.stringify(roles) === JSON.stringify(['admin', 'barber'])) {
    return 'barber_admin';
  }
  if (JSON.stringify(roles) === JSON.stringify(['admin', 'user'])) {
    return 'admin_user';
  }
  return null;
}

// --- API ROUTER ---
app.all('/api', async (req, res) => {
  const action = (req.method === 'GET' ? req.query.action : req.body.action) || '';

  try {
    if (req.method === 'GET' && !action) {
      return res.json({ message: 'API Barbados - Use action parameter', status: 'ok' });
    }

    if (req.method === 'POST' && action === 'register') {
      const { name, email, password, role: requestedRole } = req.body;
      const cleanRole = ['user', 'barber'].includes(requestedRole) ? requestedRole : 'user';
      const isBarberApplication = cleanRole === 'barber';
      const userRole = 'user';
      const barberApproved = isBarberApplication ? false : true;

      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await pool.query(
        'INSERT INTO users (name, email, password, role, barber_approved) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [name, email, hashedPassword, userRole, barberApproved]
      );

      const userId = result.rows[0].id;

      if (isBarberApplication) {
        const admins = await pool.query("SELECT id FROM users WHERE role = 'admin'");
        for (const admin of admins.rows) {
          await createNotification(
            admin.id,
            'system',
            'Nueva postulación de barbero',
            `${name} solicitó ser barbero`,
            { userId: String(userId) }
          );
        }
      }

      return res.json({
        id: String(userId),
        name,
        email,
        role: userRole,
        barber_approved: barberApproved,
        phone: '',
        avatar_url: null
      });
    }

    if (req.method === 'POST' && action === 'login') {
      const { email, password } = req.body;
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      const user = result.rows[0];

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Credenciales incorrectas' });
      }

      if (user.role === 'barber' && !user.barber_approved) {
        return res.status(403).json({
          error: 'Tu cuenta de barbero está pendiente de aprobación por el administrador'
        });
      }

      return res.json(normalizeUser(user));
    }

    if (req.method === 'GET' && action === 'users') {
      const result = await pool.query(
        'SELECT id, name, email, role, barber_approved, phone, avatar_url FROM users'
      );
      return res.json(result.rows.map(normalizeUser));
    }

    if (req.method === 'GET' && action === 'products') {
      const { category, includeHidden } = req.query;
      let query = 'SELECT id, name, description, price, image_url, category, is_visible, stock FROM products WHERE 1=1';
      const params = [];

      if (category && ['service', 'barber', 'food', 'drink'].includes(normalizeProductCategory(category))) {
        query += ` AND category = $${params.length + 1}`;
        params.push(normalizeProductCategory(category));
      }

      if (includeHidden !== '1') {
        query += ' AND is_visible = true';
      }

      query += ' ORDER BY id DESC';

      const result = await pool.query(query, params);
      return res.json(result.rows);
    }

    if (req.method === 'POST' && action === 'products') {
      const { name, price, stock, image_url, description, category, is_visible } = req.body;
      const normalizedCategory = normalizeProductCategory(category);
      await pool.query(
        'INSERT INTO products (name, description, price, stock, image_url, category, is_visible) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [name, description || '', price, stock, image_url || '', normalizedCategory, is_visible !== false]
      );
      return res.json({ message: 'Producto creado' });
    }

    return res.status(404).json({ error: `Action "${action || 'none'}" no encontrada` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Root endpoint for Render health/testing
app.get('/', (req, res) => {
  res.json({ message: 'Barbados API running', status: 'ok' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Servidor iniciado en puerto ${PORT}`);
  console.log(`✓ Entorno: ${process.env.NODE_ENV || 'development'}`);
});
