<?php
// ─── Database Configuration ──────────────────────────────────────────────────
// Edit these values to match your XAMPP MySQL setup
define('DB_HOST', 'localhost');
define('DB_NAME', 'vortex_gym');     // Name of your database in phpMyAdmin
define('DB_USER', 'root');           // Default XAMPP MySQL user
define('DB_PASS', '');               // Default XAMPP MySQL password (empty)
define('DB_CHARSET', 'utf8mb4');

// ─── Global CORS Headers (Allow React dev server to call this API) ───────────
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// ─── Default Timezone ───────────────────────────────────────────────────────
date_default_timezone_set('Asia/Dhaka');

// Return 200 for preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ─── PDO Connection ──────────────────────────────────────────────────────────
function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
            // Set MySQL session timezone to Dhaka (UTC+6) so all date functions
            // (NOW(), CURRENT_TIMESTAMP, DATE(), etc.) return local Dhaka time
            $pdo->exec("SET time_zone = '+06:00'");
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
            exit();
        }
    }
    return $pdo;
}

// ─── Helper: Send JSON response ───────────────────────────────────────────────
function sendJson($data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data);
    exit();
}

// ─── Helper: Generate UUID v4 ─────────────────────────────────────────────────
function generateUUID(): string {
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}
