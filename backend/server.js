import express from 'express';
import cors from 'cors';
import 'dotenv/config.js';
import { initializeDatabase } from './initDB.js';
import pool from './db.js';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;
const uploadsDir = path.resolve('uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage()
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(uploadsDir));

// Inicializar DB al arrancar (sin bloquear si falla)
initializeDatabase()
  .then(() => ensureDefaultAdmin())
  .catch(err => {
    console.warn('⚠ Advertencia: No se pudo inicializar la BD:', err.message);
    console.warn('⚠ La BD se inicializará automáticamente cuando se conecte.');
  });

async function ensureDefaultAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@barbados.com';
  const password = process.env.ADMIN_PASSWORD || 'administrador';
  const hashedPassword = await bcrypt.hash(password, 10);

  await pool.query(
    `INSERT INTO users (name, email, password, role, barber_approved, phone)
     VALUES ($1, $2, $3, 'admin', true, $4)
     ON CONFLICT (email) DO UPDATE
     SET name = EXCLUDED.name,
         password = EXCLUDED.password,
         role = 'admin',
         barber_approved = true,
         phone = EXCLUDED.phone`,
    ['Administrador', email, hashedPassword, '1234567890']
  );
}

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

function normalizeProductCategory(category) {
  const normalized = String(category || '').toLowerCase().trim();
  if (['barber', 'barberia', 'barbería', 'barber-shop'].includes(normalized)) return 'barber';
  if (['service', 'servicio', 'corte'].includes(normalized)) return 'service';
  if (['food', 'comida', 'menu', 'menú'].includes(normalized)) return 'food';
  if (['drink', 'bebida', 'bebidas'].includes(normalized)) return 'drink';
  return 'food';
}

async function createNotification(userId, type, title, body, payload) {
  await pool.query(
    'INSERT INTO notifications (user_id, type, title, body, payload) VALUES ($1, $2, $3, $4, $5)',
    [userId, type, title, body, JSON.stringify(payload || {})]
  );
}

function resolveConversationType(roleA, roleB) {
  const roles = [roleA, roleB].sort();
  if (JSON.stringify(roles) === JSON.stringify(['barber', 'user'])) return 'client_barber';
  if (JSON.stringify(roles) === JSON.stringify(['admin', 'barber'])) return 'barber_admin';
  if (JSON.stringify(roles) === JSON.stringify(['admin', 'user'])) return 'admin_user';
  return 'client_barber';
}

function normalizeAppointment(row) {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    clientName: row.client_name,
    barberId: String(row.barber_id),
    barberName: row.barber_name,
    serviceId: row.service_product_id ? String(row.service_product_id) : null,
    serviceName: row.service_name,
    serviceImageUrl: row.service_image_url || null,
    serviceDescription: row.service_description || null,
    appointmentDate: row.appointment_date,
    notes: row.notes || null,
    status: row.status,
    createdAt: row.created_at
  };
}

function normalizeReview(row) {
  return {
    id: String(row.id),
    appointmentId: String(row.appointment_id),
    userId: String(row.user_id),
    userName: row.user_name,
    serviceName: row.service_name,
    rating: Number(row.rating),
    comment: row.comment,
    isPublished: Boolean(row.is_published),
    createdAt: row.created_at,
    publishedAt: row.published_at || null
  };
}

function normalizeConversation(row) {
  return {
    id: String(row.id),
    conversation_type: row.conversation_type,
    last_message_at: row.last_message_at || null,
    created_at: row.created_at
  };
}

function normalizeMessage(row) {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    senderId: String(row.sender_id),
    senderName: row.sender_name,
    senderAvatar: row.sender_avatar || null,
    messageType: row.message_type,
    body: row.body || null,
    imageUrl: row.image_url || null,
    createdAt: row.created_at
  };
}

function normalizeNotification(row) {
  return {
    id: String(row.id),
    type: row.type,
    title: row.title,
    body: row.body,
    payload: row.payload || null,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at,
    readAt: row.read_at || null
  };
}

function normalizeBarberLog(row) {
  return {
    id: String(row.id),
    barberId: String(row.barber_id),
    barberName: row.barber_name,
    type: row.category,
    name: row.item_name,
    price: Number(row.price),
    date: row.created_at
  };
}

function normalizeBarberApplication(row) {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    userName: row.user_name,
    userEmail: row.user_email,
    phone: row.phone,
    experienceYears: Number(row.experience_years || 0),
    specialties: row.specialties,
    availability: row.availability,
    motivation: row.motivation,
    portfolioUrl: row.portfolio_url || null,
    status: row.status,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at || null
  };
}

