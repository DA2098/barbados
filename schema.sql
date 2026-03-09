CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS carts CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS barber_applications CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'barber', 'client')),
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(40),
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_approved BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE barber_applications (
    id VARCHAR(50) PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(40),
    specialty VARCHAR(150) NOT NULL,
    years_experience INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP NULL
);

CREATE TABLE services (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(80) NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE appointments (
    id VARCHAR(50) PRIMARY KEY,
    client_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    barber_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_id VARCHAR(50) NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    appointment_date TIMESTAMP NOT NULL,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE conversations (
    id VARCHAR(50) PRIMARY KEY,
    appointment_id VARCHAR(50) NULL REFERENCES appointments(id) ON DELETE CASCADE,
    barber_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(180) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE messages (
    id VARCHAR(50) PRIMARY KEY,
    conversation_id VARCHAR(50) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'voice', 'system')),
    body TEXT NOT NULL,
    media_url TEXT,
    media_name VARCHAR(255),
    media_duration VARCHAR(20),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE carts (
    id VARCHAR(50) PRIMARY KEY,
    client_id VARCHAR(50) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE cart_items (
    id VARCHAR(50) PRIMARY KEY,
    cart_id VARCHAR(50) NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0)
);

CREATE TABLE orders (
    id VARCHAR(50) PRIMARY KEY,
    client_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'cancelled', 'refunded')),
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
    id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL
);

-- Tabla de testimonios/sugerencias de clientes
CREATE TABLE testimonials (
    id VARCHAR(50) PRIMARY KEY,
    client_id VARCHAR(50) NULL REFERENCES users(id) ON DELETE SET NULL,
    client_name VARCHAR(150) NOT NULL,
    client_email VARCHAR(150),
    message TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMP NULL
);

