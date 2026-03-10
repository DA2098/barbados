<?php

declare(strict_types=1);

// Suprimir warnings HTML y convertirlos en excepciones
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

set_error_handler(function ($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

set_exception_handler(function (Throwable $e) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'message' => 'Error interno del servidor.',
        'error' => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
    exit;
});

$config = require __DIR__ . '/config.php';
require __DIR__ . '/Database.php';
require __DIR__ . '/helpers.php';

try {
    $database = new Database($config);
    $pdo = $database->pdo();
} catch (Throwable $exception) {
    respond([
        'ok' => false,
        'message' => 'No se pudo conectar a la base de datos.',
        'error' => $exception->getMessage(),
    ], 500);
}


$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
$segments = array_values(array_filter(explode('/', trim($uri, '/'))));
$input = json_input();

// Endpoint de salud para Render y frontend
if ($segments[0] === 'api' && ($segments[1] ?? null) === 'health') {
    header('Content-Type: application/json');
    echo json_encode(['ok' => true, 'data' => ['status' => 'ok']]);
    exit;
}

if (($segments[0] ?? null) === 'uploads') {
    $file = basename((string) ($segments[1] ?? ''));
    $path = __DIR__ . '/uploads/' . $file;

    if ($file === '' || !is_file($path)) {
        http_response_code(404);
        echo 'Archivo no encontrado';
        exit;
    }

    $mime = mime_content_type($path) ?: 'application/octet-stream';
    header('Content-Type: ' . $mime);
    header('Content-Length: ' . (string) filesize($path));
    readfile($path);
    exit;
}

if (($segments[0] ?? null) !== 'api') {
    respond([
        'ok' => true,
        'message' => 'BarberPro 360 API funcionando.',
    ]);
}

$resource = $segments[1] ?? null;
$id = $segments[2] ?? null;
$action = $segments[3] ?? null;

function fetch_all(PDO $pdo, string $sql, array $params = []): array
{
    $statement = $pdo->prepare($sql);
    $statement->execute($params);
    return $statement->fetchAll();
}

function fetch_one(PDO $pdo, string $sql, array $params = []): ?array
{
    $statement = $pdo->prepare($sql);
    $statement->execute($params);
    $row = $statement->fetch();
    return $row ?: null;
}

function execute_statement(PDO $pdo, string $sql, array $params = []): void
{
    $statement = $pdo->prepare($sql);
    $statement->execute($params);
}

function api_user(array $row): array
{
    return [
        'id' => $row['id'],
        'name' => $row['full_name'],
        'role' => $row['role'],
        'email' => $row['email'],
        'phone' => $row['phone'],
        'active' => (bool) $row['is_active'],
        'approved' => (bool) $row['is_approved'],
        'avatar' => $row['avatar_url'],
        'created_at' => $row['created_at'] ?? null,
    ];
}

function user_exists(PDO $pdo, string $userId): bool
{
    return (bool) fetch_one($pdo, 'SELECT id FROM users WHERE id = :id', [':id' => $userId]);
}

function first_admin_id(PDO $pdo): ?string
{
    $admin = fetch_one($pdo, "SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1");
    return $admin['id'] ?? null;
}

function notify(PDO $pdo, string $userId, string $title, string $body, string $type = 'info'): void
{
    if ($userId === '' || !user_exists($pdo, $userId)) {
        return;
    }

    execute_statement(
        $pdo,
        'INSERT INTO notifications (id, user_id, title, body, type, is_read, created_at) VALUES (:id, :user_id, :title, :body, :type, false, NOW())',
        [
            ':id' => uuid_like('ntf'),
            ':user_id' => $userId,
            ':title' => $title,
            ':body' => $body,
            ':type' => $type,
        ]
    );
}

function conversation_with_messages(PDO $pdo, string $conversationId): ?array
{
    $conversation = fetch_one(
        $pdo,
        'SELECT id, appointment_id, barber_id, client_id, title, is_active AS active, created_at, updated_at
         FROM conversations
         WHERE id = :id',
        [':id' => $conversationId]
    );

    if (!$conversation) {
        return null;
    }

    $conversation['messages'] = fetch_all(
        $pdo,
        'SELECT id, sender_id, message_type AS kind, body AS text, media_url, media_name, media_duration AS duration, created_at
         FROM messages
         WHERE conversation_id = :id
         ORDER BY created_at ASC',
        [':id' => $conversationId]
    );

    return $conversation;
}

function account_profile(PDO $pdo, string $userId): ?array
{
    $user = fetch_one($pdo, 'SELECT * FROM users WHERE id = :id', [':id' => $userId]);
    if (!$user) {
        return null;
    }

    $appointments = fetch_all(
        $pdo,
        'SELECT id, client_id, barber_id, service_id, appointment_date AS date, notes, status, created_at
         FROM appointments
         WHERE client_id = :id OR barber_id = :id
         ORDER BY appointment_date DESC',
        [':id' => $userId]
    );

    $notifications = fetch_all(
        $pdo,
        'SELECT id, user_id, title, body, type, is_read AS read, created_at
         FROM notifications
         WHERE user_id = :id
         ORDER BY created_at DESC
         LIMIT 10',
        [':id' => $userId]
    );

    $unread = fetch_one(
        $pdo,
        'SELECT COUNT(*) AS total FROM notifications WHERE user_id = :id AND is_read = false',
        [':id' => $userId]
    );

    return [
        'user' => api_user($user),
        'stats' => [
            'appointments_total' => count($appointments),
            'appointments_pending' => count(array_filter($appointments, fn ($item) => $item['status'] === 'pending')),
            'appointments_accepted' => count(array_filter($appointments, fn ($item) => $item['status'] === 'accepted')),
            'appointments_completed' => count(array_filter($appointments, fn ($item) => $item['status'] === 'completed')),
            'notifications_unread' => (int) ($unread['total'] ?? 0),
        ],
        'recent_appointments' => $appointments,
        'recent_notifications' => $notifications,
    ];
}

function user_can_manage_profile(string $actorId, string $targetId): bool
{
    global $pdo;
    if ($actorId === '' || $targetId === '') {
        return false;
    }
    // Usuario puede gestionar su propio perfil
    if ($actorId === $targetId) {
        return true;
    }
    // Admin puede gestionar cualquier perfil
    $actor = fetch_one($pdo, 'SELECT role FROM users WHERE id = :id', [':id' => $actorId]);
    return $actor && $actor['role'] === 'admin';
}

if ($resource === 'health' && $method === 'GET') {
    respond([
        'ok' => true,
        'data' => [
            'status' => 'healthy',
            'timestamp' => date(DATE_ATOM),
        ],
    ]);
}

if ($resource === 'auth' && $id === 'register' && $method === 'POST') {
    $name = trim((string) ($input['name'] ?? ''));
    $email = strtolower(trim((string) ($input['email'] ?? '')));
    $phone = trim((string) ($input['phone'] ?? ''));
    $password = (string) ($input['password'] ?? '');

    if ($name === '' || $email === '' || $password === '') {
        respond(['ok' => false, 'message' => 'Nombre, correo y contraseña son obligatorios.'], 422);
    }

    $exists = fetch_one($pdo, 'SELECT id FROM users WHERE email = :email', [':email' => $email]);
    if ($exists) {
        respond(['ok' => false, 'message' => 'Ya existe una cuenta con ese correo.'], 409);
    }

    $userId = uuid_like('usr');
        execute_statement(
            $pdo,
            'INSERT INTO users (id, full_name, role, email, phone, password_hash, avatar_url, is_active, is_approved, created_at, updated_at)
             VALUES (:id, :full_name, :role, :email, :phone, :password_hash, :avatar_url, true, true, NOW(), NOW())',
        [
            ':id' => $userId,
            ':full_name' => $name,
            ':role' => 'client',
            ':email' => $email,
            ':phone' => $phone,
            ':password_hash' => password_hash($password, PASSWORD_BCRYPT),
            ':avatar_url' => default_avatar_for_role('client'),
        ]
    );

    $adminId = first_admin_id($pdo);
    if ($adminId) {
        notify($pdo, $adminId, 'Nuevo cliente registrado', $name . ' acaba de crear una cuenta.', 'account');
    }

    respond(['ok' => true, 'message' => 'Cuenta creada correctamente.', 'id' => $userId], 201);
}

if ($resource === 'auth' && $id === 'login' && $method === 'POST') {
    $email = strtolower(trim((string) ($input['email'] ?? '')));
    $password = (string) ($input['password'] ?? '');

    if ($email === '' || $password === '') {
        respond(['ok' => false, 'message' => 'Correo y contraseña son obligatorios.'], 422);
    }

    $user = fetch_one($pdo, 'SELECT * FROM users WHERE email = :email LIMIT 1', [':email' => $email]);
    if (!$user || !password_verify($password, (string) $user['password_hash'])) {
        respond(['ok' => false, 'message' => 'Credenciales inválidas.'], 401);
    }

    if (!(bool) $user['is_active']) {
        respond(['ok' => false, 'message' => 'La cuenta está inactiva.'], 403);
    }

    respond([
        'ok' => true,
        'message' => 'Login correcto.',
        'data' => ['user_id' => $user['id']],
    ]);
}

if ($resource === 'dashboard' && $id === 'summary' && $method === 'GET') {
    $monthlyRows = fetch_all(
        $pdo,
        "SELECT EXTRACT(MONTH FROM month_start)::int AS month_number,
                COALESCE(SUM(total_amount), 0)::float AS total
         FROM generate_series(
             date_trunc('year', NOW()),
             date_trunc('year', NOW()) + interval '11 months',
             interval '1 month'
         ) AS month_start
         LEFT JOIN orders ON date_trunc('month', orders.created_at) = month_start
         GROUP BY month_start
         ORDER BY month_start ASC"
    );

    $monthlyRevenue = array_fill(0, 12, 0);
    foreach ($monthlyRows as $row) {
        $index = max(1, min(12, (int) $row['month_number'])) - 1;
        $monthlyRevenue[$index] = (float) $row['total'];
    }

    respond([
        'ok' => true,
        'data' => [
            'users' => (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn(),
            'active_barbers' => (int) $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'barber' AND is_active = true AND is_approved = true")->fetchColumn(),
            'pending_applications' => (int) $pdo->query("SELECT COUNT(*) FROM barber_applications WHERE status = 'pending'")->fetchColumn(),
            'pending_appointments' => (int) $pdo->query("SELECT COUNT(*) FROM appointments WHERE status = 'pending'")->fetchColumn(),
            'accepted_appointments' => (int) $pdo->query("SELECT COUNT(*) FROM appointments WHERE status = 'accepted'")->fetchColumn(),
            'completed_appointments' => (int) $pdo->query("SELECT COUNT(*) FROM appointments WHERE status = 'completed'")->fetchColumn(),
            'active_conversations' => (int) $pdo->query('SELECT COUNT(*) FROM conversations WHERE is_active = true')->fetchColumn(),
            'products' => (int) $pdo->query('SELECT COUNT(*) FROM products')->fetchColumn(),
            'inventory_value' => (float) $pdo->query('SELECT COALESCE(SUM(price * stock), 0) FROM products')->fetchColumn(),
            'revenue_year' => (float) $pdo->query('SELECT COALESCE(SUM(total_amount), 0) FROM orders')->fetchColumn(),
            'first_six_months' => (float) $pdo->query("SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE created_at >= date_trunc('year', NOW()) AND created_at < date_trunc('year', NOW()) + interval '6 months'")->fetchColumn(),
            'monthly_revenue' => $monthlyRevenue,
        ],
    ]);
}

if ($resource === 'services' && $method === 'GET') {
    respond([
        'ok' => true,
        'data' => fetch_all($pdo, 'SELECT id, name, description, duration_minutes AS duration, price, created_at FROM services ORDER BY created_at ASC'),
    ]);
}

if ($resource === 'users') {
    if ($method === 'GET' && $id && $action === 'profile') {
        $profile = account_profile($pdo, $id);
        if (!$profile) {
            respond(['ok' => false, 'message' => 'Perfil no encontrado.'], 404);
        }
        respond(['ok' => true, 'data' => $profile]);
    }

    if ($id && $method === 'POST' && $action === 'avatar') {
        // Debug: log info de la petición
        $debugInfo = [
            'FILES' => $_FILES,
            'POST' => $_POST,
            'input' => $input,
            'id' => $id,
        ];
        
        $actorId = (string) ($input['actor_id'] ?? $_POST['actor_id'] ?? '');
        if (!user_can_manage_profile($actorId, $id)) {
            respond(['ok' => false, 'message' => 'No autorizado para cambiar esta foto.', 'debug' => $debugInfo], 403);
        }

        $current = fetch_one($pdo, 'SELECT * FROM users WHERE id = :id', [':id' => $id]);
        if (!$current) {
            respond(['ok' => false, 'message' => 'Usuario no encontrado.'], 404);
        }

        // Verificar que se recibió un archivo
        if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
            $errorCode = $_FILES['avatar']['error'] ?? UPLOAD_ERR_NO_FILE;
            $errorMessages = [
                UPLOAD_ERR_INI_SIZE => 'El archivo excede upload_max_filesize',
                UPLOAD_ERR_FORM_SIZE => 'El archivo excede MAX_FILE_SIZE',
                UPLOAD_ERR_PARTIAL => 'El archivo se subió parcialmente',
                UPLOAD_ERR_NO_FILE => 'No se envió ningún archivo',
                UPLOAD_ERR_NO_TMP_DIR => 'Falta carpeta temporal',
                UPLOAD_ERR_CANT_WRITE => 'No se pudo escribir el archivo',
                UPLOAD_ERR_EXTENSION => 'Extensión PHP detuvo la subida',
            ];
            respond(['ok' => false, 'message' => $errorMessages[$errorCode] ?? 'Error de subida desconocido', 'error_code' => $errorCode, 'debug' => $debugInfo], 422);
        }

        try {
            $avatar = save_uploaded_media('avatar', ['image/']);
        } catch (Throwable $exception) {
            respond(['ok' => false, 'message' => 'No se pudo subir la foto de perfil.', 'error' => $exception->getMessage()], 422);
        }

        if (!$avatar) {
            respond(['ok' => false, 'message' => 'Debes adjuntar una imagen.'], 422);
        }

        delete_upload_from_url((string) ($current['avatar_url'] ?? ''));
        execute_statement(
            $pdo,
            'UPDATE users SET avatar_url = :avatar_url, updated_at = NOW() WHERE id = :id',
            [':avatar_url' => $avatar['url'], ':id' => $id]
        );

        respond(['ok' => true, 'message' => 'Foto de perfil actualizada.', 'data' => ['avatar' => $avatar['url']]]);
    }

    // Endpoint alternativo para subir avatar en base64 (más confiable con proxies)
    if ($id && $method === 'PUT' && $action === 'avatar') {
        $actorId = (string) ($input['actor_id'] ?? '');
        if (!user_can_manage_profile($actorId, $id)) {
            respond(['ok' => false, 'message' => 'No autorizado para cambiar esta foto.'], 403);
        }

        $current = fetch_one($pdo, 'SELECT * FROM users WHERE id = :id', [':id' => $id]);
        if (!$current) {
            respond(['ok' => false, 'message' => 'Usuario no encontrado.'], 404);
        }

        $base64Data = (string) ($input['avatar_base64'] ?? '');
        $fileName = (string) ($input['file_name'] ?? 'avatar.png');
        
        if ($base64Data === '') {
            respond(['ok' => false, 'message' => 'Debes enviar avatar_base64 con la imagen.'], 422);
        }

        // Extraer data si viene con prefijo data:image/...;base64,
        if (str_contains($base64Data, ',')) {
            $base64Data = explode(',', $base64Data)[1];
        }

        $imageData = base64_decode($base64Data, true);
        if ($imageData === false) {
            respond(['ok' => false, 'message' => 'La imagen base64 no es válida.'], 422);
        }

        // Determinar extensión desde el mime type
        $mime = 'image/png';
        if (function_exists('finfo_open')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            if ($finfo) {
                $detectedMime = finfo_buffer($finfo, $imageData);
                if ($detectedMime && str_starts_with($detectedMime, 'image/')) {
                    $mime = $detectedMime;
                }
                // finfo_close ya no es necesario en PHP 8+
            }
        }

        $extension = match ($mime) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/gif' => 'gif',
            'image/webp' => 'webp',
            default => 'png',
        };

        $safeFileName = uuid_like('avatar') . '.' . $extension;
        $destination = uploads_path() . '/' . $safeFileName;

        if (file_put_contents($destination, $imageData) === false) {
            respond(['ok' => false, 'message' => 'No se pudo guardar la imagen.'], 500);
        }

        delete_upload_from_url((string) ($current['avatar_url'] ?? ''));
        $avatarUrl = public_upload_url($safeFileName);
        
        execute_statement(
            $pdo,
            'UPDATE users SET avatar_url = :avatar_url, updated_at = NOW() WHERE id = :id',
            [':avatar_url' => $avatarUrl, ':id' => $id]
        );

        respond(['ok' => true, 'message' => 'Foto de perfil actualizada.', 'data' => ['avatar' => $avatarUrl]]);
    }

    if ($id && $method === 'DELETE' && $action === 'avatar') {
        $actorId = (string) ($input['actor_id'] ?? $_POST['actor_id'] ?? '');
        if (!user_can_manage_profile($actorId, $id)) {
            respond(['ok' => false, 'message' => 'No autorizado para eliminar esta foto.'], 403);
        }

        $current = fetch_one($pdo, 'SELECT * FROM users WHERE id = :id', [':id' => $id]);
        if (!$current) {
            respond(['ok' => false, 'message' => 'Usuario no encontrado.'], 404);
        }

        delete_upload_from_url((string) ($current['avatar_url'] ?? ''));
        $defaultAvatar = default_avatar_for_role((string) $current['role']);
        execute_statement(
            $pdo,
            'UPDATE users SET avatar_url = :avatar_url, updated_at = NOW() WHERE id = :id',
            [':avatar_url' => $defaultAvatar, ':id' => $id]
        );

        respond(['ok' => true, 'message' => 'Foto de perfil eliminada.', 'data' => ['avatar' => $defaultAvatar]]);
    }

    if ($method === 'GET') {
        $rows = fetch_all($pdo, 'SELECT * FROM users ORDER BY created_at DESC');
        respond(['ok' => true, 'data' => array_map('api_user', $rows)]);
    }

    if ($method === 'POST') {
        $name = trim((string) ($input['name'] ?? ''));
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $phone = trim((string) ($input['phone'] ?? ''));
        $password = (string) ($input['password'] ?? 'secret123');
        $role = (string) ($input['role'] ?? 'client');
        $avatar = (string) ($input['avatar'] ?? '');

        if ($name === '' || $email === '' || !in_array($role, ['client', 'barber', 'admin'], true)) {
            respond(['ok' => false, 'message' => 'Datos inválidos para crear usuario.'], 422);
        }

        if ($avatar === '') {
            $avatar = default_avatar_for_role($role);
        }

        $exists = fetch_one($pdo, 'SELECT id FROM users WHERE email = :email', [':email' => $email]);
        if ($exists) {
            respond(['ok' => false, 'message' => 'Ya existe una cuenta con ese correo.'], 409);
        }

        $userId = uuid_like('usr');
        execute_statement(
            $pdo,
            'INSERT INTO users (id, full_name, role, email, phone, password_hash, avatar_url, is_active, is_approved, created_at, updated_at)
             VALUES (:id, :full_name, :role, :email, :phone, :password_hash, :avatar_url, true, true, NOW(), NOW())',
            [
                ':id' => $userId,
                ':full_name' => $name,
                ':role' => $role,
                ':email' => $email,
                ':phone' => $phone,
                ':password_hash' => password_hash($password, PASSWORD_BCRYPT),
                ':avatar_url' => $avatar,
            ]
        );

        respond(['ok' => true, 'message' => 'Usuario creado.', 'id' => $userId], 201);
    }

    if ($id && $method === 'PATCH') {
        $current = fetch_one($pdo, 'SELECT * FROM users WHERE id = :id', [':id' => $id]);
        if (!$current) {
            respond(['ok' => false, 'message' => 'Usuario no encontrado.'], 404);
        }

        execute_statement(
            $pdo,
            'UPDATE users SET
                full_name = :full_name,
                email = :email,
                phone = :phone,
                role = :role,
                avatar_url = :avatar_url,
                is_active = :is_active,
                is_approved = :is_approved,
                updated_at = NOW()
             WHERE id = :id',
            [
                ':id' => $id,
                ':full_name' => $input['name'] ?? $current['full_name'],
                ':email' => $input['email'] ?? $current['email'],
                ':phone' => $input['phone'] ?? $current['phone'],
                ':role' => $input['role'] ?? $current['role'],
                ':avatar_url' => $input['avatar'] ?? $current['avatar_url'],
                ':is_active' => array_key_exists('active', $input) ? (bool) $input['active'] : (bool) $current['is_active'],
                ':is_approved' => array_key_exists('approved', $input) ? (bool) $input['approved'] : (bool) $current['is_approved'],
            ]
        );

        respond(['ok' => true, 'message' => 'Usuario actualizado.']);
    }

    if ($id && $method === 'DELETE') {
        $current = fetch_one($pdo, 'SELECT * FROM users WHERE id = :id', [':id' => $id]);
        if (!$current) {
            respond(['ok' => false, 'message' => 'Usuario no encontrado.'], 404);
        }

        $adminId = first_admin_id($pdo);
        $pdo->beginTransaction();
        try {
            execute_statement(
                $pdo,
                "UPDATE appointments
                 SET status = CASE WHEN status = 'completed' THEN status ELSE 'cancelled' END,
                     updated_at = NOW()
                 WHERE client_id = :id OR barber_id = :id",
                [':id' => $id]
            );
            execute_statement($pdo, 'UPDATE conversations SET is_active = false, updated_at = NOW() WHERE client_id = :id OR barber_id = :id', [':id' => $id]);
            execute_statement($pdo, 'DELETE FROM carts WHERE client_id = :id', [':id' => $id]);
            execute_statement($pdo, 'DELETE FROM users WHERE id = :id', [':id' => $id]);
            $pdo->commit();
        } catch (Throwable $exception) {
            $pdo->rollBack();
            respond(['ok' => false, 'message' => 'No se pudo eliminar el usuario.', 'error' => $exception->getMessage()], 500);
        }

        if ($adminId && $adminId !== $id) {
            notify($pdo, $adminId, 'Usuario eliminado', 'Se eliminó la cuenta de ' . $current['full_name'] . '.', 'account');
        }

        respond(['ok' => true, 'message' => 'Usuario eliminado.']);
    }
}

