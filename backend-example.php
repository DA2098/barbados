<?php
// Ejemplo de conexión backend para WampServer (MySQL/phpMyAdmin) y React

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

// Configuración de base de datos MySQL para WampServer
$host = '127.0.0.1';
$db   = 'barber_shop'; // Cambia esto por el nombre de tu base de datos en phpMyAdmin
$user = 'root';           // Usuario por defecto en WampServer
$pass = '';               // Contraseña por defecto en WampServer (suele estar vacía)

try {
    // Conexión PDO a MySQL
    $dsn = "mysql:host=$host;dbname=$db;charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Error de conexión a MySQL: " . $e->getMessage()]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$request_uri = $_SERVER['REQUEST_URI'];

// Ejemplo de Endpoint para obtener usuarios
if ($method === 'GET' && strpos($request_uri, '/api/users') !== false) {
    $stmt = $pdo->query('SELECT id, name, email, role, phone FROM users');
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($users);
    exit;
}

// Ejemplo de Endpoint para eliminar un usuario
if ($method === 'DELETE' && preg_match('/\/api\/users\/(\d+)/', $request_uri, $matches)) {
    $userId = $matches[1];
    $stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    echo json_encode(["message" => "Usuario eliminado correctamente"]);
    exit;
}

echo json_encode(["message" => "API Backend con MySQL lista"]);
?>