-- Tabla de cortes/servicios realizados por barberos (registro de ganancias)
CREATE TABLE barber_cuts (
    id VARCHAR(50) PRIMARY KEY,
    barber_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_id VARCHAR(50) NULL REFERENCES services(id) ON DELETE SET NULL,
    client_name VARCHAR(150) NOT NULL,
    service_name VARCHAR(150) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    notes TEXT,
    cut_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_barber_cuts_barber ON barber_cuts(barber_id, cut_date DESC);
CREATE INDEX idx_barber_cuts_date ON barber_cuts(cut_date DESC);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_appointments_barber_date ON appointments(barber_id, appointment_date);
CREATE INDEX idx_appointments_client_date ON appointments(client_id, appointment_date);
CREATE INDEX idx_conversations_appointment ON conversations(appointment_id);
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_testimonials_approved ON testimonials(is_approved, created_at DESC);
CREATE INDEX idx_testimonials_featured ON testimonials(is_featured, is_approved);

INSERT INTO users (id, full_name, role, email, phone, password_hash, avatar_url, is_active, is_approved)
VALUES
    ('usr-admin', 'Diego Herrera', 'admin', 'admin@barberpro360.com', '+52 55 0000 1100', crypt('secret123', gen_salt('bf')), 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80', TRUE, TRUE),
    ('usr-barber-1', 'Leandro Ruiz', 'barber', 'leandro@barberpro360.com', '+52 55 0000 2200', crypt('secret123', gen_salt('bf')), 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80', TRUE, TRUE),
    ('usr-barber-2', 'Mateo Silva', 'barber', 'mateo@barberpro360.com', '+52 55 0000 2201', crypt('secret123', gen_salt('bf')), 'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=400&q=80', TRUE, TRUE),
    ('usr-client-1', 'Carlos Méndez', 'client', 'carlos@cliente.com', '+52 55 0000 3300', crypt('secret123', gen_salt('bf')), 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=400&q=80', TRUE, TRUE),
    ('usr-client-2', 'Julia Torres', 'client', 'julia@cliente.com', '+52 55 0000 3301', crypt('secret123', gen_salt('bf')), 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80', TRUE, TRUE);

INSERT INTO barber_applications (id, full_name, email, phone, specialty, years_experience, note, status)
VALUES
    ('app-1', 'Bruno Salas', 'bruno@talento.com', '+52 55 9999 4411', 'Fade, barba y visagismo', 4, 'Quiero integrarme a un equipo premium.', 'pending'),
    ('app-2', 'Ángel Rosales', 'angel@talento.com', '+52 55 9999 4412', 'Cortes clásicos y afeitado', 6, 'Tengo experiencia en atención VIP.', 'pending');

INSERT INTO services (id, name, description, duration_minutes, price)
VALUES
    ('srv-fade', 'Fade Premium', 'Degradado con perfilado y acabado premium.', 50, 320),
    ('srv-beard', 'Barba & Perfilado', 'Perfilado completo de barba con toalla caliente.', 30, 180),
    ('srv-total', 'Corte + Barba Executive', 'Servicio ejecutivo integral.', 75, 430);

INSERT INTO products (id, name, category, description, price, stock, image_url, is_active)
VALUES
    ('prd-1', 'Pomada Matte Control', 'Styling', 'Fijación flexible con acabado mate.', 240, 18, 'https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?auto=format&fit=crop&w=800&q=80', TRUE),
    ('prd-2', 'Aceite Premium para Barba', 'Beard Care', 'Nutrición profunda para barba.', 280, 12, 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=800&q=80', TRUE),
    ('prd-3', 'Shampoo Energizante', 'Hair Care', 'Limpieza profunda y mantenimiento.', 210, 21, 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80', TRUE),
    ('prd-4', 'Navaja Precision Steel', 'Herramientas', 'Herramienta profesional para perfilados.', 520, 5, 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=800&q=80', TRUE);

INSERT INTO appointments (id, client_id, barber_id, service_id, appointment_date, notes, status)
VALUES
    ('apt-1', 'usr-client-1', 'usr-barber-1', 'srv-fade', NOW() + interval '1 day', 'Quiero un low fade con textura arriba.', 'accepted'),
    ('apt-2', 'usr-client-2', 'usr-barber-2', 'srv-total', NOW() + interval '2 days', 'Servicio ejecutivo para evento formal.', 'pending'),
    ('apt-3', 'usr-client-1', 'usr-barber-2', 'srv-beard', NOW() - interval '6 days', 'Perfilado limpio y mantenimiento.', 'completed');

INSERT INTO conversations (id, appointment_id, barber_id, client_id, title, is_active)
VALUES
    ('conv-1', 'apt-1', 'usr-barber-1', 'usr-client-1', 'Fade Premium · Carlos Méndez', TRUE);

INSERT INTO messages (id, conversation_id, sender_id, message_type, body)
VALUES
    ('msg-1', 'conv-1', 'usr-client-1', 'text', 'Hola, ya agendé. Quiero un fade bajo con textura arriba.'),
    ('msg-2', 'conv-1', 'usr-barber-1', 'text', 'Perfecto, envíame una referencia y lo dejamos exacto.');

INSERT INTO notifications (id, user_id, title, body, type)
VALUES
    ('ntf-1', 'usr-admin', 'Postulaciones nuevas', 'Tienes postulaciones pendientes de revisar.', 'application'),
    ('ntf-2', 'usr-barber-1', 'Nueva cita aceptada', 'Tu agenda tiene una cita confirmada para mañana.', 'appointment'),
    ('ntf-3', 'usr-client-1', 'Chat habilitado', 'Ya puedes conversar con tu barbero.', 'message');

INSERT INTO carts (id, client_id)
VALUES ('cart-1', 'usr-client-1');

INSERT INTO cart_items (id, cart_id, product_id, quantity)
VALUES ('cart-item-1', 'cart-1', 'prd-2', 1);

INSERT INTO orders (id, client_id, status, total_amount, created_at, updated_at)
VALUES ('ord-1', 'usr-client-1', 'paid', 240, NOW() - interval '4 days', NOW() - interval '4 days');

INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, subtotal)
VALUES ('ord-item-1', 'ord-1', 'prd-1', 1, 240, 240);