if ($resource === 'applications') {
    if ($method === 'GET') {
        respond([
            'ok' => true,
            'data' => fetch_all($pdo, 'SELECT id, full_name AS name, email, phone, specialty, years_experience AS experience, note, status, submitted_at FROM barber_applications ORDER BY submitted_at DESC'),
        ]);
    }

    if ($method === 'POST' && !$id) {
        $applicationId = uuid_like('app');
        execute_statement(
            $pdo,
            'INSERT INTO barber_applications (id, full_name, email, phone, specialty, years_experience, note, status, submitted_at)
             VALUES (:id, :full_name, :email, :phone, :specialty, :years_experience, :note, :status, NOW())',
            [
                ':id' => $applicationId,
                ':full_name' => trim((string) ($input['name'] ?? '')),
                ':email' => strtolower(trim((string) ($input['email'] ?? ''))),
                ':phone' => trim((string) ($input['phone'] ?? '')),
                ':specialty' => trim((string) ($input['specialty'] ?? '')),
                ':years_experience' => (int) ($input['experience'] ?? 0),
                ':note' => trim((string) ($input['note'] ?? '')),
                ':status' => 'pending',
            ]
        );

        $adminId = first_admin_id($pdo);
        if ($adminId) {
            notify($pdo, $adminId, 'Nueva postulación', 'Hay una nueva postulación pendiente.', 'application');
        }

        respond(['ok' => true, 'message' => 'Postulación enviada.', 'id' => $applicationId], 201);
    }

    if ($id && $method === 'POST' && in_array($action, ['approve', 'reject'], true)) {
        $application = fetch_one($pdo, 'SELECT * FROM barber_applications WHERE id = :id', [':id' => $id]);
        if (!$application) {
            respond(['ok' => false, 'message' => 'Postulación no encontrada.'], 404);
        }

        $decision = $action === 'approve' ? 'approved' : 'rejected';
        execute_statement($pdo, 'UPDATE barber_applications SET status = :status, reviewed_at = NOW() WHERE id = :id', [':status' => $decision, ':id' => $id]);

        if ($decision === 'approved') {
            $email = strtolower((string) $application['email']);
            $exists = fetch_one($pdo, 'SELECT id FROM users WHERE email = :email', [':email' => $email]);
            if (!$exists) {
                execute_statement(
                    $pdo,
                    'INSERT INTO users (id, full_name, role, email, phone, password_hash, avatar_url, is_active, is_approved, created_at, updated_at)
                     VALUES (:id, :full_name, :role, :email, :phone, :password_hash, :avatar_url, true, true, NOW(), NOW())',
                    [
                        ':id' => uuid_like('usr-barber'),
                        ':full_name' => $application['full_name'],
                        ':role' => 'barber',
                        ':email' => $email,
                        ':phone' => $application['phone'],
                        ':password_hash' => password_hash('secret123', PASSWORD_BCRYPT),
                        ':avatar_url' => default_avatar_for_role('barber'),
                    ]
                );
            }
        }

        respond(['ok' => true, 'message' => 'Postulación actualizada.', 'status' => $decision]);
    }
}

