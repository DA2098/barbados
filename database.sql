-- Script para MySQL / phpMyAdmin (WampServer)

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'barber', 'user') DEFAULT 'user',
    barber_approved TINYINT(1) NOT NULL DEFAULT 1,
    phone VARCHAR(20) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url VARCHAR(255),
    category ENUM('service', 'food', 'drink') NOT NULL DEFAULT 'food',
    is_visible TINYINT(1) NOT NULL DEFAULT 1,
    stock INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    barber_id INT NOT NULL,
    service_name VARCHAR(150) NOT NULL,
    appointment_date DATETIME NOT NULL,
    notes TEXT DEFAULT NULL,
    status ENUM('pending', 'confirmed', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (barber_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE barber_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    barber_id INT NOT NULL,
    category VARCHAR(50) NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (barber_id) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS avatar_updated_at DATETIME DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS barber_approved TINYINT(1) NOT NULL DEFAULT 1;

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS category ENUM('service', 'food', 'drink') NOT NULL DEFAULT 'food',
    ADD COLUMN IF NOT EXISTS is_visible TINYINT(1) NOT NULL DEFAULT 1;

CREATE TABLE conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_type ENUM('client_barber', 'barber_admin') NOT NULL,
    created_by INT NOT NULL,
    last_message_at DATETIME DEFAULT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE conversation_participants (
    conversation_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (conversation_id, user_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE media_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uploader_id INT NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size INT NOT NULL,
    original_name VARCHAR(255) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,
    message_type ENUM('text', 'image') NOT NULL DEFAULT 'text',
    body TEXT DEFAULT NULL,
    media_id INT DEFAULT NULL,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (media_id) REFERENCES media_files(id) ON DELETE SET NULL
);

CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at);

CREATE TABLE message_reads (
    message_id INT NOT NULL,
    user_id INT NOT NULL,
    read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (message_id, user_id),
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('new_message', 'new_image', 'system') NOT NULL,
    title VARCHAR(150) NOT NULL,
    body VARCHAR(500) NOT NULL,
    payload JSON DEFAULT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user_read_created ON notifications(user_id, is_read, created_at);

DELIMITER $$

CREATE TRIGGER trg_orders_only_clients
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
    DECLARE v_role VARCHAR(20);

    SELECT role INTO v_role
    FROM users
    WHERE id = NEW.user_id
    LIMIT 1;

    IF v_role <> 'user' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Solo clientes pueden comprar productos';
    END IF;
END$$

DELIMITER ;
