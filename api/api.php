<?php
// Script de API completa para WampServer y React
// COLOCA ESTE ARCHIVO EN LA CARPETA `www` de tu WampServer (ej: C:\wamp64\www\api.php)

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
ini_set('log_errors', '1');

set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
    if (!(error_reporting() & $severity)) {
        return false;
    }

    throw new \ErrorException($message, 0, $severity, $file, $line);
});

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

// Si es una petición OPTIONS (Preflight de CORS), terminamos aquí exitosamente
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Configuración de conexión a la base de datos `barber_shop`
$host = '127.0.0.1';
$db   = 'barber_shop'; // Coincide con el nombre de tu base de datos en la captura
$user = 'root';
$pass = '';

try {
    $dsn = "mysql:host=$host;dbname=$db;charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Error de conexión: " . $e->getMessage()]);
    exit;
}

function table_exists(PDO $pdo, string $table): bool
{
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?');
    $stmt->execute([$table]);
    return (int)$stmt->fetchColumn() > 0;
}

function column_exists(PDO $pdo, string $table, string $column): bool
{
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?');
    $stmt->execute([$table, $column]);
    return (int)$stmt->fetchColumn() > 0;
}

function trigger_exists(PDO $pdo, string $triggerName): bool
{
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = DATABASE() AND trigger_name = ?');
    $stmt->execute([$triggerName]);
    return (int)$stmt->fetchColumn() > 0;
}