if ($resource === 'products') {
    if ($method === 'GET') {
        respond([
            'ok' => true,
            'data' => fetch_all($pdo, 'SELECT id, name, category, description, price, stock, image_url AS image, is_active AS active, created_at FROM products ORDER BY created_at DESC'),
        ]);
    }

    if ($method === 'POST') {
        $productId = uuid_like('prd');
        execute_statement(
            $pdo,
            'INSERT INTO products (id, name, category, description, price, stock, image_url, is_active, created_at, updated_at)
             VALUES (:id, :name, :category, :description, :price, :stock, :image_url, true, NOW(), NOW())',
            [
                ':id' => $productId,
                ':name' => trim((string) ($input['name'] ?? '')),
                ':category' => trim((string) ($input['category'] ?? 'General')),
                ':description' => trim((string) ($input['description'] ?? '')),
                ':price' => (float) ($input['price'] ?? 0),
                ':stock' => (int) ($input['stock'] ?? 0),
                ':image_url' => trim((string) ($input['image'] ?? '')),
            ]
        );
        respond(['ok' => true, 'message' => 'Producto creado.', 'id' => $productId], 201);
    }

    if ($id && $method === 'PATCH') {
        $current = fetch_one($pdo, 'SELECT * FROM products WHERE id = :id', [':id' => $id]);
        if (!$current) {
            respond(['ok' => false, 'message' => 'Producto no encontrado.'], 404);
        }

        execute_statement(
            $pdo,
            'UPDATE products SET
                name = :name,
                category = :category,
                description = :description,
                price = :price,
                stock = :stock,
                image_url = :image_url,
                is_active = :is_active,
                updated_at = NOW()
             WHERE id = :id',
            [
                ':id' => $id,
                ':name' => $input['name'] ?? $current['name'],
                ':category' => $input['category'] ?? $current['category'],
                ':description' => $input['description'] ?? $current['description'],
                ':price' => (float) ($input['price'] ?? $current['price']),
                ':stock' => (int) ($input['stock'] ?? $current['stock']),
                ':image_url' => $input['image'] ?? $current['image_url'],
                ':is_active' => array_key_exists('active', $input) ? (bool) $input['active'] : (bool) $current['is_active'],
            ]
        );

        respond(['ok' => true, 'message' => 'Producto actualizado.']);
    }

    if ($id && $method === 'DELETE') {
        execute_statement($pdo, 'DELETE FROM products WHERE id = :id', [':id' => $id]);
        respond(['ok' => true, 'message' => 'Producto eliminado.']);
    }
}