async function buildRealtimePayload(userId) {
  const unreadResult = await pool.query(
    'SELECT COUNT(*)::int AS unread_count FROM notifications WHERE user_id = $1 AND is_read = false',
    [userId]
  );

  const latestConversationResult = await pool.query(
    `SELECT COALESCE(MAX(EXTRACT(EPOCH FROM COALESCE(c.last_message_at, c.created_at))), 0)::bigint AS latest_conversation_ts
     FROM conversations c
     JOIN conversation_participants p ON p.conversation_id = c.id
     WHERE p.user_id = $1 AND c.is_active = true`,
    [userId]
  );

  const avatarPulseResult = await pool.query(
    'SELECT COALESCE(MAX(EXTRACT(EPOCH FROM COALESCE(avatar_updated_at, created_at))), 0)::bigint AS avatar_pulse FROM users WHERE id = $1',
    [userId]
  );

  const unreadCount = Number(unreadResult.rows[0]?.unread_count || 0);
  const latestConversationTs = Number(latestConversationResult.rows[0]?.latest_conversation_ts || 0);
  const avatarPulse = Number(avatarPulseResult.rows[0]?.avatar_pulse || 0);
  const serverTime = new Date().toISOString();

  return {
    unreadCount,
    latestConversationTs,
    avatarPulse,
    signature: `${userId}:${unreadCount}:${latestConversationTs}:${avatarPulse}`,
    serverTime
  };
}

async function isAdminUser(userId) {
  if (!userId) return false;
  const user = await getUserById(userId);
  return Boolean(user && user.role === 'admin');
}

async function isParticipantOrAdmin(conversationId, userId) {
  const user = await getUserById(userId);
  if (!user) return false;
  if (user.role === 'admin') return true;
  const member = await pool.query(
    'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, userId]
  );
  return member.rowCount > 0;
}

async function findOrCreateConversation(requesterId, peerId) {
  const requester = await getUserById(requesterId);
  const peer = await getUserById(peerId);
  if (!requester || !peer) {
    throw new Error('Usuarios inválidos para conversación');
  }

  const existing = await pool.query(
    `SELECT c.id, c.conversation_type, c.last_message_at, c.created_at
     FROM conversations c
     JOIN conversation_participants p1 ON p1.conversation_id = c.id AND p1.user_id = $1
     JOIN conversation_participants p2 ON p2.conversation_id = c.id AND p2.user_id = $2
     WHERE c.is_active = true
     LIMIT 1`,
    [requesterId, peerId]
  );

  if (existing.rowCount > 0) {
    return normalizeConversation(existing.rows[0]);
  }

  const conversationType = resolveConversationType(requester.role, peer.role);
  const created = await pool.query(
    'INSERT INTO conversations (conversation_type, created_by) VALUES ($1, $2) RETURNING id, conversation_type, last_message_at, created_at',
    [conversationType, requesterId]
  );

  const conversation = created.rows[0];
  await pool.query(
    'INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)',
    [conversation.id, requesterId, peerId]
  );

  return normalizeConversation(conversation);
}

async function uploadStoredFile(file, req) {
  // Convert file to base64 data URL for persistent storage in database
  // This avoids issues with ephemeral filesystems (Render, Heroku, etc.)
  const mimeType = file.mimetype || 'application/octet-stream';
  const base64Data = file.buffer.toString('base64');
  return `data:${mimeType};base64,${base64Data}`;
}

async function handleUpload(req, res, action) {
  const file = req.file;
  const userId = req.body.userId;

  if (!file || !userId) {
    return res.status(400).json({ error: 'Archivo o usuario faltante' });
  }

  const user = await getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  const fileUrl = await uploadStoredFile(file, req);

  if (action === 'upload-avatar') {
    await pool.query('UPDATE users SET avatar_url = $1, avatar_updated_at = CURRENT_TIMESTAMP WHERE id = $2', [fileUrl, userId]);
    return res.json({ avatar_url: fileUrl });
  }

  if (action === 'upload-service-image') {
    return res.json({ image_url: fileUrl });
  }

  if (action === 'upload-chat-media') {
    const media = await pool.query(
      'INSERT INTO media_files (uploader_id, file_url, mime_type, file_size, original_name) VALUES ($1, $2, $3, $4, $5) RETURNING id, file_url',
      [userId, fileUrl, file.mimetype || 'application/octet-stream', file.size || 0, file.originalname || null]
    );
    return res.json({ mediaId: String(media.rows[0].id), imageUrl: media.rows[0].file_url });
  }

  return res.status(404).json({ error: `Action "${action || 'none'}" no encontrada` });
}

