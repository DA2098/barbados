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

try {
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

    // --- AUTH / LOGIN ---
    if ($method === 'POST' && $action === 'login') {
        $email = $input['email'];
        $password = $input['password'];

        $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['password'])) {
            if ($user['role'] === 'barber' && (int)$user['barber_approved'] !== 1) {
                http_response_code(403);
                echo json_encode(["error" => "Tu cuenta de barbero está pendiente de aprobación por el administrador"]);
                exit;
            }
            unset($user['password']);
            echo json_encode(normalize_user($user));
        } else {
            http_response_code(401);
            echo json_encode(["error" => "Credenciales incorrectas"]);
        }
        exit;
    }

    // --- USERS ---
    if ($method === 'GET' && $action === 'users') {
        $stmt = $pdo->query('SELECT id, name, email, role, barber_approved, phone, avatar_url FROM users');
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $result = array_map('normalize_user', $users);
        echo json_encode($result);
        exit;
    }

    if ($method === 'PUT' && $action === 'user-role' && isset($_GET['id'])) {
        $targetId = (string)$_GET['id'];
        $adminId = (string)($input['adminId'] ?? '');
        $newRole = (string)($input['role'] ?? 'user');
        $barberApproved = isset($input['barber_approved']) ? (int)(bool)$input['barber_approved'] : null;
        $previousTarget = get_user_by_id($pdo, $targetId);

        $admin = get_user_by_id($pdo, $adminId);
        if (!$admin || $admin['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(["error" => "Solo un admin puede cambiar roles"]);
            exit;
        }

        if (!in_array($newRole, ['user', 'barber', 'admin'], true)) {
            http_response_code(400);
            echo json_encode(["error" => "Rol inválido"]);
            exit;
        }

        if ($newRole === 'barber') {
            $approvedFlag = $barberApproved === null ? 1 : $barberApproved;
            $stmt = $pdo->prepare('UPDATE users SET role = ?, barber_approved = ? WHERE id = ?');
            $stmt->execute([$newRole, $approvedFlag, $targetId]);
        } else {
            $stmt = $pdo->prepare('UPDATE users SET role = ?, barber_approved = 1 WHERE id = ?');
            $stmt->execute([$newRole, $targetId]);
        }

        if (table_exists($pdo, 'barber_applications')) {
            if ($newRole === 'barber' && ($barberApproved === null || $barberApproved === 1)) {
                $appStmt = $pdo->prepare("UPDATE barber_applications SET status = 'approved', reviewed_at = NOW() WHERE user_id = ?");
                $appStmt->execute([$targetId]);
            } elseif ($newRole === 'user' && $previousTarget && !(bool)$previousTarget['barber_approved']) {
                $appStmt = $pdo->prepare("UPDATE barber_applications SET status = 'rejected', reviewed_at = NOW() WHERE user_id = ?");
                $appStmt->execute([$targetId]);
            }
        }

        $updated = get_user_by_id($pdo, $targetId);
        if (!$updated) {
            http_response_code(404);
            echo json_encode(["error" => "Usuario no encontrado"]);
            exit;
        }

        if ($updated['role'] === 'barber' && (bool)$updated['barber_approved']) {
            create_notification(
                $pdo,
                (string)$updated['id'],
                'system',
                'Cuenta aprobada',
                'Tu cuenta de barbero fue aprobada por el administrador',
                ['userId' => (string)$updated['id']]
            );
        } elseif ($previousTarget && !(bool)$previousTarget['barber_approved'] && $updated['role'] === 'user') {
            create_notification(
                $pdo,
                (string)$updated['id'],
                'system',
                'Postulación no aprobada',
                'Tu postulación de barbero fue rechazada. Puedes intentarlo nuevamente más adelante.',
                ['userId' => (string)$updated['id']]
            );
        }

        echo json_encode(normalize_user($updated));
        exit;
    }

    // --- BARBER APPLICATIONS ---
    if ($method === 'POST' && $action === 'barber-applications') {
        $userId = isset($input['userId']) ? (string)$input['userId'] : '';
        $phone = trim((string)($input['phone'] ?? ''));
        $experienceYears = (int)($input['experienceYears'] ?? 0);
        $specialties = trim((string)($input['specialties'] ?? ''));
        $availability = trim((string)($input['availability'] ?? ''));
        $motivation = trim((string)($input['motivation'] ?? ''));
        $portfolioUrl = trim((string)($input['portfolioUrl'] ?? ''));

        if ($userId === '' || $phone === '' || $specialties === '' || $availability === '' || $motivation === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Completa toda la información de postulación']);
            exit;
        }

        $candidate = get_user_by_id($pdo, $userId);
        if (!$candidate) {
            http_response_code(404);
            echo json_encode(['error' => 'Usuario no encontrado']);
            exit;
        }

        $upsert = $pdo->prepare(
            'INSERT INTO barber_applications (user_id, phone, experience_years, specialties, availability, motivation, portfolio_url, status, submitted_at, reviewed_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NULL)
             ON DUPLICATE KEY UPDATE
                phone = VALUES(phone),
                experience_years = VALUES(experience_years),
                specialties = VALUES(specialties),
                availability = VALUES(availability),
                motivation = VALUES(motivation),
                portfolio_url = VALUES(portfolio_url),
                status = ?,
                submitted_at = NOW(),
                reviewed_at = NULL'
        );
        $upsert->execute([$userId, $phone, $experienceYears, $specialties, $availability, $motivation, $portfolioUrl !== '' ? $portfolioUrl : null, 'pending', 'pending']);

        $roleUpdate = $pdo->prepare('UPDATE users SET role = ?, barber_approved = 0, phone = ? WHERE id = ?');
        $roleUpdate->execute(['user', $phone, $userId]);

        $admins = $pdo->query("SELECT id FROM users WHERE role = 'admin'")->fetchAll(PDO::FETCH_COLUMN);
        foreach ($admins as $adminId) {
            create_notification(
                $pdo,
                (string)$adminId,
                'system',
                'Nueva postulación de barbero',
                $candidate['name'] . ' completó su formulario de postulación',
                ['userId' => (string)$userId]
            );
        }

        $stmt = $pdo->prepare(
            'SELECT ba.*, u.name AS user_name, u.email AS user_email
             FROM barber_applications ba
             JOIN users u ON u.id = ba.user_id
             WHERE ba.user_id = ? LIMIT 1'
        );
        $stmt->execute([$userId]);
        $application = $stmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode(normalize_barber_application($application));
        exit;
    }

    if ($method === 'GET' && $action === 'barber-applications') {
        if (isset($_GET['adminId'])) {
            $adminId = (string)$_GET['adminId'];
            $admin = get_user_by_id($pdo, $adminId);
            if (!$admin || $admin['role'] !== 'admin') {
                http_response_code(403);
                echo json_encode(['error' => 'Solo admin puede ver postulaciones']);
                exit;
            }

            $stmt = $pdo->query(
                "SELECT ba.*, u.name AS user_name, u.email AS user_email
                 FROM barber_applications ba
                 JOIN users u ON u.id = ba.user_id
                 WHERE ba.status = 'pending'
                 ORDER BY ba.submitted_at DESC"
            );
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(array_map('normalize_barber_application', $rows));
            exit;
        }

        if (isset($_GET['userId'])) {
            $userId = (string)$_GET['userId'];
            $stmt = $pdo->prepare(
                'SELECT ba.*, u.name AS user_name, u.email AS user_email
                 FROM barber_applications ba
                 JOIN users u ON u.id = ba.user_id
                 WHERE ba.user_id = ? LIMIT 1'
            );
            $stmt->execute([$userId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                http_response_code(404);
                echo json_encode(['error' => 'No hay postulación']);
                exit;
            }
            echo json_encode(normalize_barber_application($row));
            exit;
        }

        http_response_code(400);
        echo json_encode(['error' => 'Falta userId o adminId']);
        exit;
    }

    if ($method === 'DELETE' && $action === 'users' && isset($_GET['id'])) {
        $stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
        $stmt->execute([$_GET['id']]);
        echo json_encode(["message" => "Usuario eliminado"]);
        exit;
    }

    if ($method === 'PUT' && $action === 'users' && isset($_GET['id'])) {
        $id = $_GET['id'];
        $name = $input['name'] ?? '';
        $phone = isset($input['phone']) ? $input['phone'] : '';
        $hasAvatar = array_key_exists('avatar_url', $input);
        $avatarUrl = $hasAvatar ? $input['avatar_url'] : null;

        if ($name === '') {
            http_response_code(400);
            echo json_encode(["error" => "El nombre es obligatorio"]);
            exit;
        }
        
        if ($hasAvatar) {
            $stmt = $pdo->prepare('UPDATE users SET name = ?, phone = ?, avatar_url = ?, avatar_updated_at = NOW() WHERE id = ?');
            $stmt->execute([$name, $phone, $avatarUrl, $id]);
        } else {
            $stmt = $pdo->prepare('UPDATE users SET name = ?, phone = ?, avatar_updated_at = NOW() WHERE id = ?');
            $stmt->execute([$name, $phone, $id]);
        }
        
        $updated = get_user_by_id($pdo, $id);
        if (!$updated) {
            http_response_code(404);
            echo json_encode(["error" => "Usuario no encontrado"]);
            exit;
        }

        echo json_encode(normalize_user($updated));
        exit;
    }

    if ($method === 'POST' && $action === 'upload-avatar') {
        $userId = $_POST['userId'] ?? '';
        if ($userId === '' || !isset($_FILES['file'])) {
            http_response_code(400);
            echo json_encode(["error" => "Faltan campos requeridos"]);
            exit;
        }

        $file = $_FILES['file'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(["error" => "No se pudo subir la imagen"]);
            exit;
        }

        if ($file['size'] > 5 * 1024 * 1024) {
            http_response_code(400);
            echo json_encode(["error" => "La imagen no puede superar 5MB"]);
            exit;
        }

        $mime = mime_content_type($file['tmp_name']);
        $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        if (!isset($allowed[$mime])) {
            http_response_code(400);
            echo json_encode(["error" => "Formato no permitido. Usa JPG, PNG o WEBP"]);
            exit;
        }

        $dirPath = __DIR__ . '/uploads/avatars';
        if (!is_dir($dirPath)) {
            mkdir($dirPath, 0777, true);
        }

        $filename = 'avatar_' . $userId . '_' . time() . '.' . $allowed[$mime];
        $target = $dirPath . '/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $target)) {
            http_response_code(500);
            echo json_encode(["error" => "Error guardando imagen"]);
            exit;
        }

        $publicUrl = to_public_upload_url('uploads/avatars/' . $filename);
        $stmt = $pdo->prepare('UPDATE users SET avatar_url = ?, avatar_updated_at = NOW() WHERE id = ?');
        $stmt->execute([$publicUrl, $userId]);

        echo json_encode(["message" => "Avatar actualizado", "avatar_url" => $publicUrl]);
        exit;
    }

    if ($method === 'POST' && $action === 'upload-service-image') {
        $userId = $_POST['userId'] ?? '';
        if ($userId === '' || !isset($_FILES['file'])) {
            http_response_code(400);
            echo json_encode(["error" => "Faltan campos requeridos"]);
            exit;
        }

        $admin = get_user_by_id($pdo, (string)$userId);
        if (!$admin || $admin['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(["error" => "Solo el admin puede subir imágenes de servicio"]);
            exit;
        }

        $file = $_FILES['file'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(["error" => "No se pudo subir la imagen"]);
            exit;
        }

        if ($file['size'] > 8 * 1024 * 1024) {
            http_response_code(400);
            echo json_encode(["error" => "La imagen no puede superar 8MB"]);
            exit;
        }

        $mime = mime_content_type($file['tmp_name']);
        $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        if (!isset($allowed[$mime])) {
            http_response_code(400);
            echo json_encode(["error" => "Formato no permitido. Usa JPG, PNG o WEBP"]);
            exit;
        }

        $dirPath = __DIR__ . '/uploads/services';
        if (!is_dir($dirPath)) {
            mkdir($dirPath, 0777, true);
        }

        $filename = 'service_' . $userId . '_' . time() . '_' . random_int(1000, 9999) . '.' . $allowed[$mime];
        $target = $dirPath . '/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $target)) {
            http_response_code(500);
            echo json_encode(["error" => "Error guardando imagen"]);
            exit;
        }

        $publicUrl = to_public_upload_url('uploads/services/' . $filename);
        echo json_encode(['image_url' => $publicUrl]);
        exit;
    }

    // --- PRODUCTS ---
    if ($method === 'GET' && $action === 'products') {
        $category = isset($_GET['category']) ? normalize_product_category((string)$_GET['category']) : '';
        $includeHidden = isset($_GET['includeHidden']) && $_GET['includeHidden'] === '1';

        $query = 'SELECT id, name, description, price, image_url, category, is_visible, stock FROM products WHERE 1=1';
        $params = [];
        if (in_array($category, ['service', 'barber', 'food', 'drink'], true)) {
            $query .= ' AND category = ?';
            $params[] = $category;
        }
        if (!$includeHidden) {
            $query .= ' AND is_visible = 1';
        }
        $query .= ' ORDER BY id DESC';

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($products as &$p) {
            $p['id'] = (string)$p['id'];
            $p['price'] = (float)$p['price'];
            $p['stock'] = (int)$p['stock'];
            $p['is_visible'] = (bool)$p['is_visible'];
        }
        echo json_encode($products);
        exit;
    }

    if ($method === 'POST' && $action === 'products') {
        $name = $input['name'];
        $price = $input['price'];
        $stock = $input['stock'];
        $image_url = $input['image_url'] ?? '';
        $description = $input['description'] ?? '';
        $category = normalize_product_category((string)($input['category'] ?? 'food'));
        $isVisible = isset($input['is_visible']) ? (int)(bool)$input['is_visible'] : 1;

        $stmt = $pdo->prepare('INSERT INTO products (name, description, price, stock, image_url, category, is_visible) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$name, $description, $price, $stock, $image_url, $category, $isVisible]);
        echo json_encode(["message" => "Producto creado"]);
        exit;
    }

    if ($method === 'PUT' && $action === 'products' && isset($_GET['id'])) {
        $id = (string)$_GET['id'];
        $name = $input['name'] ?? '';
        $price = $input['price'] ?? 0;
        $stock = $input['stock'] ?? 0;
        $image_url = $input['image_url'] ?? '';
        $description = $input['description'] ?? '';
        $category = normalize_product_category((string)($input['category'] ?? 'food'));
        $isVisible = isset($input['is_visible']) ? (int)(bool)$input['is_visible'] : 1;

        $stmt = $pdo->prepare('UPDATE products SET name = ?, description = ?, price = ?, stock = ?, image_url = ?, category = ?, is_visible = ? WHERE id = ?');
        $stmt->execute([$name, $description, $price, $stock, $image_url, $category, $isVisible, $id]);
        echo json_encode(["message" => "Producto actualizado"]);
        exit;
    }

    if ($method === 'DELETE' && $action === 'products' && isset($_GET['id'])) {
        $stmt = $pdo->prepare('DELETE FROM products WHERE id = ?');
        $stmt->execute([$_GET['id']]);
        echo json_encode(["message" => "Producto eliminado"]);
        exit;
    }

    // --- BARBER LOGS ---
    if ($method === 'GET' && $action === 'logs') {
        $stmt = $pdo->query('SELECT l.*, u.name as barberName FROM barber_logs l JOIN users u ON l.barber_id = u.id');
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $result = [];
        foreach ($logs as $l) {
            $result[] = [
                "id" => (string)$l['id'],
                "barberId" => (string)$l['barber_id'],
                "barberName" => $l['barberName'],
                "type" => $l['category'],
                "name" => $l['item_name'],
                "price" => (float)$l['price'],
                "date" => $l['created_at']
            ];
        }
        echo json_encode($result);
        exit;
    }

    if ($method === 'POST' && $action === 'logs') {
        $barberId = $input['barberId'];
        $category = $input['type']; // 'Corte', 'Menú', 'Bebida'
        $itemName = $input['name'];
        $price = $input['price'];

        $stmt = $pdo->prepare('INSERT INTO barber_logs (barber_id, category, item_name, price) VALUES (?, ?, ?, ?)');
        $stmt->execute([$barberId, $category, $itemName, $price]);
        echo json_encode(["message" => "Log creado"]);
        exit;
    }

    // --- CHAT CONTACTS ---
    if ($method === 'GET' && $action === 'chat-contacts' && isset($_GET['userId'])) {
        $currentUser = get_user_by_id($pdo, (string)$_GET['userId']);
        if (!$currentUser) {
            http_response_code(404);
            echo json_encode(["error" => "Usuario no encontrado"]);
            exit;
        }

        $where = '';
        if ($currentUser['role'] === 'user') {
            $where = "role = 'barber' AND barber_approved = 1";
        } elseif ($currentUser['role'] === 'barber') {
            $where = "(role = 'user') OR (role = 'admin')";
        } elseif ($currentUser['role'] === 'admin') {
            $where = "(role = 'barber') OR (role = 'user')";
        } else {
            $where = '1 = 0';
        }

        $stmt = $pdo->prepare("SELECT id, name, email, role, barber_approved, phone, avatar_url FROM users WHERE ({$where}) AND id <> ? ORDER BY name ASC");
        $stmt->execute([(string)$currentUser['id']]);
        $contacts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(array_map('normalize_user', $contacts));
        exit;
    }

    // --- APPOINTMENTS ---
    if ($method === 'POST' && in_array($action, ['appointments', 'appointment', 'agendar-cita'], true)) {
        $clientId = isset($input['userId']) && is_scalar($input['userId']) ? (string)$input['userId'] : '';
        $barberId = isset($input['barberId']) && is_scalar($input['barberId']) ? (string)$input['barberId'] : '';
        $serviceId = isset($input['serviceId']) && is_scalar($input['serviceId']) ? trim((string)$input['serviceId']) : '';
        $serviceName = isset($input['serviceName']) && is_scalar($input['serviceName']) ? trim((string)$input['serviceName']) : '';
        $appointmentDate = isset($input['appointmentDate']) && is_scalar($input['appointmentDate']) ? trim((string)$input['appointmentDate']) : '';
        $notes = isset($input['notes']) && is_scalar($input['notes']) ? trim((string)$input['notes']) : '';

        if ($clientId === '' || $barberId === '' || $appointmentDate === '' || ($serviceId === '' && $serviceName === '')) {
            http_response_code(400);
            echo json_encode(["error" => "Faltan campos requeridos para agendar"]);
            exit;
        }

        $client = get_user_by_id($pdo, $clientId);
        $barber = get_user_by_id($pdo, $barberId);
        if (!$client || !$barber) {
            http_response_code(404);
            echo json_encode(["error" => "Usuario o barbero no encontrado"]);
            exit;
        }

        if ($client['role'] !== 'user') {
            http_response_code(403);
            echo json_encode(["error" => "Solo clientes pueden agendar citas"]);
            exit;
        }
        if ($barber['role'] !== 'barber' || !(bool)$barber['barber_approved']) {
            http_response_code(403);
            echo json_encode(["error" => "El barbero seleccionado no está disponible"]);
            exit;
        }

        $service = null;
        if ($serviceId !== '') {
            $serviceStmt = $pdo->prepare('SELECT id, name FROM products WHERE id = ? AND category = ? AND is_visible = 1 LIMIT 1');
            $serviceStmt->execute([$serviceId, 'service']);
            $service = $serviceStmt->fetch(PDO::FETCH_ASSOC);
        } else {
            $serviceStmt = $pdo->prepare('SELECT id, name FROM products WHERE name = ? AND category = ? AND is_visible = 1 ORDER BY id DESC LIMIT 1');
            $serviceStmt->execute([$serviceName, 'service']);
            $service = $serviceStmt->fetch(PDO::FETCH_ASSOC);
        }

        if (!$service) {
            http_response_code(404);
            echo json_encode(["error" => "El servicio seleccionado no está disponible"]);
            exit;
        }

        $stmt = $pdo->prepare('INSERT INTO appointments (client_id, barber_id, service_product_id, service_name, appointment_date, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$clientId, $barberId, (string)$service['id'], $service['name'], $appointmentDate, $notes !== '' ? $notes : null, 'pending']);
        $appointmentId = (string)$pdo->lastInsertId();

        create_notification(
            $pdo,
            (string)$barber['id'],
            'system',
            'Nueva cita agendada',
            $client['name'] . ' agendó ' . $service['name'] . ' para ' . $appointmentDate,
            ['appointmentId' => $appointmentId, 'clientId' => (string)$client['id']]
        );

        // Asegura un chat entre cliente y barbero, y deja un mensaje inicial al agendar.
        $conversationStmt = $pdo->prepare(
            'SELECT c.id
             FROM conversations c
             JOIN conversation_participants cp ON cp.conversation_id = c.id
             WHERE cp.user_id IN (?, ?) AND c.conversation_type = ?
             GROUP BY c.id
             HAVING COUNT(DISTINCT cp.user_id) = 2
             ORDER BY c.id DESC
             LIMIT 1'
        );
        $conversationStmt->execute([$clientId, $barberId, 'client_barber']);
        $conversationId = $conversationStmt->fetchColumn();

        if (!$conversationId) {
            $createConversation = $pdo->prepare('INSERT INTO conversations (conversation_type, created_by) VALUES (?, ?)');
            $createConversation->execute(['client_barber', $clientId]);
            $conversationId = (string)$pdo->lastInsertId();

            $addParticipant = $pdo->prepare('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)');
            $addParticipant->execute([$conversationId, $clientId]);
            $addParticipant->execute([$conversationId, $barberId]);
        }

        $autoBody = 'Hola ' . $barber['name'] . ', agendé el servicio "' . $service['name'] . '" para ' . $appointmentDate . '.';
        $insertAutoMessage = $pdo->prepare('INSERT INTO messages (conversation_id, sender_id, message_type, body, media_id) VALUES (?, ?, ?, ?, NULL)');
        $insertAutoMessage->execute([$conversationId, $clientId, 'text', $autoBody]);
        $autoMessageId = (string)$pdo->lastInsertId();

        $updateConversation = $pdo->prepare('UPDATE conversations SET last_message_at = NOW() WHERE id = ?');
        $updateConversation->execute([$conversationId]);

        create_notification(
            $pdo,
            (string)$barber['id'],
            'new_message',
            'Nuevo mensaje en chat',
            $client['name'] . ' inició conversación por una cita agendada',
            ['conversationId' => (string)$conversationId, 'messageId' => $autoMessageId, 'appointmentId' => $appointmentId]
        );

        echo json_encode(["message" => "Cita agendada"]);
        exit;
    }

    if ($method === 'GET' && in_array($action, ['appointments', 'appointment', 'agendar-cita'], true) && isset($_GET['userId'])) {
        $userId = (string)$_GET['userId'];
        $currentUser = get_user_by_id($pdo, $userId);
        if (!$currentUser) {
            http_response_code(404);
            echo json_encode(["error" => "Usuario no encontrado"]);
            exit;
        }

         $query = 'SELECT a.id, a.client_id, a.barber_id, a.service_product_id, a.service_name, a.appointment_date, a.notes, a.status, a.created_at,
                    sp.image_url AS service_image_url, sp.description AS service_description,
                         cu.name AS client_name, bu.name AS barber_name
                  FROM appointments a
                LEFT JOIN products sp ON sp.id = a.service_product_id
                  JOIN users cu ON cu.id = a.client_id
                  JOIN users bu ON bu.id = a.barber_id';

        $params = [];
        if ($currentUser['role'] === 'user') {
            $query .= ' WHERE a.client_id = ?';
            $params[] = $userId;
        } elseif ($currentUser['role'] === 'barber') {
            $query .= ' WHERE a.barber_id = ?';
            $params[] = $userId;
        }

        $query .= ' ORDER BY a.appointment_date DESC';
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $result = [];
        foreach ($appointments as $a) {
            $result[] = [
                'id' => (string)$a['id'],
                'clientId' => (string)$a['client_id'],
                'clientName' => $a['client_name'],
                'barberId' => (string)$a['barber_id'],
                'barberName' => $a['barber_name'],
                'serviceId' => $a['service_product_id'] !== null ? (string)$a['service_product_id'] : null,
                'serviceName' => $a['service_name'],
                'serviceImageUrl' => $a['service_image_url'] ?: null,
                'serviceDescription' => $a['service_description'] ?: null,
                'appointmentDate' => $a['appointment_date'],
                'notes' => $a['notes'],
                'status' => $a['status'],
                'createdAt' => $a['created_at']
            ];
        }

        echo json_encode($result);
        exit;
    }

    if ($method === 'PUT' && in_array($action, ['appointments', 'appointment', 'agendar-cita'], true) && isset($_GET['id'])) {
        $appointmentId = (string)$_GET['id'];
        $actorId = (string)($input['actorId'] ?? '');
        $status = strtolower(trim((string)($input['status'] ?? '')));

        if ($appointmentId === '' || $actorId === '' || !in_array($status, ['pending', 'confirmed', 'completed', 'cancelled'], true)) {
            http_response_code(400);
            echo json_encode(["error" => "Datos inválidos para actualizar cita"]);
            exit;
        }

        $actor = get_user_by_id($pdo, $actorId);
        if (!$actor) {
            http_response_code(404);
            echo json_encode(["error" => "Usuario no encontrado"]);
            exit;
        }

        $stmt = $pdo->prepare('SELECT id, barber_id FROM appointments WHERE id = ? LIMIT 1');
        $stmt->execute([$appointmentId]);
        $appointment = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$appointment) {
            http_response_code(404);
            echo json_encode(["error" => "Cita no encontrada"]);
            exit;
        }

        $isAdmin = $actor['role'] === 'admin';
        $isAssignedBarber = $actor['role'] === 'barber' && (string)$appointment['barber_id'] === (string)$actor['id'];
        if (!$isAdmin && !$isAssignedBarber) {
            http_response_code(403);
            echo json_encode(["error" => "No tienes permisos para actualizar esta cita"]);
            exit;
        }

        $update = $pdo->prepare('UPDATE appointments SET status = ? WHERE id = ?');
        $update->execute([$status, $appointmentId]);

        echo json_encode(["message" => "Estado de cita actualizado"]);
        exit;
    }

    if ($method === 'DELETE' && in_array($action, ['appointments', 'appointment', 'agendar-cita'], true) && isset($_GET['id'])) {
        $appointmentId = (string)$_GET['id'];
        $actorId = isset($input['actorId']) && is_scalar($input['actorId']) ? (string)$input['actorId'] : (string)($_GET['actorId'] ?? '');

        if ($appointmentId === '' || $actorId === '') {
            http_response_code(400);
            echo json_encode(["error" => "Faltan datos para eliminar la cita"]);
            exit;
        }

        $actor = get_user_by_id($pdo, $actorId);
        if (!$actor) {
            http_response_code(404);
            echo json_encode(["error" => "Usuario no encontrado"]);
            exit;
        }

        $stmt = $pdo->prepare('SELECT id, client_id, barber_id, service_name, appointment_date FROM appointments WHERE id = ? LIMIT 1');
        $stmt->execute([$appointmentId]);
        $appointment = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$appointment) {
            http_response_code(404);
            echo json_encode(["error" => "Cita no encontrada"]);
            exit;
        }

        $isAdmin = $actor['role'] === 'admin';
        $isOwner = $actor['role'] === 'user' && (string)$appointment['client_id'] === (string)$actor['id'];
        $isAssignedBarber = $actor['role'] === 'barber' && (string)$appointment['barber_id'] === (string)$actor['id'];
        if (!$isAdmin && !$isOwner && !$isAssignedBarber) {
            http_response_code(403);
            echo json_encode(["error" => "No tienes permisos para eliminar esta cita"]);
            exit;
        }

        $delete = $pdo->prepare('DELETE FROM appointments WHERE id = ?');
        $delete->execute([$appointmentId]);

        $notifyBarberId = (string)$appointment['barber_id'];
        create_notification(
            $pdo,
            $notifyBarberId,
            'system',
            'Cita eliminada',
            'Se eliminó la cita de ' . $appointment['service_name'] . ' programada para ' . $appointment['appointment_date'],
            ['appointmentId' => $appointmentId, 'deletedBy' => (string)$actor['id']]
        );

        echo json_encode(["message" => "Cita eliminada"]);
        exit;
    }

    // --- APPOINTMENT REVIEWS ---
    if ($method === 'POST' && $action === 'appointment-reviews') {
        $appointmentId = (string)($input['appointmentId'] ?? '');
        $userId = (string)($input['userId'] ?? '');
        $rating = (int)($input['rating'] ?? 0);
        $comment = trim((string)($input['comment'] ?? ''));

        if ($appointmentId === '' || $userId === '' || $rating < 1 || $rating > 5 || $comment === '') {
            http_response_code(400);
            echo json_encode(["error" => "Datos inválidos para calificar"]);
            exit;
        }

        $user = get_user_by_id($pdo, $userId);
        if (!$user || $user['role'] !== 'user') {
            http_response_code(403);
            echo json_encode(["error" => "Solo clientes pueden calificar"]);
            exit;
        }

        $stmt = $pdo->prepare('SELECT id, client_id, status FROM appointments WHERE id = ? LIMIT 1');
        $stmt->execute([$appointmentId]);
        $appointment = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$appointment) {
            http_response_code(404);
            echo json_encode(["error" => "Cita no encontrada"]);
            exit;
        }

        if ((string)$appointment['client_id'] !== $userId) {
            http_response_code(403);
            echo json_encode(["error" => "No puedes calificar una cita que no es tuya"]);
            exit;
        }

        if ($appointment['status'] !== 'completed') {
            http_response_code(400);
            echo json_encode(["error" => "Solo puedes calificar citas completadas"]);
            exit;
        }

        $existing = $pdo->prepare('SELECT id FROM appointment_reviews WHERE appointment_id = ? LIMIT 1');
        $existing->execute([$appointmentId]);
        if ($existing->fetchColumn()) {
            http_response_code(409);
            echo json_encode(["error" => "Esta cita ya fue calificada"]);
            exit;
        }

        $insert = $pdo->prepare('INSERT INTO appointment_reviews (appointment_id, user_id, rating, comment) VALUES (?, ?, ?, ?)');
        $insert->execute([$appointmentId, $userId, $rating, $comment]);

        $admins = $pdo->query("SELECT id FROM users WHERE role = 'admin'")->fetchAll(PDO::FETCH_COLUMN);
        foreach ($admins as $adminId) {
            create_notification(
                $pdo,
                (string)$adminId,
                'system',
                'Nueva calificación recibida',
                $user['name'] . ' dejó una opinión de ' . $rating . '/5',
                ['appointmentId' => $appointmentId]
            );
        }

        echo json_encode(["message" => "Calificación enviada"]);
        exit;
    }

    if ($method === 'GET' && $action === 'appointment-reviews') {
        $publishedOnly = isset($_GET['published']) && $_GET['published'] === '1';
        $userId = isset($_GET['userId']) ? (string)$_GET['userId'] : '';

        if ($publishedOnly) {
            $stmt = $pdo->query(
                "SELECT ar.id, ar.appointment_id, ar.user_id, ar.rating, ar.comment, ar.is_published, ar.created_at, ar.published_at,
                        u.name AS user_name, a.service_name
                 FROM appointment_reviews ar
                 JOIN users u ON u.id = ar.user_id
                 JOIN appointments a ON a.id = ar.appointment_id
                 WHERE ar.is_published = 1
                 ORDER BY ar.published_at DESC, ar.created_at DESC
                 LIMIT 8"
            );
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            if ($userId === '') {
                http_response_code(400);
                echo json_encode(["error" => "Falta userId para consultar reseñas"]);
                exit;
            }

            $currentUser = get_user_by_id($pdo, $userId);
            if (!$currentUser) {
                http_response_code(404);
                echo json_encode(["error" => "Usuario no encontrado"]);
                exit;
            }

            $baseQuery =
                "SELECT ar.id, ar.appointment_id, ar.user_id, ar.rating, ar.comment, ar.is_published, ar.created_at, ar.published_at,
                        u.name AS user_name, a.service_name
                 FROM appointment_reviews ar
                 JOIN users u ON u.id = ar.user_id
                 JOIN appointments a ON a.id = ar.appointment_id";

            $params = [];
            if ($currentUser['role'] === 'admin') {
                $query = $baseQuery . ' ORDER BY ar.created_at DESC';
            } else {
                $query = $baseQuery . ' WHERE ar.user_id = ? ORDER BY ar.created_at DESC';
                $params[] = $userId;
            }

            $stmt = $pdo->prepare($query);
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        $result = [];
        foreach ($rows as $r) {
            $result[] = [
                'id' => (string)$r['id'],
                'appointmentId' => (string)$r['appointment_id'],
                'userId' => (string)$r['user_id'],
                'userName' => $r['user_name'],
                'serviceName' => $r['service_name'],
                'rating' => (int)$r['rating'],
                'comment' => $r['comment'],
                'isPublished' => (bool)$r['is_published'],
                'createdAt' => $r['created_at'],
                'publishedAt' => $r['published_at']
            ];
        }

        echo json_encode($result);
        exit;
    }

    if ($method === 'PUT' && $action === 'appointment-reviews' && isset($_GET['id'])) {
        $reviewId = (string)$_GET['id'];
        $actorId = (string)($input['actorId'] ?? '');
        $isPublished = isset($input['isPublished']) ? (int)(bool)$input['isPublished'] : 0;

        $actor = get_user_by_id($pdo, $actorId);
        if (!$actor || $actor['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(["error" => "Solo el admin puede publicar u ocultar reseñas"]);
            exit;
        }

        $stmt = $pdo->prepare('UPDATE appointment_reviews SET is_published = ?, published_at = CASE WHEN ? = 1 THEN NOW() ELSE NULL END WHERE id = ?');
        $stmt->execute([$isPublished, $isPublished, $reviewId]);

        echo json_encode(["message" => "Publicación de reseña actualizada"]);
        exit;
    }

    if ($method === 'DELETE' && $action === 'appointment-reviews' && isset($_GET['id']) && isset($_GET['actorId'])) {
        $reviewId = (string)$_GET['id'];
        $actorId = (string)$_GET['actorId'];

        $actor = get_user_by_id($pdo, $actorId);
        if (!$actor || $actor['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(["error" => "Solo el admin puede eliminar reseñas"]);
            exit;
        }

        $stmt = $pdo->prepare('DELETE FROM appointment_reviews WHERE id = ?');
        $stmt->execute([$reviewId]);

        echo json_encode(["message" => "Reseña eliminada"]);
        exit;
    }

    // --- CONVERSATIONS ---
    if ($method === 'POST' && $action === 'conversations') {
        $requesterId = (string)($input['requesterId'] ?? '');
        $peerId = (string)($input['peerId'] ?? '');

        $requester = get_user_by_id($pdo, $requesterId);
        $peer = get_user_by_id($pdo, $peerId);
        if (!$requester || !$peer) {
            http_response_code(404);
            echo json_encode(["error" => "Usuarios no encontrados"]);
            exit;
        }

        $conversationType = resolve_conversation_type($requester['role'], $peer['role']);
        if ($conversationType === null) {
            http_response_code(403);
            echo json_encode(["error" => "No se permite chat entre estos roles"]);
            exit;
        }

        $stmt = $pdo->prepare(
            'SELECT c.id, c.conversation_type, c.last_message_at, c.created_at
             FROM conversations c
             JOIN conversation_participants cp ON cp.conversation_id = c.id
             WHERE cp.user_id IN (?, ?) AND c.conversation_type = ?
             GROUP BY c.id
             HAVING COUNT(DISTINCT cp.user_id) = 2
             ORDER BY c.id DESC
             LIMIT 1'
        );
        $stmt->execute([$requesterId, $peerId, $conversationType]);
        $conversation = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$conversation) {
            $insertConversation = $pdo->prepare('INSERT INTO conversations (conversation_type, created_by) VALUES (?, ?)');
            $insertConversation->execute([$conversationType, $requesterId]);
            $conversationId = (int)$pdo->lastInsertId();

            $insertParticipant = $pdo->prepare('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)');
            $insertParticipant->execute([$conversationId, $requesterId]);
            $insertParticipant->execute([$conversationId, $peerId]);

            $conversation = [
                'id' => (string)$conversationId,
                'conversation_type' => $conversationType,
                'last_message_at' => null,
                'created_at' => date('Y-m-d H:i:s')
            ];
        }

        $conversation['id'] = (string)$conversation['id'];
        echo json_encode($conversation);
        exit;
    }

    if ($method === 'DELETE' && $action === 'conversations' && isset($_GET['id'])) {
        $conversationId = (string)$_GET['id'];
        $actorId = isset($input['actorId']) && is_scalar($input['actorId']) ? (string)$input['actorId'] : (string)($_GET['actorId'] ?? '');

        if ($conversationId === '' || $actorId === '') {
            http_response_code(400);
            echo json_encode(["error" => "Faltan datos para eliminar la conversación"]);
            exit;
        }

        $actor = get_user_by_id($pdo, $actorId);
        if (!$actor) {
            http_response_code(404);
            echo json_encode(["error" => "Usuario no encontrado"]);
            exit;
        }

        $stmt = $pdo->prepare('SELECT conversation_type FROM conversations WHERE id = ? LIMIT 1');
        $stmt->execute([$conversationId]);
        $conversationType = $stmt->fetchColumn();
        if (!$conversationType) {
            http_response_code(404);
            echo json_encode(["error" => "Conversación no encontrada"]);
            exit;
        }

        $participantStmt = $pdo->prepare('SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ? LIMIT 1');
        $participantStmt->execute([$conversationId, $actorId]);
        $isParticipant = (bool)$participantStmt->fetchColumn();
        $isAdmin = $actor['role'] === 'admin';

        if (!$isAdmin && !$isParticipant) {
            http_response_code(403);
            echo json_encode(["error" => "No tienes permisos para eliminar esta conversación"]);
            exit;
        }

        $delete = $pdo->prepare('DELETE FROM conversations WHERE id = ?');
        $delete->execute([$conversationId]);

        echo json_encode(["message" => "Conversación eliminada"]);
        exit;
    }

    // --- MESSAGES ---
    if ($method === 'GET' && $action === 'messages' && isset($_GET['conversationId']) && isset($_GET['userId'])) {
        $conversationId = (string)$_GET['conversationId'];
        $userId = (string)$_GET['userId'];

        $stmt = $pdo->prepare('SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ? LIMIT 1');
        $stmt->execute([$conversationId, $userId]);
        if (!$stmt->fetchColumn()) {
            http_response_code(403);
            echo json_encode(["error" => "No autorizado para ver esta conversación"]);
            exit;
        }

        $stmt = $pdo->prepare(
            'SELECT m.id, m.conversation_id, m.sender_id, m.message_type, m.body, m.created_at,
                    mf.file_url, u.name AS sender_name, u.avatar_url AS sender_avatar
             FROM messages m
             JOIN users u ON u.id = m.sender_id
             LEFT JOIN media_files mf ON mf.id = m.media_id
             WHERE m.conversation_id = ? AND m.is_deleted = 0
             ORDER BY m.created_at ASC'
        );
        $stmt->execute([$conversationId]);
        $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $result = [];
        foreach ($messages as $m) {
            $result[] = [
                'id' => (string)$m['id'],
                'conversationId' => (string)$m['conversation_id'],
                'senderId' => (string)$m['sender_id'],
                'senderName' => $m['sender_name'],
                'senderAvatar' => $m['sender_avatar'],
                'messageType' => $m['message_type'],
                'body' => $m['body'],
                'imageUrl' => $m['file_url'] ?: null,
                'createdAt' => $m['created_at']
            ];
        }

        echo json_encode($result);
        exit;
    }

    if ($method === 'POST' && $action === 'upload-chat-media') {
        $userId = $_POST['userId'] ?? '';
        if ($userId === '' || !isset($_FILES['file'])) {
            http_response_code(400);
            echo json_encode(["error" => "Faltan campos requeridos"]);
            exit;
        }

        $file = $_FILES['file'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(["error" => "No se pudo subir la imagen"]);
            exit;
        }

        if ($file['size'] > 8 * 1024 * 1024) {
            http_response_code(400);
            echo json_encode(["error" => "La imagen no puede superar 8MB"]);
            exit;
        }

        $mime = mime_content_type($file['tmp_name']);
        $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        if (!isset($allowed[$mime])) {
            http_response_code(400);
            echo json_encode(["error" => "Formato no permitido. Usa JPG, PNG o WEBP"]);
            exit;
        }

        $dirPath = __DIR__ . '/uploads/chat';
        if (!is_dir($dirPath)) {
            mkdir($dirPath, 0777, true);
        }

        $filename = 'chat_' . $userId . '_' . time() . '_' . random_int(1000, 9999) . '.' . $allowed[$mime];
        $target = $dirPath . '/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $target)) {
            http_response_code(500);
            echo json_encode(["error" => "Error guardando imagen"]);
            exit;
        }

        $publicUrl = to_public_upload_url('uploads/chat/' . $filename);
        $stmt = $pdo->prepare('INSERT INTO media_files (uploader_id, file_url, mime_type, file_size, original_name) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$userId, $publicUrl, $mime, (int)$file['size'], $file['name']]);

        echo json_encode([
            'mediaId' => (string)$pdo->lastInsertId(),
            'imageUrl' => $publicUrl
        ]);
        exit;
    }

    if ($method === 'POST' && $action === 'messages') {
        $conversationId = (string)($input['conversationId'] ?? '');
        $senderId = (string)($input['senderId'] ?? '');
        $messageType = (string)($input['messageType'] ?? 'text');
        $body = isset($input['body']) ? trim((string)$input['body']) : null;
        $mediaId = isset($input['mediaId']) ? (string)$input['mediaId'] : null;

        if ($conversationId === '' || $senderId === '') {
            http_response_code(400);
            echo json_encode(["error" => "Faltan campos requeridos"]);
            exit;
        }

        $stmt = $pdo->prepare('SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ? LIMIT 1');
        $stmt->execute([$conversationId, $senderId]);
        if (!$stmt->fetchColumn()) {
            http_response_code(403);
            echo json_encode(["error" => "No autorizado para enviar mensajes"]);
            exit;
        }

        if ($messageType === 'text' && ($body === null || $body === '')) {
            http_response_code(400);
            echo json_encode(["error" => "El mensaje no puede estar vacío"]);
            exit;
        }

        if ($messageType === 'image' && ($mediaId === null || $mediaId === '')) {
            http_response_code(400);
            echo json_encode(["error" => "La imagen es obligatoria para este tipo de mensaje"]);
            exit;
        }

        $stmt = $pdo->prepare('INSERT INTO messages (conversation_id, sender_id, message_type, body, media_id) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$conversationId, $senderId, $messageType, $body, $mediaId]);
        $messageId = (string)$pdo->lastInsertId();

        $updateConversation = $pdo->prepare('UPDATE conversations SET last_message_at = NOW() WHERE id = ?');
        $updateConversation->execute([$conversationId]);

        $sender = get_user_by_id($pdo, $senderId);
        $notifType = $messageType === 'image' ? 'new_image' : 'new_message';
        $notifBody = $messageType === 'image' ? (($sender['name'] ?? 'Alguien') . ' envió una imagen') : (($sender['name'] ?? 'Alguien') . ': ' . mb_substr((string)$body, 0, 120));

        $participants = $pdo->prepare('SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND user_id <> ?');
        $participants->execute([$conversationId, $senderId]);
        $others = $participants->fetchAll(PDO::FETCH_COLUMN);

        foreach ($others as $recipientId) {
            create_notification(
                $pdo,
                (string)$recipientId,
                $notifType,
                'Nuevo mensaje',
                $notifBody,
                ['conversationId' => (string)$conversationId, 'messageId' => $messageId]
            );
        }

        echo json_encode(["message" => "Mensaje enviado", "id" => $messageId]);
        exit;
    }

    // --- NOTIFICATIONS ---
    if ($method === 'GET' && $action === 'notifications' && isset($_GET['userId'])) {
        $userId = (string)$_GET['userId'];
        $stmt = $pdo->prepare('SELECT id, type, title, body, payload, is_read, created_at, read_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100');
        $stmt->execute([$userId]);
        $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $countStmt = $pdo->prepare('SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0');
        $countStmt->execute([$userId]);
        $unreadCount = (int)$countStmt->fetchColumn();

        $result = [];
        foreach ($notifications as $n) {
            $result[] = [
                'id' => (string)$n['id'],
                'type' => $n['type'],
                'title' => $n['title'],
                'body' => $n['body'],
                'payload' => $n['payload'] ? json_decode((string)$n['payload'], true) : null,
                'isRead' => (bool)$n['is_read'],
                'createdAt' => $n['created_at'],
                'readAt' => $n['read_at']
            ];
        }

        echo json_encode(['unreadCount' => $unreadCount, 'items' => $result]);
        exit;
    }

    if ($method === 'PUT' && $action === 'notifications' && isset($_GET['userId'])) {
        $userId = (string)$_GET['userId'];
        $markAll = (bool)($input['markAll'] ?? false);

        if ($markAll) {
            $stmt = $pdo->prepare('UPDATE notifications SET is_read = 1, read_at = NOW() WHERE user_id = ? AND is_read = 0');
            $stmt->execute([$userId]);
            echo json_encode(["message" => "Notificaciones marcadas como leídas"]);
            exit;
        }

        $notificationId = isset($_GET['id']) ? (string)$_GET['id'] : '';
        if ($notificationId === '') {
            http_response_code(400);
            echo json_encode(["error" => "Falta id de notificación"]);
            exit;
        }

        $stmt = $pdo->prepare('UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ? AND user_id = ?');
        $stmt->execute([$notificationId, $userId]);
        echo json_encode(["message" => "Notificación leída"]);
        exit;
    }

    // --- REALTIME (SSE) ---
    if ($method === 'GET' && $action === 'realtime' && isset($_GET['userId'])) {
        $userId = (string)$_GET['userId'];
        $currentUser = get_user_by_id($pdo, $userId);
        if (!$currentUser) {
            http_response_code(404);
            echo json_encode(["error" => "Usuario no encontrado"]);
            exit;
        }

        header('Content-Type: text/event-stream');
        header('Cache-Control: no-cache, no-transform');
        header('Connection: keep-alive');
        header('X-Accel-Buffering: no');

        @ini_set('output_buffering', 'off');
        @ini_set('zlib.output_compression', '0');
        while (ob_get_level() > 0) {
            ob_end_flush();
        }

        ignore_user_abort(true);
        set_time_limit(0);

        $lastSignature = isset($_GET['last']) ? (string)$_GET['last'] : '';
        $ticks = 0;

        while (!connection_aborted() && $ticks < 40) {
            $ticks++;

            $countStmt = $pdo->prepare('SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0');
            $countStmt->execute([$userId]);
            $unreadCount = (int)$countStmt->fetchColumn();

            $conversationStmt = $pdo->prepare(
                'SELECT COALESCE(MAX(UNIX_TIMESTAMP(c.last_message_at)), 0)
                 FROM conversations c
                 JOIN conversation_participants cp ON cp.conversation_id = c.id
                 WHERE cp.user_id = ?'
            );
            $conversationStmt->execute([$userId]);
            $latestConversationTs = (int)$conversationStmt->fetchColumn();

            $avatarStmt = $pdo->query('SELECT COALESCE(MAX(UNIX_TIMESTAMP(avatar_updated_at)), 0) FROM users');
            $avatarPulse = (int)$avatarStmt->fetchColumn();

            $signature = $unreadCount . '|' . $latestConversationTs . '|' . $avatarPulse;

            if ($signature !== $lastSignature) {
                $payload = [
                    'unreadCount' => $unreadCount,
                    'latestConversationTs' => $latestConversationTs,
                    'avatarPulse' => $avatarPulse,
                    'signature' => $signature,
                    'serverTime' => date('c')
                ];

                echo "event: sync\n";
                echo 'data: ' . json_encode($payload) . "\n\n";
                $lastSignature = $signature;
            } elseif ($ticks % 10 === 0) {
                echo "event: heartbeat\n";
                echo "data: {\"ok\":true}\n\n";
            }

            @ob_flush();
            @flush();
            usleep(1000000);
        }

        exit;
    }

    // Ruta por defecto si no coincide nada
    http_response_code(404);
    echo json_encode(["error" => "Endpoint no encontrado"]);

} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Error interno: " . $e->getMessage()]);
}
?>