if ($resource === 'appointments') {
    if ($method === 'GET') {
        respond([
            'ok' => true,
            'data' => fetch_all($pdo, 'SELECT id, client_id, barber_id, service_id, appointment_date AS date, notes, status, created_at FROM appointments ORDER BY appointment_date ASC'),
        ]);
    }

    if ($method === 'POST' && !$id) {
        $appointmentId = uuid_like('apt');
        $clientId = (string) ($input['client_id'] ?? '');
        $barberId = (string) ($input['barber_id'] ?? '');
        $serviceId = (string) ($input['service_id'] ?? '');
        if ($clientId === '' || $barberId === '' || $serviceId === '') {
            respond(['ok' => false, 'message' => 'Datos de cita incompletos.'], 422);
        }

        execute_statement(
            $pdo,
            'INSERT INTO appointments (id, client_id, barber_id, service_id, appointment_date, notes, status, created_at, updated_at)
             VALUES (:id, :client_id, :barber_id, :service_id, :appointment_date, :notes, :status, NOW(), NOW())',
            [
                ':id' => $appointmentId,
                ':client_id' => $clientId,
                ':barber_id' => $barberId,
                ':service_id' => $serviceId,
                ':appointment_date' => $input['date'] ?? date(DATE_ATOM),
                ':notes' => $input['notes'] ?? '',
                ':status' => 'pending',
            ]
        );

        $adminId = first_admin_id($pdo);
        notify($pdo, $barberId, 'Nueva cita', 'Tienes una nueva solicitud de cita.', 'appointment');
        notify($pdo, $clientId, 'Cita creada', 'Tu solicitud fue registrada correctamente.', 'appointment');
        if ($adminId) {
            notify($pdo, $adminId, 'Nueva cita registrada', 'Se registró una nueva cita en el sistema.', 'appointment');
        }

        respond(['ok' => true, 'message' => 'Cita creada.', 'id' => $appointmentId], 201);
    }

    if ($id && $method === 'POST' && in_array($action, ['accept', 'cancel', 'complete'], true)) {
        $appointment = fetch_one($pdo, 'SELECT * FROM appointments WHERE id = :id', [':id' => $id]);
        if (!$appointment) {
            respond(['ok' => false, 'message' => 'Cita no encontrada.'], 404);
        }

        $status = $action === 'accept' ? 'accepted' : ($action === 'complete' ? 'completed' : 'cancelled');
        execute_statement($pdo, 'UPDATE appointments SET status = :status, updated_at = NOW() WHERE id = :id', [':status' => $status, ':id' => $id]);

        $adminId = first_admin_id($pdo);
        notify($pdo, (string) $appointment['client_id'], 'Estado de cita', 'Tu cita cambió a ' . $status . '.', 'appointment');
        notify($pdo, (string) $appointment['barber_id'], 'Estado de cita', 'La cita cambió a ' . $status . '.', 'appointment');
        if ($adminId) {
            notify($pdo, $adminId, 'Agenda actualizada', 'La cita ' . $id . ' cambió a ' . $status . '.', 'appointment');
        }

        respond(['ok' => true, 'message' => 'Cita actualizada.', 'status' => $status]);
    }
}

