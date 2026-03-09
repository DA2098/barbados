<?php

declare(strict_types=1);

function json_input(): array
{
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($contentType, 'multipart/form-data') !== false) {
        return $_POST;
    }

    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }

    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function uuid_like(string $prefix): string
{
    return sprintf('%s-%s', $prefix, bin2hex(random_bytes(4)));
}

function uploads_path(): string
{
    $path = __DIR__ . '/uploads';
    if (!is_dir($path)) {
        mkdir($path, 0777, true);
    }
    return $path;
}

function public_upload_url(string $fileName): string
{
    $scriptName = $_SERVER['SCRIPT_NAME'] ?? '/index.php';
    $baseDir = rtrim(str_replace('/index.php', '', $scriptName), '/');
    return ($baseDir === '' ? '' : $baseDir) . '/uploads/' . $fileName;
}

function default_avatar_for_role(string $role): string
{
    return match ($role) {
        'admin' => 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
        'barber' => 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
        default => 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=400&q=80',
    };
}

function delete_upload_from_url(?string $url): void
{
    if (!$url || !str_contains($url, '/uploads/')) {
        return;
    }

    $path = parse_url($url, PHP_URL_PATH);
    $file = basename((string) $path);
    if ($file === '' || $file === '.gitkeep') {
        return;
    }

    $fullPath = uploads_path() . '/' . $file;
    if (is_file($fullPath)) {
        @unlink($fullPath);
    }
}

function save_uploaded_media(string $fieldName, array $allowedPrefixes = ['image/', 'audio/']): ?array
{
    if (!isset($_FILES[$fieldName]) || !is_array($_FILES[$fieldName])) {
        return null;
    }

    $file = $_FILES[$fieldName];
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        throw new RuntimeException('No se pudo subir el archivo adjunto.');
    }

    $tmp = $file['tmp_name'] ?? '';
    if ($tmp === '' || !is_uploaded_file($tmp)) {
        throw new RuntimeException('Archivo adjunto inválido.');
    }

    $mime = mime_content_type($tmp) ?: 'application/octet-stream';
    $allowed = false;
    foreach ($allowedPrefixes as $prefix) {
        if (str_starts_with($mime, $prefix)) {
            $allowed = true;
            break;
        }
    }

    if (!$allowed) {
        throw new RuntimeException('Tipo de archivo no permitido.');
    }

    $extension = pathinfo((string) ($file['name'] ?? ''), PATHINFO_EXTENSION);
    $safeFileName = uuid_like('media') . ($extension ? '.' . strtolower($extension) : '');
    $destination = uploads_path() . '/' . $safeFileName;

    if (!move_uploaded_file($tmp, $destination)) {
        throw new RuntimeException('No se pudo almacenar el archivo adjunto.');
    }

    return [
        'name' => (string) ($file['name'] ?? $safeFileName),
        'url' => public_upload_url($safeFileName),
        'mime' => $mime,
        'size' => (int) ($file['size'] ?? 0),
    ];
}