function ensure_schema(PDO $pdo): void
{
    if (!column_exists($pdo, 'users', 'barber_approved')) {
        $pdo->exec("ALTER TABLE users ADD COLUMN barber_approved TINYINT(1) NOT NULL DEFAULT 1 AFTER role");
    }
    if (!column_exists($pdo, 'users', 'avatar_url')) {
        $pdo->exec("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) DEFAULT NULL AFTER phone");
    }
    if (!column_exists($pdo, 'users', 'avatar_updated_at')) {
        $pdo->exec("ALTER TABLE users ADD COLUMN avatar_updated_at DATETIME DEFAULT NULL AFTER avatar_url");
    }

    if (!column_exists($pdo, 'products', 'category')) {
        $pdo->exec("ALTER TABLE products ADD COLUMN category ENUM('service', 'barber', 'food', 'drink') NOT NULL DEFAULT 'food' AFTER image_url");
    }
    $pdo->exec("ALTER TABLE products MODIFY COLUMN category ENUM('service', 'barber', 'food', 'drink') NOT NULL DEFAULT 'food'");
    if (!column_exists($pdo, 'products', 'is_visible')) {
        $pdo->exec("ALTER TABLE products ADD COLUMN is_visible TINYINT(1) NOT NULL DEFAULT 1 AFTER category");
    }
    if (!column_exists($pdo, 'products', 'description')) {
        $pdo->exec("ALTER TABLE products ADD COLUMN description TEXT DEFAULT NULL AFTER name");
    }
    if (!column_exists($pdo, 'products', 'duration_minutes')) {
        $pdo->exec("ALTER TABLE products ADD COLUMN duration_minutes INT NOT NULL DEFAULT 30 AFTER image_url");
    }

    if (!table_exists($pdo, 'appointments')) {
        $pdo->exec(
            "CREATE TABLE appointments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                client_id INT NOT NULL,
                barber_id INT NOT NULL,
                service_product_id INT DEFAULT NULL,
                service_name VARCHAR(150) NOT NULL,
                appointment_date DATETIME NOT NULL,
                notes TEXT DEFAULT NULL,
                status ENUM('pending', 'confirmed', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (barber_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (service_product_id) REFERENCES products(id) ON DELETE SET NULL
            )"
        );
    }
    if (!column_exists($pdo, 'appointments', 'service_product_id')) {
        $pdo->exec("ALTER TABLE appointments ADD COLUMN service_product_id INT DEFAULT NULL AFTER barber_id");
    }

    if (!table_exists($pdo, 'conversations')) {
        $pdo->exec(
            "CREATE TABLE conversations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                conversation_type ENUM('client_barber', 'barber_admin', 'admin_user') NOT NULL,
                created_by INT NOT NULL,
                last_message_at DATETIME DEFAULT NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
            )"
        );
    }
    $pdo->exec("ALTER TABLE conversations MODIFY COLUMN conversation_type ENUM('client_barber', 'barber_admin', 'admin_user') NOT NULL");

    if (!table_exists($pdo, 'conversation_participants')) {
        $pdo->exec(
            "CREATE TABLE conversation_participants (
                conversation_id INT NOT NULL,
                user_id INT NOT NULL,
                joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (conversation_id, user_id),
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )"
        );
    }

    if (!table_exists($pdo, 'media_files')) {
        $pdo->exec(
            "CREATE TABLE media_files (
                id INT AUTO_INCREMENT PRIMARY KEY,
                uploader_id INT NOT NULL,
                file_url VARCHAR(500) NOT NULL,
                mime_type VARCHAR(100) NOT NULL,
                file_size INT NOT NULL,
                original_name VARCHAR(255) DEFAULT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE
            )"
        );
    }

    if (!table_exists($pdo, 'messages')) {
        $pdo->exec(
            "CREATE TABLE messages (
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
            )"
        );
        $pdo->exec("CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at)");
    }

    if (!table_exists($pdo, 'message_reads')) {
        $pdo->exec(
            "CREATE TABLE message_reads (
                message_id INT NOT NULL,
                user_id INT NOT NULL,
                read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (message_id, user_id),
                FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )"
        );
    }

    if (!table_exists($pdo, 'notifications')) {
        $pdo->exec(
            "CREATE TABLE notifications (
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
            )"
        );
        $pdo->exec("CREATE INDEX idx_notifications_user_read_created ON notifications(user_id, is_read, created_at)");
    }

    if (!table_exists($pdo, 'appointment_reviews')) {
        $pdo->exec(
            "CREATE TABLE appointment_reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                appointment_id INT NOT NULL,
                user_id INT NOT NULL,
                rating TINYINT NOT NULL,
                comment TEXT NOT NULL,
                is_published TINYINT(1) NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                published_at DATETIME DEFAULT NULL,
                UNIQUE KEY uniq_appointment_review (appointment_id),
                FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )"
        );
        $pdo->exec("CREATE INDEX idx_reviews_published_created ON appointment_reviews(is_published, created_at)");
    }

    if (!table_exists($pdo, 'barber_applications')) {
        $pdo->exec(
            "CREATE TABLE barber_applications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                phone VARCHAR(50) NOT NULL,
                experience_years INT NOT NULL DEFAULT 0,
                specialties TEXT NOT NULL,
                availability VARCHAR(150) NOT NULL,
                motivation TEXT NOT NULL,
                portfolio_url VARCHAR(500) DEFAULT NULL,
                status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
                submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                reviewed_at DATETIME DEFAULT NULL,
                UNIQUE KEY uniq_barber_application_user (user_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )"
        );
    }

}

ensure_schema($pdo);

$method = $_SERVER['REQUEST_METHOD'];
$request_uri = $_SERVER['REQUEST_URI'];
$action = isset($_GET['action']) ? $_GET['action'] : '';
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);
if (!is_array($input)) {
    $input = [];
}

function to_public_upload_url(string $relativePath): string
{
    return '/' . ltrim($relativePath, '/');
}

function normalize_user(array $user): array
{
    return [
        "id" => (string)$user['id'],
        "name" => $user['name'],
        "email" => $user['email'],
        "role" => $user['role'],
        "barber_approved" => isset($user['barber_approved']) ? (bool)$user['barber_approved'] : true,
        "phone" => $user['phone'] ?? '',
        "avatar_url" => $user['avatar_url'] ?? null
    ];
}