if ($resource === 'conversations') {
    if ($method === 'GET') {
        $rows = fetch_all($pdo, 'SELECT id, appointment_id, barber_id, client_id, title, is_active AS active, created_at, updated_at FROM conversations ORDER BY updated_at DESC, created_at DESC');
        $data = [];
        foreach ($rows as $row) {
            $data[] = conversation_with_messages($pdo, (string) $row['id']);
        }
        respond(['ok' => true, 'data' => $data]);
    }

    if ($method === 'POST' && !$id) {
        $appointmentId = (string) ($input['appointment_id'] ?? '');
        $senderId = (string) ($input['sender_id'] ?? '');
        $barberId = (string) ($input['barber_id'] ?? '');
        $clientId = (string) ($input['client_id'] ?? '');

        // Conversación directa (admin-barbero, sin cita)
        if ($appointmentId === '' && $barberId !== '' && $clientId !== '') {
            // Verificar que los usuarios existen
            $barber = fetch_one($pdo, 'SELECT * FROM users WHERE id = :id', [':id' => $barberId]);
            $client = fetch_one($pdo, 'SELECT * FROM users WHERE id = :id', [':id' => $clientId]);
            if (!$barber || !$client) {
                respond(['ok' => false, 'message' => 'Uno o más participantes no existen.'], 422);
            }

            // Verificar si ya existe conversación directa entre estos usuarios
            $existing = fetch_one(
                $pdo,
                'SELECT id FROM conversations WHERE appointment_id IS NULL AND ((barber_id = :b AND client_id = :c) OR (barber_id = :c2 AND client_id = :b2)) AND is_active = true',
                [':b' => $barberId, ':c' => $clientId, ':b2' => $barberId, ':c2' => $clientId]
            );
            if ($existing) {
                respond(['ok' => true, 'message' => 'La conversación ya existe.', 'id' => $existing['id'], 'data' => conversation_with_messages($pdo, (string) $existing['id'])]);
            }

            $conversationId = uuid_like('conv');
            execute_statement(
                $pdo,
                'INSERT INTO conversations (id, appointment_id, barber_id, client_id, title, is_active, created_at, updated_at)
                 VALUES (:id, NULL, :barber_id, :client_id, :title, true, NOW(), NOW())',
                [
                    ':id' => $conversationId,
                    ':barber_id' => $barberId,
                    ':client_id' => $clientId,
                    ':title' => $input['title'] ?? 'Chat directo',
                ]
            );

            execute_statement(
                $pdo,
                'INSERT INTO messages (id, conversation_id, sender_id, message_type, body, created_at)
                 VALUES (:id, :conversation_id, :sender_id, :message_type, :body, NOW())',
                [
                    ':id' => uuid_like('msg'),
                    ':conversation_id' => $conversationId,
                    ':sender_id' => $senderId !== '' ? $senderId : $clientId,
                    ':message_type' => 'system',
                    ':body' => 'Conversación directa iniciada.',
                ]
            );

            $recipientId = $senderId === $barberId ? $clientId : $barberId;
            notify($pdo, (string) $recipientId, 'Nuevo chat', 'Se inició una nueva conversación contigo.', 'message');

            respond(['ok' => true, 'message' => 'Conversación creada.', 'id' => $conversationId, 'data' => conversation_with_messages($pdo, $conversationId)], 201);
        }

        // Conversación vinculada a cita (flujo original)
        $appointment = fetch_one($pdo, 'SELECT * FROM appointments WHERE id = :id', [':id' => $appointmentId]);
        if (!$appointment || $appointment['status'] === 'cancelled') {
            respond(['ok' => false, 'message' => 'No se puede crear el chat sin una cita válida.'], 422);
        }

        $existing = fetch_one($pdo, 'SELECT id FROM conversations WHERE appointment_id = :id AND is_active = true', [':id' => $appointmentId]);
        if ($existing) {
            respond(['ok' => true, 'message' => 'La conversación ya existe.', 'id' => $existing['id'], 'data' => conversation_with_messages($pdo, (string) $existing['id'])]);
        }

        $conversationId = uuid_like('conv');
        execute_statement(
            $pdo,
            'INSERT INTO conversations (id, appointment_id, barber_id, client_id, title, is_active, created_at, updated_at)
             VALUES (:id, :appointment_id, :barber_id, :client_id, :title, true, NOW(), NOW())',
            [
                ':id' => $conversationId,
                ':appointment_id' => $appointmentId,
                ':barber_id' => $appointment['barber_id'],
                ':client_id' => $appointment['client_id'],
                ':title' => $input['title'] ?? 'Conversación',
            ]
        );

        execute_statement(
            $pdo,
            'INSERT INTO messages (id, conversation_id, sender_id, message_type, body, created_at)
             VALUES (:id, :conversation_id, :sender_id, :message_type, :body, NOW())',
            [
                ':id' => uuid_like('msg'),
                ':conversation_id' => $conversationId,
                ':sender_id' => $senderId !== '' ? $senderId : $appointment['barber_id'],
                ':message_type' => 'system',
                ':body' => 'Conversación iniciada para esta cita.',
            ]
        );

        $recipientId = $senderId === $appointment['barber_id'] ? $appointment['client_id'] : $appointment['barber_id'];
        notify($pdo, (string) $recipientId, 'Chat habilitado', 'Se abrió una conversación vinculada a tu cita.', 'message');

        respond(['ok' => true, 'message' => 'Conversación creada.', 'id' => $conversationId, 'data' => conversation_with_messages($pdo, $conversationId)], 201);
    }

    if ($id && $method === 'POST' && $action === 'messages') {
        $conversation = fetch_one($pdo, 'SELECT * FROM conversations WHERE id = :id AND is_active = true', [':id' => $id]);
        if (!$conversation) {
            respond(['ok' => false, 'message' => 'Conversación no encontrada.'], 404);
        }

        $senderId = (string) ($input['sender_id'] ?? '');
        $uploadedMedia = null;
        $mediaUrl = null;
        $mediaName = null;

        // Primero intentar con archivo subido via multipart
        try {
            $uploadedMedia = save_uploaded_media('media', ['image/', 'audio/']);
        } catch (Throwable $exception) {
            // Ignorar si no hay archivo, puede venir en base64
        }

        // Si no hay archivo subido, intentar con base64
        if (!$uploadedMedia) {
            $base64Data = (string) ($input['media_base64'] ?? '');
            if ($base64Data !== '') {
                // Extraer data si viene con prefijo data:...;base64,
                if (str_contains($base64Data, ',')) {
                    $base64Data = explode(',', $base64Data)[1];
                }

                $fileData = base64_decode($base64Data, true);
                if ($fileData !== false) {
                    // Detectar mime type
                    $mime = 'application/octet-stream';
                    if (function_exists('finfo_open')) {
                        $finfo = finfo_open(FILEINFO_MIME_TYPE);
                        if ($finfo) {
                            $detectedMime = finfo_buffer($finfo, $fileData);
                            if ($detectedMime) {
                                $mime = $detectedMime;
                            }
                        }
                    }

                    // Determinar extensión
                    $extension = match ($mime) {
                        'image/jpeg' => 'jpg',
                        'image/png' => 'png',
                        'image/gif' => 'gif',
                        'image/webp' => 'webp',
                        'image/svg+xml' => 'svg',
                        'image/bmp' => 'bmp',
                        'image/tiff' => 'tiff',
                        'audio/webm' => 'webm',
                        'audio/mpeg' => 'mp3',
                        'audio/mp3' => 'mp3',
                        'audio/mp4' => 'm4a',
                        'audio/x-m4a' => 'm4a',
                        'audio/aac' => 'aac',
                        'audio/ogg' => 'ogg',
                        'audio/wav' => 'wav',
                        'audio/wave' => 'wav',
                        'audio/x-wav' => 'wav',
                        default => pathinfo((string) ($input['media_name'] ?? ''), PATHINFO_EXTENSION) ?: 'bin',
                    };

                    $safeFileName = uuid_like('media') . '.' . $extension;
                    $destination = uploads_path() . '/' . $safeFileName;

                    if (file_put_contents($destination, $fileData) !== false) {
                        $mediaUrl = public_upload_url($safeFileName);
                        $mediaName = (string) ($input['media_name'] ?? $safeFileName);
                        $uploadedMedia = [
                            'url' => $mediaUrl,
                            'name' => $mediaName,
                            'mime' => $mime,
                        ];
                    }
                }
            }
        }

        $kind = (string) ($input['kind'] ?? 'text');
        if ($uploadedMedia) {
            if (str_starts_with((string) $uploadedMedia['mime'], 'image/')) {
                $kind = 'image';
            }
            if (str_starts_with((string) $uploadedMedia['mime'], 'audio/')) {
                $kind = 'voice';
            }
        }

        execute_statement(
            $pdo,
            'INSERT INTO messages (id, conversation_id, sender_id, message_type, body, media_url, media_name, media_duration, created_at)
             VALUES (:id, :conversation_id, :sender_id, :message_type, :body, :media_url, :media_name, :media_duration, NOW())',
            [
                ':id' => uuid_like('msg'),
                ':conversation_id' => $id,
                ':sender_id' => $senderId,
                ':message_type' => $kind,
                ':body' => $input['text'] ?? ($kind === 'image' ? 'Imagen enviada.' : ($kind === 'voice' ? 'Nota de voz enviada.' : '')),
                ':media_url' => $uploadedMedia['url'] ?? ($input['media_url'] ?? null),
                ':media_name' => $uploadedMedia['name'] ?? ($input['media_name'] ?? null),
                ':media_duration' => $input['duration'] ?? null,
            ]
        );
        execute_statement($pdo, 'UPDATE conversations SET updated_at = NOW() WHERE id = :id', [':id' => $id]);

        $recipientId = $senderId === $conversation['barber_id'] ? $conversation['client_id'] : $conversation['barber_id'];
        notify($pdo, (string) $recipientId, 'Nuevo mensaje', 'Tienes un nuevo mensaje.', 'message');

        respond(['ok' => true, 'message' => 'Mensaje enviado.', 'data' => conversation_with_messages($pdo, (string) $id)], 201);
    }

    if ($id && $method === 'POST' && $action === 'clear') {
        $senderId = (string) ($input['sender_id'] ?? '');
        execute_statement($pdo, 'DELETE FROM messages WHERE conversation_id = :id', [':id' => $id]);
        execute_statement(
            $pdo,
            'INSERT INTO messages (id, conversation_id, sender_id, message_type, body, created_at)
             VALUES (:id, :conversation_id, :sender_id, :message_type, :body, NOW())',
            [
                ':id' => uuid_like('msg'),
                ':conversation_id' => $id,
                ':sender_id' => $senderId,
                ':message_type' => 'system',
                ':body' => 'El historial fue limpiado.',
            ]
        );
        execute_statement($pdo, 'UPDATE conversations SET updated_at = NOW() WHERE id = :id', [':id' => $id]);
        respond(['ok' => true, 'message' => 'Conversación limpiada.', 'data' => conversation_with_messages($pdo, (string) $id)]);
    }

    if ($id && $method === 'DELETE') {
        $conversation = fetch_one($pdo, 'SELECT * FROM conversations WHERE id = :id', [':id' => $id]);
        if (!$conversation) {
            respond(['ok' => false, 'message' => 'Conversación no encontrada.'], 404);
        }

        $senderId = (string) ($input['sender_id'] ?? '');
        execute_statement($pdo, 'UPDATE conversations SET is_active = false, updated_at = NOW() WHERE id = :id', [':id' => $id]);
        $recipientId = $senderId === $conversation['barber_id'] ? $conversation['client_id'] : $conversation['barber_id'];
        notify($pdo, (string) $recipientId, 'Conversación archivada', 'El chat fue archivado.', 'message');
        respond(['ok' => true, 'message' => 'Conversación archivada.']);
    }
}