app.get(['/api', '/api.php'], async (req, res, next) => {
  const action = req.query.action || '';
  if (action !== 'realtime') {
    return next();
  }

  const userId = String(req.query.userId || '').trim();
  if (!userId) {
    return res.status(400).json({ error: 'userId requerido' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  let closed = false;
  let lastSignature = '';

  const sendEvent = (eventName, payload) => {
    if (closed) return;
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const pushSync = async (force = false) => {
    try {
      const payload = await buildRealtimePayload(userId);
      if (force || payload.signature !== lastSignature) {
        lastSignature = payload.signature;
        sendEvent('sync', payload);
      }
      sendEvent('heartbeat', { serverTime: payload.serverTime });
    } catch (error) {
      sendEvent('heartbeat', { serverTime: new Date().toISOString(), error: 'sync_failed' });
    }
  };

  sendEvent('heartbeat', { serverTime: new Date().toISOString() });
  await pushSync(true);

  const intervalId = setInterval(async () => {
    await pushSync(false);
  }, 15000);

  req.on('close', () => {
    closed = true;
    clearInterval(intervalId);
    res.end();
  });
});

app.post(['/api', '/api.php'], upload.single('file'), async (req, res, next) => {
  const action = req.query.action || req.body.action || '';
  if (!['upload-avatar', 'upload-service-image', 'upload-chat-media'].includes(action)) {
    return next();
  }

  try {
    return await handleUpload(req, res, action);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- API ROUTER ---
app.all(['/api', '/api.php'], async (req, res) => {
  const action = req.query.action || req.body.action || '';

  try {
    if (req.method === 'GET' && !action) {
      return res.json({ message: 'API Barbados - Use action parameter', status: 'ok' });
    }

    if (req.method === 'POST' && action === 'register') {
      const { name, email, password, role: requestedRole } = req.body;
      const cleanRole = ['user', 'barber'].includes(requestedRole) ? requestedRole : 'user';
      const isBarberApplication = cleanRole === 'barber';
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await pool.query(
        'INSERT INTO users (name, email, password, role, barber_approved) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [name, email, hashedPassword, 'user', !isBarberApplication]
      );

      const userId = result.rows[0].id;

      if (isBarberApplication) {
        const admins = await pool.query("SELECT id FROM users WHERE role = 'admin'");
        for (const admin of admins.rows) {
          await createNotification(admin.id, 'system', 'Nueva postulación de barbero', `${name} solicitó ser barbero`, { userId: String(userId) });
        }
      }

      return res.json({
        id: String(userId),
        name,
        email,
        role: 'user',
        barber_approved: !isBarberApplication,
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
        return res.status(403).json({ error: 'Tu cuenta de barbero está pendiente de aprobación por el administrador' });
      }

      return res.json(normalizeUser(user));
    }

    if (req.method === 'POST' && action === 'create-admin') {
      const { adminId, name, email, password, phone } = req.body;
      if (!(await isAdminUser(adminId))) {
        return res.status(403).json({ error: 'Solo un administrador puede crear administradores' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await pool.query(
        'INSERT INTO users (name, email, password, role, barber_approved, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, role, barber_approved, phone, avatar_url',
        [name, email, hashedPassword, 'admin', true, phone || '']
      );
      return res.json(normalizeUser(result.rows[0]));
    }

    if (req.method === 'POST' && action === 'create-barber') {
      const { adminId, name, email, password, phone } = req.body;
      if (!(await isAdminUser(adminId))) {
        return res.status(403).json({ error: 'Solo un administrador puede crear barberos' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await pool.query(
        'INSERT INTO users (name, email, password, role, barber_approved, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, role, barber_approved, phone, avatar_url',
        [name, email, hashedPassword, 'barber', true, phone || '']
      );
      return res.json(normalizeUser(result.rows[0]));
    }

    if (req.method === 'GET' && action === 'users') {
      if (req.query.id) {
        const user = await getUserById(req.query.id);
        if (!user) {
          return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        return res.json(normalizeUser(user));
      }

      const result = await pool.query('SELECT id, name, email, role, barber_approved, phone, avatar_url FROM users ORDER BY id ASC');
      return res.json(result.rows.map(normalizeUser));
    }

    if (req.method === 'PUT' && action === 'users') {
      const { id } = req.query;
      const { name, phone, avatar_url } = req.body;
      const result = await pool.query(
        `UPDATE users
         SET name = COALESCE($1, name),
             phone = COALESCE($2, phone),
             avatar_url = $3::text,
             avatar_updated_at = CASE WHEN $3::text IS NOT NULL THEN CURRENT_TIMESTAMP ELSE avatar_updated_at END
         WHERE id = $4
         RETURNING id, name, email, role, barber_approved, phone, avatar_url`,
        [name ?? null, phone ?? null, avatar_url === undefined ? null : avatar_url, id]
      );

      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      return res.json(normalizeUser(result.rows[0]));
    }

    if (req.method === 'POST' && action === 'change-password') {
      const { id } = req.query;
      const { currentPassword, newPassword } = req.body;
      const result = await pool.query('SELECT id, password FROM users WHERE id = $1', [id]);
      const user = result.rows[0];

      if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(401).json({ error: 'Credenciales incorrectas' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, id]);
      const updated = await getUserById(id);
      return res.json(normalizeUser(updated));
    }

    if (req.method === 'PUT' && action === 'user-role') {
      const { id } = req.query;
      const { adminId, role, barber_approved } = req.body;
      if (!(await isAdminUser(adminId))) {
        return res.status(403).json({ error: 'Solo un administrador puede cambiar roles' });
      }

      const cleanRole = ['admin', 'barber', 'user'].includes(role) ? role : 'user';
      const approved = cleanRole === 'barber' ? Boolean(barber_approved) : true;
      const result = await pool.query(
        'UPDATE users SET role = $1, barber_approved = $2 WHERE id = $3 RETURNING id, name, email, role, barber_approved, phone, avatar_url',
        [cleanRole, approved, id]
      );

      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      return res.json(normalizeUser(result.rows[0]));
    }

    if (req.method === 'DELETE' && action === 'users') {
      const { id } = req.query;
      await pool.query('DELETE FROM users WHERE id = $1', [id]);
      return res.json({ message: 'Usuario eliminado' });
    }

    if (req.method === 'GET' && action === 'products') {
      const { category, includeHidden } = req.query;
      let query = 'SELECT id, name, description, price, image_url, category, is_visible, stock FROM products WHERE category != $1';
      const params = ['service'];

      if (category && ['barber', 'food', 'drink'].includes(normalizeProductCategory(category))) {
        query += ` AND category = $${params.length + 1}`;
        params.push(normalizeProductCategory(category));
      }

      if (includeHidden !== '1') {
        query += ' AND is_visible = true';
      }

      query += ' ORDER BY id DESC';

      const result = await pool.query(query, params);
      return res.json(result.rows.map((product) => ({
        id: String(product.id),
        name: product.name,
        description: product.description || '',
        price: Number(product.price),
        image_url: product.image_url || '',
        category: product.category,
        is_visible: Boolean(product.is_visible),
        stock: Number(product.stock || 0),
        duration_minutes: 0
      })));
    }

    if (req.method === 'GET' && action === 'services') {
      const { includeHidden } = req.query;
      let query = 'SELECT id, name, description, price, image_url, is_visible, duration_minutes FROM services WHERE 1=1';
      const params = [];

      if (includeHidden !== '1') {
        query += ' AND is_visible = true';
      }

      query += ' ORDER BY id DESC';

      const result = await pool.query(query, params);
      return res.json(result.rows.map((service) => ({
        id: String(service.id),
        name: service.name,
        description: service.description || '',
        price: Number(service.price),
        image_url: service.image_url || '',
        category: 'service',
        is_visible: Boolean(service.is_visible),
        stock: 0,
        duration_minutes: Number(service.duration_minutes || 30)
      })));
    }

    if (req.method === 'POST' && action === 'products') {
      const { name, price, stock, image_url, description, category, is_visible } = req.body;
      const normalizedCategory = normalizeProductCategory(category);
      
      // Si es un servicio, guardarlo en la tabla services
      if (normalizedCategory === 'service') {
        await pool.query(
          'INSERT INTO services (name, description, price, image_url, is_visible, duration_minutes) VALUES ($1, $2, $3, $4, $5, $6)',
          [name, description || '', price, image_url || '', is_visible !== false, 30]
        );
      } else {
        await pool.query(
          'INSERT INTO products (name, description, price, stock, image_url, category, is_visible) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [name, description || '', price, stock, image_url || '', normalizedCategory, is_visible !== false]
        );
      }
      return res.json({ message: 'Producto creado' });
    }

    if (req.method === 'PUT' && action === 'products') {
      const { id } = req.query;
      const { name, price, stock, image_url, description, category, is_visible } = req.body;
      const normalizedCategory = normalizeProductCategory(category);
      
      if (normalizedCategory === 'service') {
        const result = await pool.query(
          `UPDATE services
           SET name = $1, description = $2, price = $3, image_url = $4, is_visible = $5
           WHERE id = $6
           RETURNING id`,
          [name, description || '', price, image_url || '', is_visible !== false, id]
        );
        if (!result.rows[0]) return res.status(404).json({ error: 'Servicio no encontrado' });
      } else {
        const result = await pool.query(
          `UPDATE products
           SET name = $1, description = $2, price = $3, stock = $4, image_url = $5, category = $6, is_visible = $7
           WHERE id = $8
           RETURNING id`,
          [name, description || '', price, stock, image_url || '', normalizedCategory, is_visible !== false, id]
        );
        if (!result.rows[0]) return res.status(404).json({ error: 'Producto no encontrado' });
      }
      return res.json({ message: 'Producto actualizado' });
    }

    if (req.method === 'DELETE' && action === 'products') {
      const { id } = req.query;
      const { category } = req.body;
      
      // Primero intentar eliminar de services si es de esa categoría
      if (category === 'service') {
        const result = await pool.query('DELETE FROM services WHERE id = $1 RETURNING id', [id]);
        if (result.rowCount > 0) {
          return res.json({ message: 'Servicio eliminado' });
        }
      }
      
      // Sino, eliminar de products
      await pool.query('DELETE FROM products WHERE id = $1', [id]);
      return res.json({ message: 'Producto eliminado' });
    }

    if (req.method === 'POST' && action === 'logs') {
      const { barberId, type, name, price } = req.body;
      await pool.query(
        'INSERT INTO barber_logs (barber_id, category, item_name, price) VALUES ($1, $2, $3, $4)',
        [barberId, type, name, price]
      );
      return res.json({ message: 'Registro creado' });
    }

    if (req.method === 'GET' && action === 'logs') {
      const result = await pool.query(
        `SELECT l.id, l.barber_id, u.name AS barber_name, l.category, l.item_name, l.price, l.created_at
         FROM barber_logs l
         LEFT JOIN users u ON u.id = l.barber_id
         ORDER BY l.created_at DESC`
      );
      return res.json(result.rows.map(normalizeBarberLog));
    }

    if (req.method === 'DELETE' && action === 'logs') {
      const { id, dateRange } = req.query;
      
      if (id) {
        // Eliminar un log específico
        await pool.query('DELETE FROM barber_logs WHERE id = $1', [id]);
        return res.json({ message: 'Log eliminado' });
      }
      
      if (dateRange) {
        // Eliminar logs por rango de fechas (hoy, mes, año)
        let query = 'DELETE FROM barber_logs WHERE ';
        const now = new Date();
        
        if (dateRange === 'today') {
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
          query += 'created_at >= $1 AND created_at < $2';
          await pool.query(query, [todayStart, todayEnd]);
        } else if (dateRange === 'month') {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          query += 'created_at >= $1 AND created_at < $2';
          await pool.query(query, [monthStart, monthEnd]);
        } else if (dateRange === 'year') {
          const yearStart = new Date(now.getFullYear(), 0, 1);
          const yearEnd = new Date(now.getFullYear() + 1, 0, 1);
          query += 'created_at >= $1 AND created_at < $2';
          await pool.query(query, [yearStart, yearEnd]);
        }
        return res.json({ message: `Logs eliminados (${dateRange})` });
      }
      
      return res.status(400).json({ error: 'id o dateRange requerido' });
    }

    if (req.method === 'POST' && action === 'appointments') {
      const { userId, barberId, serviceId, serviceName, appointmentDate, notes } = req.body;
      
      // Buscar en services primero, luego en products
      let serviceResult = serviceId
        ? await pool.query('SELECT id, name, description, image_url FROM services WHERE id = $1', [serviceId])
        : { rows: [] };
      
      let service = serviceResult.rows[0];
      
      if (!service && serviceId) {
        serviceResult = await pool.query('SELECT id, name, description, image_url FROM products WHERE id = $1', [serviceId]);
        service = serviceResult.rows[0];
      }
      
      const nameToStore = serviceName || service?.name || 'Servicio';

      const created = await pool.query(
        `INSERT INTO appointments (client_id, barber_id, service_id, service_product_id, service_name, appointment_date, notes, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
         RETURNING id`,
        [userId, barberId, (service && !serviceId) ? null : (serviceId || null), (service && !serviceId) ? serviceId : null, nameToStore, appointmentDate, notes || '']
      );

      await createNotification(barberId, 'new_message', 'Nueva cita asignada', `${nameToStore} fue agendada`, { appointmentId: String(created.rows[0].id) });
      return res.json({ message: 'Cita creada', id: String(created.rows[0].id) });
    }

    if (req.method === 'GET' && action === 'appointments') {
      const { userId } = req.query;
      const user = userId ? await getUserById(userId) : null;
      const isAdmin = user?.role === 'admin';
      const params = [];
      let query = `
        SELECT
          a.id,
          a.client_id,
          client.name AS client_name,
          a.barber_id,
          barber.name AS barber_name,
          a.service_id,
          a.service_product_id,
          a.service_name,
          COALESCE(s.image_url, p.image_url) AS service_image_url,
          COALESCE(s.description, p.description) AS service_description,
          a.appointment_date,
          a.notes,
          a.status,
          a.created_at
        FROM appointments a
        LEFT JOIN users client ON client.id = a.client_id
        LEFT JOIN users barber ON barber.id = a.barber_id
        LEFT JOIN services s ON s.id = a.service_id
        LEFT JOIN products p ON p.id = a.service_product_id`;

      if (userId && !isAdmin) {
        query += ' WHERE a.client_id = $1 OR a.barber_id = $1';
        params.push(userId);
      }

      query += ' ORDER BY a.created_at DESC';
      const result = await pool.query(query, params);
      return res.json(result.rows.map(normalizeAppointment));
    }

    if (req.method === 'PUT' && action === 'appointments') {
      const { id } = req.query;
      const { actorId, status } = req.body;
      const appointmentResult = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
      const appointment = appointmentResult.rows[0];

      if (!appointment) return res.status(404).json({ error: 'Cita no encontrada' });

      const actor = await getUserById(actorId);
      const allowed = actor?.role === 'admin' || String(appointment.client_id) === String(actorId) || String(appointment.barber_id) === String(actorId);
      if (!allowed) return res.status(403).json({ error: 'No autorizado para modificar esta cita' });

      await pool.query('UPDATE appointments SET status = $1 WHERE id = $2', [status, id]);
      await createNotification(appointment.client_id, 'system', 'Estado de cita actualizado', `Tu cita cambió a ${status}`, { appointmentId: String(id) });
      await createNotification(appointment.barber_id, 'system', 'Estado de cita actualizado', `La cita cambió a ${status}`, { appointmentId: String(id) });
      return res.json({ message: 'Cita actualizada' });
    }

    if (req.method === 'DELETE' && action === 'appointments') {
      const { id } = req.query;
      const { actorId } = req.body;
      const appointmentResult = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
      const appointment = appointmentResult.rows[0];

      if (!appointment) return res.status(404).json({ error: 'Cita no encontrada' });

      const actor = await getUserById(actorId);
      const allowed = actor?.role === 'admin' || String(appointment.client_id) === String(actorId) || String(appointment.barber_id) === String(actorId);
      if (!allowed) return res.status(403).json({ error: 'No autorizado para eliminar esta cita' });

      await pool.query('DELETE FROM appointments WHERE id = $1', [id]);
      return res.json({ message: 'Cita eliminada' });
    }

    if (req.method === 'POST' && action === 'appointment-reviews') {
      const { appointmentId, userId, rating, comment } = req.body;
      const result = await pool.query(
        `INSERT INTO appointment_reviews (appointment_id, user_id, rating, comment, is_published)
         VALUES ($1, $2, $3, $4, false)
         RETURNING id`,
        [appointmentId, userId, rating, comment]
      );
      return res.json({ message: 'Reseña guardada', id: String(result.rows[0].id) });
    }

    if (req.method === 'GET' && action === 'appointment-reviews') {
      const { userId, published } = req.query;
      const params = [];
      let query = `
        SELECT ar.id, ar.appointment_id, ar.user_id, u.name AS user_name, a.service_name, ar.rating, ar.comment, ar.is_published, ar.created_at, ar.published_at
        FROM appointment_reviews ar
        JOIN users u ON u.id = ar.user_id
        JOIN appointments a ON a.id = ar.appointment_id`;

      if (published === '1') {
        query += ' WHERE ar.is_published = true';
      } else if (userId) {
        query += ' WHERE ar.user_id = $1';
        params.push(userId);
      }

      query += ' ORDER BY ar.created_at DESC';
      const result = await pool.query(query, params);
      return res.json(result.rows.map(normalizeReview));
    }

    if (req.method === 'PUT' && action === 'appointment-reviews') {
      const { id } = req.query;
      const { actorId, isPublished } = req.body;
      if (!(await isAdminUser(actorId))) {
        return res.status(403).json({ error: 'Solo un administrador puede publicar reseñas' });
      }

      await pool.query('UPDATE appointment_reviews SET is_published = $1, published_at = CASE WHEN $1 THEN CURRENT_TIMESTAMP ELSE published_at END WHERE id = $2', [Boolean(isPublished), id]);
      return res.json({ message: 'Reseña actualizada' });
    }

    if (req.method === 'DELETE' && action === 'appointment-reviews') {
      const { id } = req.query;
      const { actorId } = req.body;
      if (!(await isAdminUser(actorId))) {
        return res.status(403).json({ error: 'Solo un administrador puede eliminar reseñas' });
      }

      await pool.query('DELETE FROM appointment_reviews WHERE id = $1', [id]);
      return res.json({ message: 'Reseña eliminada' });
    }

    if (req.method === 'GET' && action === 'chat-contacts') {
      const { userId } = req.query;
      const user = await getUserById(userId);
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

      let roles = ['user', 'barber', 'admin'];
      if (user.role === 'user') roles = ['barber'];
      if (user.role === 'barber') roles = ['user', 'admin'];
      if (user.role === 'admin') roles = ['user', 'barber'];

      // Build IN clause with placeholders
      const placeholders = roles.map((_, i) => `$${i + 2}`).join(', ');
      const result = await pool.query(
        `SELECT id, name, email, role, barber_approved, phone, avatar_url
         FROM users
         WHERE id <> $1 AND role IN (${placeholders})
         ORDER BY name ASC`,
        [userId, ...roles]
      );

      return res.json(result.rows.map(normalizeUser));
    }

    if (req.method === 'POST' && action === 'conversations') {
      const { requesterId, peerId } = req.body;
      const conversation = await findOrCreateConversation(requesterId, peerId);
      return res.json(conversation);
    }

    if (req.method === 'GET' && action === 'conversations') {
      const { userId } = req.query;
      const result = await pool.query(
        `SELECT DISTINCT c.id, c.conversation_type, c.last_message_at, c.created_at
         FROM conversations c
         JOIN conversation_participants p ON p.conversation_id = c.id
         WHERE p.user_id = $1 AND c.is_active = true
         ORDER BY COALESCE(c.last_message_at, c.created_at) DESC`,
        [userId]
      );
      return res.json(result.rows.map(normalizeConversation));
    }

    if (req.method === 'DELETE' && action === 'conversations') {
      const { id } = req.query;
      const { actorId } = req.body;
      if (!(await isParticipantOrAdmin(id, actorId))) {
        return res.status(403).json({ error: 'No autorizado para eliminar conversación' });
      }

      await pool.query('UPDATE conversations SET is_active = false WHERE id = $1', [id]);
      return res.json({ message: 'Conversación limpiada' });
    }

    if (req.method === 'GET' && action === 'messages') {
      const { conversationId, userId } = req.query;
      if (!(await isParticipantOrAdmin(conversationId, userId))) {
        return res.status(403).json({ error: 'No autorizado para ver mensajes' });
      }

      const result = await pool.query(
        `SELECT m.id, m.conversation_id, m.sender_id, u.name AS sender_name, u.avatar_url AS sender_avatar,
                m.message_type, m.body, mf.file_url AS image_url, m.created_at
         FROM messages m
         LEFT JOIN users u ON u.id = m.sender_id
         LEFT JOIN media_files mf ON mf.id = m.media_id
         WHERE m.conversation_id = $1 AND m.is_deleted = false
         ORDER BY m.created_at ASC`,
        [conversationId]
      );
      return res.json(result.rows.map(normalizeMessage));
    }

    if (req.method === 'POST' && action === 'messages') {
      const { conversationId, senderId, messageType, body, mediaId } = req.body;
      if (!(await isParticipantOrAdmin(conversationId, senderId))) {
        return res.status(403).json({ error: 'No autorizado para enviar mensajes' });
      }

      const inserted = await pool.query(
        'INSERT INTO messages (conversation_id, sender_id, message_type, body, media_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [conversationId, senderId, messageType || 'text', body || null, mediaId || null]
      );

      await pool.query('UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1', [conversationId]);

      const participants = await pool.query(
        'SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id <> $2',
        [conversationId, senderId]
      );

      for (const participant of participants.rows) {
        await createNotification(participant.user_id, messageType === 'image' ? 'new_image' : 'new_message', 'Nuevo mensaje', body || 'Mensaje nuevo', { conversationId: String(conversationId) });
      }

      return res.json({ message: 'Mensaje enviado', id: String(inserted.rows[0].id) });
    }

    if (req.method === 'GET' && action === 'notifications') {
      const { userId } = req.query;
      const result = await pool.query(
        'SELECT id, type, title, body, payload, is_read, created_at, read_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      return res.json(result.rows.map(normalizeNotification));
    }

    if (req.method === 'PUT' && action === 'notifications') {
      const { userId, id } = req.query;
      const { markAll } = req.body;

      if (markAll === false && id) {
        await pool.query('UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2', [id, userId]);
      } else {
        await pool.query('UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND is_read = false', [userId]);
      }

      return res.json({ message: 'Notificaciones actualizadas' });
    }

    if (req.method === 'POST' && action === 'send_notification') {
      const { user_id, type, title, body } = req.body;
      await createNotification(user_id, type, title, body, {});
      return res.json({ message: 'Notificación enviada' });
    }

    if (req.method === 'POST' && action === 'barber-applications') {
      const { userId, phone, experienceYears, specialties, availability, motivation, portfolioUrl } = req.body;
      const result = await pool.query(
        `INSERT INTO barber_applications (user_id, phone, experience_years, specialties, availability, motivation, portfolio_url, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
         ON CONFLICT (user_id) DO UPDATE
         SET phone = EXCLUDED.phone,
             experience_years = EXCLUDED.experience_years,
             specialties = EXCLUDED.specialties,
             availability = EXCLUDED.availability,
             motivation = EXCLUDED.motivation,
             portfolio_url = EXCLUDED.portfolio_url,
             status = 'pending',
             reviewed_at = NULL
         RETURNING id, user_id, phone, experience_years, specialties, availability, motivation, portfolio_url, status, submitted_at, reviewed_at`,
        [userId, phone, experienceYears || 0, specialties, availability, motivation, portfolioUrl || null]
      );
      return res.json(normalizeBarberApplication(result.rows[0]));
    }

    if (req.method === 'GET' && action === 'barber-applications') {
      const { userId, adminId } = req.query;
      if (adminId && !(await isAdminUser(adminId))) {
        return res.status(403).json({ error: 'Solo un administrador puede ver todas las postulaciones' });
      }

      if (userId) {
        const result = await pool.query(
          `SELECT a.id, a.user_id, u.name AS user_name, u.email AS user_email, a.phone, a.experience_years, a.specialties, a.availability, a.motivation, a.portfolio_url, a.status, a.submitted_at, a.reviewed_at
           FROM barber_applications a
           JOIN users u ON u.id = a.user_id
           WHERE a.user_id = $1
           LIMIT 1`,
          [userId]
        );

        if (!result.rows[0]) return res.status(404).json({ error: 'Postulación no encontrada' });
        return res.json(normalizeBarberApplication(result.rows[0]));
      }

      const result = await pool.query(
        `SELECT a.id, a.user_id, u.name AS user_name, u.email AS user_email, a.phone, a.experience_years, a.specialties, a.availability, a.motivation, a.portfolio_url, a.status, a.submitted_at, a.reviewed_at
         FROM barber_applications a
         JOIN users u ON u.id = a.user_id
         ORDER BY a.submitted_at DESC`
      );
      return res.json(result.rows.map(normalizeBarberApplication));
    }

    if (req.method === 'PUT' && action === 'barber-applications') {
      const { id } = req.query;
      const { adminId, status } = req.body;
      if (!(await isAdminUser(adminId))) {
        return res.status(403).json({ error: 'Solo un administrador puede revisar postulaciones' });
      }

      const applicationResult = await pool.query('SELECT * FROM barber_applications WHERE id = $1', [id]);
      const application = applicationResult.rows[0];
      if (!application) return res.status(404).json({ error: 'Postulación no encontrada' });

      await pool.query(
        'UPDATE barber_applications SET status = $1, reviewed_at = CURRENT_TIMESTAMP WHERE id = $2',
        [status, id]
      );

      if (status === 'approved') {
        await pool.query('UPDATE users SET role = $1, barber_approved = true WHERE id = $2', ['barber', application.user_id]);
      }

      return res.json({ message: 'Postulación actualizada' });
    }

    if (req.method === 'GET' && action === 'get_conversations') {
      const { user_id } = req.query;
      const result = await pool.query(
        `SELECT DISTINCT c.id, c.conversation_type, c.last_message_at, c.created_at
         FROM conversations c
         JOIN conversation_participants p ON p.conversation_id = c.id
         WHERE p.user_id = $1 AND c.is_active = true
         ORDER BY COALESCE(c.last_message_at, c.created_at) DESC`,
        [user_id]
      );
      return res.json(result.rows.map(normalizeConversation));
    }

    if (req.method === 'POST' && action === 'toggle_client_messaging') {
      return res.json({ message: 'Permiso actualizado' });
    }

    if (req.method === 'POST' && action === 'create-user') {
      const { adminId, name, email, password, role, phone } = req.body;
      
      // Verificar que el usuario que hace la solicitud es admin
      if (!(await isAdminUser(adminId))) {
        return res.status(403).json({ error: 'Solo un administrador puede crear usuarios' });
      }

      // Validar datos requeridos
      if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'Nombre, email, contraseña y rol son requeridos' });
      }

      // Validar que el rol sea válido
      if (!['admin', 'barber', 'user'].includes(role)) {
        return res.status(400).json({ error: 'Rol inválido. Debe ser admin, barber o user' });
      }

      try {
        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear usuario
        const result = await pool.query(
          `INSERT INTO users (name, email, password, role, barber_approved, phone)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, name, email, role, barber_approved, phone, avatar_url`,
          [name, email, hashedPassword, role, role === 'barber' ? true : true, phone || '']
        );

        if (!result.rows[0]) {
          return res.status(400).json({ error: 'Error al crear el usuario' });
        }

        return res.json({ 
          message: `Usuario ${role} creado exitosamente`,
          user: normalizeUser(result.rows[0])
        });
      } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
          return res.status(400).json({ error: 'El email ya está registrado' });
        }
        throw error;
      }
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