function create_user_account(PDO $pdo, string $name, string $email, string $password, string $role, int $barberApproved = 1, ?string $phone = null): array
{
    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare('INSERT INTO users (name, email, password, role, barber_approved, phone) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$name, $email, $hashedPassword, $role, $barberApproved, $phone]);

    $id = $pdo->lastInsertId();
    $user = get_user_by_id($pdo, (string)$id);
    if (!$user) {
        throw new RuntimeException('No se pudo crear el usuario');
    }

    return normalize_user($user);
}

function normalize_barber_application(array $row): array
{
    return [
        'id' => (string)$row['id'],
        'userId' => (string)$row['user_id'],
        'userName' => (string)$row['user_name'],
        'userEmail' => (string)$row['user_email'],
        'phone' => (string)$row['phone'],
        'experienceYears' => (int)$row['experience_years'],
        'specialties' => (string)$row['specialties'],
        'availability' => (string)$row['availability'],
        'motivation' => (string)$row['motivation'],
        'portfolioUrl' => $row['portfolio_url'] ?: null,
        'status' => (string)$row['status'],
        'submittedAt' => (string)$row['submitted_at'],
        'reviewedAt' => $row['reviewed_at'] ?: null,
    ];
}

function get_user_by_id(PDO $pdo, string $id): ?array
{
    $stmt = $pdo->prepare('SELECT id, name, email, role, barber_approved, phone, avatar_url FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    return $user ?: null;
}

function resolve_conversation_type(string $roleA, string $roleB): ?string
{
    $roles = [$roleA, $roleB];
    sort($roles);

    if ($roles === ['barber', 'user']) {
        return 'client_barber';
    }

    if ($roles === ['admin', 'barber']) {
        return 'barber_admin';
    }

    if ($roles === ['admin', 'user']) {
        return 'admin_user';
    }

    return null;
}

function create_notification(PDO $pdo, string $userId, string $type, string $title, string $body, array $payload): void
{
    $stmt = $pdo->prepare('INSERT INTO notifications (user_id, type, title, body, payload) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$userId, $type, $title, $body, json_encode($payload)]);
}

function admin_count(PDO $pdo): int
{
    $stmt = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
    return (int)$stmt->fetchColumn();
}

function normalize_product_category(string $category): string
{
    $normalized = strtolower(trim($category));
    if (in_array($normalized, ['barber', 'barberia', 'barbería', 'barber-shop'], true)) {
        return 'barber';
    }
    if (in_array($normalized, ['service', 'servicio', 'corte'], true)) {
        return 'service';
    }
    if (in_array($normalized, ['food', 'comida', 'menu', 'menú'], true)) {
        return 'food';
    }
    if (in_array($normalized, ['drink', 'bebida', 'bebidas'], true)) {
        return 'drink';
    }
    return 'food';
}

// --- AUTH / REGISTER ---
if ($method === 'POST' && $action === 'register') {
    $name = $input['name'];
    $email = $input['email'];
    $password = password_hash($input['password'], PASSWORD_BCRYPT);

    $requestedRole = isset($input['role']) ? $input['role'] : 'user';
    if (!in_array($requestedRole, ['user', 'barber'], true)) {
        $requestedRole = 'user';
    }

    $isBarberApplication = $requestedRole === 'barber';
    // Si se postula a barbero, inicia como cliente hasta aprobación de admin.
    $role = 'user';
    $barberApproved = $isBarberApplication ? 0 : 1;

    $stmt = $pdo->prepare('INSERT INTO users (name, email, password, role, barber_approved) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$name, $email, $password, $role, $barberApproved]);
    
    $id = $pdo->lastInsertId();

    if ($isBarberApplication) {
        $admins = $pdo->query("SELECT id FROM users WHERE role = 'admin'")->fetchAll(PDO::FETCH_COLUMN);
        foreach ($admins as $adminId) {
            create_notification(
                $pdo,
                (string)$adminId,
                'system',
                'Nueva postulación de barbero',
                $name . ' solicitó ser barbero',
                ['userId' => (string)$id]
            );
        }
    }

    echo json_encode([
        "id" => (string)$id,
        "name" => $name,
        "email" => $email,
        "role" => $role,
        "barber_approved" => (bool)$barberApproved,
        "phone" => "",
        "avatar_url" => null
    ]);
    exit;
}

// (El resto del archivo es idéntico a la versión original en la raíz)