if ($resource === 'notifications') {
    if ($method === 'GET') {
        $userId = $_GET['user_id'] ?? null;
        if ($userId) {
            respond([
                'ok' => true,
                'data' => fetch_all($pdo, 'SELECT id, user_id, title, body, type, is_read AS read, created_at FROM notifications WHERE user_id = :id ORDER BY created_at DESC', [':id' => $userId]),
            ]);
        }

        respond([
            'ok' => true,
            'data' => fetch_all($pdo, 'SELECT id, user_id, title, body, type, is_read AS read, created_at FROM notifications ORDER BY created_at DESC'),
        ]);
    }

    if ($method === 'POST' && $id === 'read-all') {
        $userId = (string) ($input['user_id'] ?? '');
        if ($userId === '') {
            respond(['ok' => false, 'message' => 'user_id es requerido.'], 422);
        }
        execute_statement($pdo, 'UPDATE notifications SET is_read = true WHERE user_id = :id', [':id' => $userId]);
        respond(['ok' => true, 'message' => 'Notificaciones marcadas como leídas.']);
    }
}

if ($resource === 'cart') {
    if ($method === 'GET') {
        $clientId = (string) ($_GET['client_id'] ?? '');
        if ($clientId === '') {
            respond(['ok' => false, 'message' => 'client_id es requerido.'], 422);
        }

        $cart = fetch_one($pdo, 'SELECT id FROM carts WHERE client_id = :client_id', [':client_id' => $clientId]);
        if (!$cart) {
            $cartId = uuid_like('cart');
            execute_statement($pdo, 'INSERT INTO carts (id, client_id, created_at, updated_at) VALUES (:id, :client_id, NOW(), NOW())', [':id' => $cartId, ':client_id' => $clientId]);
            $cart = ['id' => $cartId];
        }

        $items = fetch_all(
            $pdo,
            'SELECT ci.product_id, ci.quantity, p.name AS product_name, p.price AS product_price, p.image_url AS product_image
             FROM cart_items ci
             INNER JOIN products p ON p.id = ci.product_id
             WHERE ci.cart_id = :cart_id
             ORDER BY p.name ASC',
            [':cart_id' => $cart['id']]
        );

        respond(['ok' => true, 'data' => $items]);
    }

    if ($method === 'POST') {
        $clientId = (string) ($input['client_id'] ?? '');
        $productId = (string) ($input['product_id'] ?? '');
        $quantity = max(1, (int) ($input['quantity'] ?? 1));
        if ($clientId === '' || $productId === '') {
            respond(['ok' => false, 'message' => 'client_id y product_id son obligatorios.'], 422);
        }

        $product = fetch_one($pdo, 'SELECT * FROM products WHERE id = :id AND is_active = true', [':id' => $productId]);
        if (!$product) {
            respond(['ok' => false, 'message' => 'Producto no disponible.'], 404);
        }

        $cart = fetch_one($pdo, 'SELECT id FROM carts WHERE client_id = :client_id', [':client_id' => $clientId]);
        if (!$cart) {
            $cartId = uuid_like('cart');
            execute_statement($pdo, 'INSERT INTO carts (id, client_id, created_at, updated_at) VALUES (:id, :client_id, NOW(), NOW())', [':id' => $cartId, ':client_id' => $clientId]);
            $cart = ['id' => $cartId];
        }

        $existing = fetch_one($pdo, 'SELECT id, quantity FROM cart_items WHERE cart_id = :cart_id AND product_id = :product_id', [':cart_id' => $cart['id'], ':product_id' => $productId]);
        if ($existing) {
            execute_statement($pdo, 'UPDATE cart_items SET quantity = :quantity WHERE id = :id', [':quantity' => ((int) $existing['quantity']) + $quantity, ':id' => $existing['id']]);
        } else {
            execute_statement($pdo, 'INSERT INTO cart_items (id, cart_id, product_id, quantity) VALUES (:id, :cart_id, :product_id, :quantity)', [':id' => uuid_like('cart-item'), ':cart_id' => $cart['id'], ':product_id' => $productId, ':quantity' => $quantity]);
        }
        execute_statement($pdo, 'UPDATE carts SET updated_at = NOW() WHERE id = :id', [':id' => $cart['id']]);

        respond(['ok' => true, 'message' => 'Producto agregado al carrito.']);
    }

    if ($method === 'PATCH' && $id) {
        $quantity = (int) ($input['quantity'] ?? 0);
        $item = fetch_one($pdo, 'SELECT * FROM cart_items WHERE product_id = :product_id', [':product_id' => $id]);
        if (!$item) {
            respond(['ok' => false, 'message' => 'Item de carrito no encontrado.'], 404);
        }

        if ($quantity <= 0) {
            execute_statement($pdo, 'DELETE FROM cart_items WHERE id = :id', [':id' => $item['id']]);
            respond(['ok' => true, 'message' => 'Producto eliminado del carrito.']);
        }

        execute_statement($pdo, 'UPDATE cart_items SET quantity = :quantity WHERE id = :id', [':quantity' => $quantity, ':id' => $item['id']]);
        respond(['ok' => true, 'message' => 'Carrito actualizado.']);
    }

    if ($method === 'DELETE' && $id) {
        execute_statement($pdo, 'DELETE FROM cart_items WHERE product_id = :product_id', [':product_id' => $id]);
        respond(['ok' => true, 'message' => 'Producto eliminado del carrito.']);
    }
}

