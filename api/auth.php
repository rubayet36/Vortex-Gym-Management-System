<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$body   = json_decode(file_get_contents('php://input'), true) ?? [];

// POST /api/auth.php?action=login
// POST /api/auth.php?action=signup
$action = $_GET['action'] ?? '';

if ($method === 'POST' && $action === 'login') {
    $email    = trim($body['email'] ?? '');
    $password = $body['password'] ?? '';

    if (!$email || !$password) {
        sendJson(['error' => 'Email and password are required'], 400);
    }

    $db   = getDB();
    $stmt = $db->prepare("SELECT * FROM profiles WHERE email = ? AND is_active = 1 LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        sendJson(['error' => 'Invalid email or password'], 401);
    }

    // Remove password hash before sending
    unset($user['password_hash']);

    // Simple session token (base64 of user id + timestamp). For production, use JWT.
    $token = base64_encode($user['id'] . ':' . time());

    sendJson(['data' => ['user' => $user, 'token' => $token]]);
}

elseif ($method === 'POST' && $action === 'signup') {
    $email     = trim($body['email'] ?? '');
    $password  = $body['password'] ?? '';
    $firstName = $body['first_name'] ?? '';
    $lastName  = $body['last_name'] ?? '';
    $role      = $body['role'] ?? 'member';
    $phone     = $body['phone_number'] ?? null;

    if (!$email || !$password) {
        sendJson(['error' => 'Email and password are required'], 400);
    }

    $db = getDB();

    // Check existing email
    $check = $db->prepare("SELECT id FROM profiles WHERE email = ? LIMIT 1");
    $check->execute([$email]);
    if ($check->fetch()) {
        sendJson(['error' => 'Email already registered'], 409);
    }

    $id   = generateUUID();
    $hash = password_hash($password, PASSWORD_BCRYPT);

    $stmt = $db->prepare(
        "INSERT INTO profiles (id, email, password_hash, first_name, last_name, phone_number, role, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)"
    );
    $stmt->execute([$id, $email, $hash, $firstName, $lastName, $phone, $role]);

    sendJson(['data' => ['user' => ['id' => $id, 'email' => $email, 'role' => $role]]]);
}

// GET /api/auth.php?action=session  (validate token and return current user)
elseif ($method === 'GET' && $action === 'session') {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
        sendJson(['data' => null]);
    }
    $token = substr($authHeader, 7);
    $decoded = base64_decode($token);
    [$userId] = explode(':', $decoded);

    $db   = getDB();
    $stmt = $db->prepare("SELECT id, email, first_name, last_name, role, phone_number, avatar_url, is_active FROM profiles WHERE id = ? LIMIT 1");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    sendJson(['data' => $user ?: null]);
}

else {
    sendJson(['error' => 'Invalid action or method'], 400);
}
