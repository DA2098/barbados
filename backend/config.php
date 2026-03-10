<?php

declare(strict_types=1);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
if (!str_contains($uriPath, '/uploads/')) {
    header('Content-Type: application/json; charset=utf-8');
}

return [
    'db' => [
        'host' => getenv('DB_HOST') ?: '127.0.0.1',
        'port' => getenv('DB_PORT') ? (int)getenv('DB_PORT') : 5432,
        'dbname' => getenv('DB_NAME') ?: 'barberpro360',
        'user' => getenv('DB_USER') ?: 'postgres',
        'password' => getenv('DB_PASS') ?: 'password',
    ],
];