if ($resource === 'orders') {
    if ($method === 'GET') {
        $orders = fetch_all(
            $pdo,
            "SELECT o.id,
                    o.client_id,
                    o.status,
                    o.total_amount AS total,
                    o.created_at,
                    u.full_name AS client_name,
                    u.email AS client_email,
                    u.phone AS client_phone,
                    recent_service.name AS latest_service_name,
                    recent_appointment.appointment_date AS latest_appointment_date,
                    recent_appointment.notes AS latest_appointment_notes
             FROM orders o
             INNER JOIN users u ON u.id = o.client_id
             LEFT JOIN LATERAL (
                 SELECT a.service_id, a.appointment_date, a.notes
                 FROM appointments a
                 WHERE a.client_id = o.client_id
                 ORDER BY a.appointment_date DESC
                 LIMIT 1
             ) recent_appointment ON true
             LEFT JOIN services recent_service ON recent_service.id = recent_appointment.service_id
             ORDER BY o.created_at DESC"
        );
        $data = [];
        foreach ($orders as $order) {
            $items = fetch_all(
                $pdo,
                'SELECT oi.product_id, oi.quantity, oi.unit_price, oi.subtotal, p.name AS product_name, p.image_url AS product_image
                 FROM order_items oi
                 INNER JOIN products p ON p.id = oi.product_id
                 WHERE oi.order_id = :id',
                [':id' => $order['id']]
            );
            $order['items'] = $items;
            $data[] = $order;
        }
        respond(['ok' => true, 'data' => $data]);
    }

    if ($id === 'checkout' && $method === 'POST') {
        $clientId = (string) ($input['client_id'] ?? '');
        $items = is_array($input['items'] ?? null) ? $input['items'] : [];
        if ($clientId === '' || $items === []) {
            respond(['ok' => false, 'message' => 'client_id e items son obligatorios.'], 422);
        }

        $orderId = uuid_like('ord');
        $adminId = first_admin_id($pdo);
        $pdo->beginTransaction();
        try {
            $total = 0.0;
            foreach ($items as $item) {
                $productId = (string) ($item['product_id'] ?? '');
                $quantity = (int) ($item['quantity'] ?? 0);
                $product = fetch_one($pdo, 'SELECT * FROM products WHERE id = :id AND is_active = true', [':id' => $productId]);
                if (!$product || $quantity <= 0) {
                    throw new RuntimeException('Producto inválido para checkout.');
                }
                if ((int) $product['stock'] < $quantity) {
                    throw new RuntimeException('Stock insuficiente para ' . $product['name']);
                }
                $subtotal = (float) $product['price'] * $quantity;
                $total += $subtotal;
            }

            execute_statement($pdo, 'INSERT INTO orders (id, client_id, status, total_amount, created_at, updated_at) VALUES (:id, :client_id, :status, :total, NOW(), NOW())', [
                ':id' => $orderId,
                ':client_id' => $clientId,
                ':status' => 'paid',
                ':total' => $total,
            ]);

            foreach ($items as $item) {
                $productId = (string) ($item['product_id'] ?? '');
                $quantity = (int) ($item['quantity'] ?? 0);
                $product = fetch_one($pdo, 'SELECT * FROM products WHERE id = :id', [':id' => $productId]);
                $subtotal = (float) $product['price'] * $quantity;
                execute_statement($pdo, 'INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, subtotal) VALUES (:id, :order_id, :product_id, :quantity, :unit_price, :subtotal)', [
                    ':id' => uuid_like('ord-item'),
                    ':order_id' => $orderId,
                    ':product_id' => $productId,
                    ':quantity' => $quantity,
                    ':unit_price' => $product['price'],
                    ':subtotal' => $subtotal,
                ]);
                execute_statement($pdo, 'UPDATE products SET stock = stock - :quantity, updated_at = NOW() WHERE id = :id', [':quantity' => $quantity, ':id' => $productId]);
            }

            $cart = fetch_one($pdo, 'SELECT id FROM carts WHERE client_id = :client_id', [':client_id' => $clientId]);
            if ($cart) {
                execute_statement($pdo, 'DELETE FROM cart_items WHERE cart_id = :cart_id', [':cart_id' => $cart['id']]);
                execute_statement($pdo, 'UPDATE carts SET updated_at = NOW() WHERE id = :id', [':id' => $cart['id']]);
            }

            $pdo->commit();
        } catch (Throwable $exception) {
            $pdo->rollBack();
            respond(['ok' => false, 'message' => 'No se pudo completar la compra.', 'error' => $exception->getMessage()], 500);
        }

        notify($pdo, $clientId, 'Compra exitosa', 'Tu compra fue procesada correctamente.', 'order');
        if ($adminId) {
            notify($pdo, $adminId, 'Nueva compra', 'Se registró una nueva compra en el sistema.', 'order');
        }

        respond(['ok' => true, 'message' => 'Compra completada.', 'id' => $orderId], 201);
    }
}

// =====================================
// BARBER CUTS / REGISTRO DE CORTES
// =====================================
if ($resource === 'cuts') {
    // Asegurar que la tabla existe
    try {
        $pdo->exec('CREATE TABLE IF NOT EXISTS barber_cuts (
            id VARCHAR(50) PRIMARY KEY,
            barber_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            service_id VARCHAR(50) NULL REFERENCES services(id) ON DELETE SET NULL,
            client_name VARCHAR(150) NOT NULL,
            service_name VARCHAR(150) NOT NULL,
            price NUMERIC(10,2) NOT NULL,
            notes TEXT,
            cut_date DATE NOT NULL DEFAULT CURRENT_DATE,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )');
    } catch (Throwable $e) {
        // Tabla ya existe, ignorar
    }

    // GET - Obtener cortes (barbero ve los suyos, admin ve todos)
    if ($method === 'GET' && !$id) {
        $actorId = (string) ($_GET['actor_id'] ?? '');
        $barberId = (string) ($_GET['barber_id'] ?? '');
        $dateFilter = (string) ($_GET['date'] ?? date('Y-m-d'));
        $limit = min(100, max(1, (int) ($_GET['limit'] ?? 50)));

        $actor = fetch_one($pdo, 'SELECT role FROM users WHERE id = :id', [':id' => $actorId]);
        if (!$actor) {
            respond(['ok' => false, 'message' => 'No autorizado.'], 403);
        }

        if ($actor['role'] === 'admin') {
            // Admin ve todos o filtra por barbero
            if ($barberId) {
                $cuts = fetch_all(
                    $pdo,
                    'SELECT c.*, u.full_name AS barber_name 
                     FROM barber_cuts c 
                     JOIN users u ON u.id = c.barber_id 
                     WHERE c.barber_id = :barber_id AND c.cut_date = :date
                     ORDER BY c.created_at DESC 
                     LIMIT :limit',
                    [':barber_id' => $barberId, ':date' => $dateFilter, ':limit' => $limit]
                );
            } else {
                $cuts = fetch_all(
                    $pdo,
                    'SELECT c.*, u.full_name AS barber_name 
                     FROM barber_cuts c 
                     JOIN users u ON u.id = c.barber_id 
                     WHERE c.cut_date = :date
                     ORDER BY c.created_at DESC 
                     LIMIT :limit',
                    [':date' => $dateFilter, ':limit' => $limit]
                );
            }
        } else if ($actor['role'] === 'barber') {
            // Barbero solo ve sus propios cortes
            $cuts = fetch_all(
                $pdo,
                'SELECT c.*, u.full_name AS barber_name 
                 FROM barber_cuts c 
                 JOIN users u ON u.id = c.barber_id 
                 WHERE c.barber_id = :barber_id AND c.cut_date = :date
                 ORDER BY c.created_at DESC 
                 LIMIT :limit',
                [':barber_id' => $actorId, ':date' => $dateFilter, ':limit' => $limit]
            );
        } else {
            respond(['ok' => false, 'message' => 'No autorizado.'], 403);
        }

        // Calcular totales
        $total = array_reduce($cuts, function($sum, $cut) {
            return $sum + (float) $cut['price'];
        }, 0);

        respond(['ok' => true, 'data' => $cuts, 'total' => $total, 'count' => count($cuts)]);
    }

    // GET - Resumen de ganancias por barbero (solo admin)
    if ($method === 'GET' && $id === 'summary') {
        $actorId = (string) ($_GET['actor_id'] ?? '');
        $dateFilter = (string) ($_GET['date'] ?? date('Y-m-d'));

        $actor = fetch_one($pdo, 'SELECT role FROM users WHERE id = :id', [':id' => $actorId]);
        if (!$actor || $actor['role'] !== 'admin') {
            respond(['ok' => false, 'message' => 'No autorizado.'], 403);
        }

        $summary = fetch_all(
            $pdo,
            'SELECT c.barber_id, u.full_name AS barber_name, u.avatar_url,
                    COUNT(*) AS total_cuts, SUM(c.price) AS total_earnings
             FROM barber_cuts c 
             JOIN users u ON u.id = c.barber_id 
             WHERE c.cut_date = :date
             GROUP BY c.barber_id, u.full_name, u.avatar_url
             ORDER BY total_earnings DESC',
            [':date' => $dateFilter]
        );

        $grandTotal = array_reduce($summary, function($sum, $row) {
            return $sum + (float) $row['total_earnings'];
        }, 0);

        respond(['ok' => true, 'data' => $summary, 'grandTotal' => $grandTotal, 'date' => $dateFilter]);
    }

    // POST - Registrar nuevo corte (solo barbero)
    if ($method === 'POST' && !$id) {
        $actorId = trim((string) ($input['actor_id'] ?? ''));
        $serviceId = trim((string) ($input['service_id'] ?? ''));
        $clientName = trim((string) ($input['client_name'] ?? ''));
        $serviceName = trim((string) ($input['service_name'] ?? ''));
        $price = (float) ($input['price'] ?? 0);
        $notes = trim((string) ($input['notes'] ?? ''));
        $cutDate = trim((string) ($input['cut_date'] ?? date('Y-m-d')));

        if ($clientName === '' || $serviceName === '' || $price <= 0) {
            respond(['ok' => false, 'message' => 'Datos incompletos.'], 400);
        }

        $actor = fetch_one($pdo, 'SELECT role, full_name FROM users WHERE id = :id', [':id' => $actorId]);
        if (!$actor || $actor['role'] !== 'barber') {
            respond(['ok' => false, 'message' => 'Solo los barberos pueden registrar cortes.'], 403);
        }

        $cutId = 'cut-' . bin2hex(random_bytes(8));

        execute_statement(
            $pdo,
            'INSERT INTO barber_cuts (id, barber_id, service_id, client_name, service_name, price, notes, cut_date)
             VALUES (:id, :barber_id, :service_id, :client_name, :service_name, :price, :notes, :cut_date)',
            [
                ':id' => $cutId,
                ':barber_id' => $actorId,
                ':service_id' => $serviceId ?: null,
                ':client_name' => $clientName,
                ':service_name' => $serviceName,
                ':price' => $price,
                ':notes' => $notes,
                ':cut_date' => $cutDate,
            ]
        );

        // Notificar al admin sobre el nuevo corte
        $adminId = first_admin_id($pdo);
        if ($adminId) {
            $barberName = $actor['full_name'];
            $priceFormatted = number_format($price, 2);
            notify($pdo, $adminId, 'Nuevo corte registrado', "{$barberName} registró: {$serviceName} - \${$priceFormatted}", 'cut');
        }

        respond(['ok' => true, 'message' => 'Corte registrado.', 'id' => $cutId], 201);
    }

    // DELETE - Eliminar corte (barbero dueño o admin)
    if ($method === 'DELETE' && $id) {
        $actorId = (string) ($_GET['actor_id'] ?? '');
        
        $actor = fetch_one($pdo, 'SELECT role FROM users WHERE id = :id', [':id' => $actorId]);
        if (!$actor) {
            respond(['ok' => false, 'message' => 'No autorizado.'], 403);
        }

        $cut = fetch_one($pdo, 'SELECT * FROM barber_cuts WHERE id = :id', [':id' => $id]);
        if (!$cut) {
            respond(['ok' => false, 'message' => 'Corte no encontrado.'], 404);
        }

        // Solo el barbero dueño o admin pueden eliminar
        if ($actor['role'] !== 'admin' && $cut['barber_id'] !== $actorId) {
            respond(['ok' => false, 'message' => 'No autorizado.'], 403);
        }

        execute_statement($pdo, 'DELETE FROM barber_cuts WHERE id = :id', [':id' => $id]);
        respond(['ok' => true, 'message' => 'Corte eliminado.']);
    }
}

