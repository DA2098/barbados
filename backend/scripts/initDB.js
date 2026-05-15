import pool from '../db.js';

export async function initializeDatabase() {
  try {
    console.log('Inicializando base de datos...');

    // Crear ENUMs
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM('admin', 'barber', 'user');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE product_category AS ENUM('service', 'barber', 'food', 'drink');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE appointment_status AS ENUM('pending', 'confirmed', 'completed', 'cancelled');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE order_status AS ENUM('pending', 'completed', 'cancelled');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE conversation_type AS ENUM('client_barber', 'barber_admin', 'admin_user');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE message_type AS ENUM('text', 'image');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE application_status AS ENUM('pending', 'approved', 'rejected');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // Crear tablas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role user_role DEFAULT 'user',
        barber_approved BOOLEAN DEFAULT TRUE,
        phone VARCHAR(20),
        avatar_url TEXT,
        avatar_updated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        image_url TEXT,
        category product_category DEFAULT 'food',
        is_visible BOOLEAN DEFAULT TRUE,
        stock INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        image_url VARCHAR(500),
        is_visible BOOLEAN DEFAULT TRUE,
        duration_minutes INT DEFAULT 30,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        client_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        barber_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        service_id INT REFERENCES services(id) ON DELETE SET NULL,
        service_product_id INT REFERENCES products(id) ON DELETE SET NULL,
        service_name VARCHAR(150) NOT NULL,
        appointment_date TIMESTAMP NOT NULL,
        notes TEXT,
        status appointment_status DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        total DECIMAL(10,2) NOT NULL,
        status order_status DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS barber_logs (
        id SERIAL PRIMARY KEY,
        barber_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category VARCHAR(50) NOT NULL,
        item_name VARCHAR(100) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        conversation_type conversation_type NOT NULL,
        created_by INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        last_message_at TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversation_participants (
        conversation_id INT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (conversation_id, user_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS media_files (
        id SERIAL PRIMARY KEY,
        uploader_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        file_url VARCHAR(500) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_size INT NOT NULL,
        original_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message_type message_type DEFAULT 'text',
        body TEXT,
        media_id INT REFERENCES media_files(id) ON DELETE SET NULL,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
      ON messages(conversation_id, created_at);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS message_reads (
        message_id INT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (message_id, user_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(150) NOT NULL,
        body VARCHAR(500) NOT NULL,
        payload JSONB,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
      ON notifications(user_id, is_read, created_at);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS appointment_reviews (
        id SERIAL PRIMARY KEY,
        appointment_id INT NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating INT NOT NULL,
        comment TEXT NOT NULL,
        is_published BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        published_at TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reviews_published_created 
      ON appointment_reviews(is_published, created_at);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS barber_applications (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        phone VARCHAR(50) NOT NULL,
        experience_years INT DEFAULT 0,
        specialties TEXT NOT NULL,
        availability VARCHAR(150) NOT NULL,
        motivation TEXT NOT NULL,
        portfolio_url VARCHAR(500),
        status application_status DEFAULT 'pending',
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP
      );
    `);

    // Migrate existing columns to TEXT for Base64 storage
    try {
      await pool.query(`ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT;`);
    } catch (err) {
      // Column might already be TEXT, ignore
    }

    try {
      await pool.query(`ALTER TABLE products ALTER COLUMN image_url TYPE TEXT;`);
    } catch (err) {
      // Column might already be TEXT, ignore
    }

    console.log('✓ Base de datos inicializada correctamente');
  } catch (error) {
    console.error('Error inicializando base de datos:', error);
    throw error;
  }
}