// =====================================
// TESTIMONIALS / SUGERENCIAS
// =====================================
if ($resource === 'testimonials') {
    // GET - Obtener testimonios aprobados (públicos)
    if ($method === 'GET' && !$id) {
        $onlyApproved = ($_GET['approved'] ?? 'true') === 'true';
        $limit = min(50, max(1, (int) ($_GET['limit'] ?? 10)));
        
        if ($onlyApproved) {
            $testimonials = fetch_all(
                $pdo,
                'SELECT t.id, t.client_name, t.message, t.rating, t.created_at, t.is_featured, u.avatar_url AS client_avatar
                 FROM testimonials t
                 LEFT JOIN users u ON u.id = t.client_id
                 WHERE t.is_approved = true 
                 ORDER BY t.is_featured DESC, t.created_at DESC 
                 LIMIT :limit',
                [':limit' => $limit]
            );
        } else {
            // Solo admin puede ver todos
            $actorId = (string) ($_GET['actor_id'] ?? '');
            $actor = fetch_one($pdo, 'SELECT role FROM users WHERE id = :id', [':id' => $actorId]);
            if (!$actor || $actor['role'] !== 'admin') {
                respond(['ok' => false, 'message' => 'No autorizado.'], 403);
            }
            $testimonials = fetch_all(
                $pdo,
                'SELECT t.*, u.full_name AS user_name, u.avatar_url AS client_avatar
                 FROM testimonials t 
                 LEFT JOIN users u ON u.id = t.client_id 
                 ORDER BY t.created_at DESC 
                 LIMIT :limit',
                [':limit' => $limit]
            );
        }
        respond(['ok' => true, 'data' => $testimonials]);
    }

    // POST - Crear nuevo testimonio/sugerencia
    if ($method === 'POST' && !$id) {
        $clientId = trim((string) ($input['client_id'] ?? ''));
        $clientName = trim((string) ($input['client_name'] ?? ''));
        $clientEmail = trim((string) ($input['client_email'] ?? ''));
        $message = trim((string) ($input['message'] ?? ''));
        $rating = max(1, min(5, (int) ($input['rating'] ?? 5)));

        if ($message === '' || $clientName === '') {
            respond(['ok' => false, 'message' => 'El nombre y mensaje son obligatorios.'], 422);
        }

        // Si hay client_id, obtener datos del usuario
        if ($clientId !== '') {
            $user = fetch_one($pdo, 'SELECT full_name, email FROM users WHERE id = :id', [':id' => $clientId]);
            if ($user) {
                $clientName = $user['full_name'];
                $clientEmail = $user['email'];
            }
        }

        $testimonialId = uuid_like('test');
        execute_statement(
            $pdo,
            'INSERT INTO testimonials (id, client_id, client_name, client_email, message, rating, is_approved, is_featured, created_at)
             VALUES (:id, :client_id, :client_name, :client_email, :message, :rating, false, false, NOW())',
            [
                ':id' => $testimonialId,
                ':client_id' => $clientId !== '' ? $clientId : null,
                ':client_name' => $clientName,
                ':client_email' => $clientEmail,
                ':message' => $message,
                ':rating' => $rating,
            ]
        );

        // Notificar a admin
        $adminId = first_admin_id($pdo);
        if ($adminId) {
            notify($pdo, $adminId, 'Nueva sugerencia', $clientName . ' dejó una nueva sugerencia.', 'info');
        }

        respond(['ok' => true, 'message' => 'Gracias por tu sugerencia. Será revisada pronto.', 'id' => $testimonialId], 201);
    }

    // PATCH - Aprobar/destacar testimonio (solo admin)
    if ($method === 'PATCH' && $id) {
        $actorId = (string) ($input['actor_id'] ?? '');
        $actor = fetch_one($pdo, 'SELECT role FROM users WHERE id = :id', [':id' => $actorId]);
        if (!$actor || $actor['role'] !== 'admin') {
            respond(['ok' => false, 'message' => 'No autorizado.'], 403);
        }

        $testimonial = fetch_one($pdo, 'SELECT * FROM testimonials WHERE id = :id', [':id' => $id]);
        if (!$testimonial) {
            respond(['ok' => false, 'message' => 'Testimonio no encontrado.'], 404);
        }

        $isApproved = isset($input['is_approved']) ? (bool) $input['is_approved'] : (bool) $testimonial['is_approved'];
        $isFeatured = isset($input['is_featured']) ? (bool) $input['is_featured'] : (bool) $testimonial['is_featured'];

        // Si se aprueba ahora, establecer fecha de aprobación
        $approvedAt = $isApproved && !$testimonial['is_approved'] ? date('Y-m-d H:i:s') : $testimonial['approved_at'];

        execute_statement(
            $pdo,
            'UPDATE testimonials SET is_approved = :approved, is_featured = :featured, approved_at = :approved_at WHERE id = :id',
            [':approved' => $isApproved ? 'true' : 'false', ':featured' => $isFeatured ? 'true' : 'false', ':approved_at' => $approvedAt, ':id' => $id]
        );

        respond(['ok' => true, 'message' => 'Testimonio actualizado.']);
    }

    // DELETE - Eliminar testimonio (solo admin)
    if ($method === 'DELETE' && $id) {
        $actorId = (string) ($_GET['actor_id'] ?? '');
        $actor = fetch_one($pdo, 'SELECT role FROM users WHERE id = :id', [':id' => $actorId]);
        if (!$actor || $actor['role'] !== 'admin') {
            respond(['ok' => false, 'message' => 'No autorizado.'], 403);
        }

        execute_statement($pdo, 'DELETE FROM testimonials WHERE id = :id', [':id' => $id]);
        respond(['ok' => true, 'message' => 'Testimonio eliminado.']);
    }
}

respond([
    'ok' => false,
    'message' => 'Ruta no encontrada.',
], 404);
