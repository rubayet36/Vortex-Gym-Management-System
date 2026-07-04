<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$id     = $_GET['id'] ?? null;

// GET /api/profiles.php              → all profiles (with optional ?role=member)
// GET /api/profiles.php?id=UUID      → single profile
// POST /api/profiles.php             → create profile
// PUT /api/profiles.php?id=UUID      → update profile
// DELETE /api/profiles.php?id=UUID   → delete profile

if ($method === 'GET') {
    if ($id) {
        $stmt = $db->prepare(
            "SELECT p.*, us.id as sub_id, us.package_id, us.start_date, us.end_date, us.status as sub_status,
                    pk.name as package_name, pk.duration_days,
                    GREATEST(0,
                      COALESCE((SELECT SUM(py.due_amount)  FROM payments py WHERE py.user_id = p.id AND py.payment_type NOT IN ('DUE_PAYMENT') AND py.payment_type NOT LIKE 'Due Clear%' AND py.payment_type NOT LIKE 'Partial Due%'), 0) -
                      COALESCE((SELECT SUM(py.paid_amount) FROM payments py WHERE py.user_id = p.id AND (py.payment_type = 'DUE_PAYMENT' OR py.payment_type LIKE 'Due Clear%' OR py.payment_type LIKE 'Partial Due%')), 0)
                    ) AS total_due
             FROM profiles p
             LEFT JOIN user_subscriptions us ON us.id = (
                 SELECT id FROM user_subscriptions s2 
                 WHERE s2.user_id = p.id 
                 ORDER BY s2.created_at DESC LIMIT 1
             )
             LEFT JOIN packages pk ON pk.id = us.package_id
             WHERE p.id = ? LIMIT 1"
        );
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        sendJson(['data' => $user]);
    } else {
        $role = $_GET['role'] ?? null;
        $isActive = $_GET['is_active'] ?? null;

        $sql    = "SELECT p.id, p.email, p.first_name, p.last_name, p.phone_number, p.member_id, p.pin, p.cardno, p.gender, p.blood_group, p.role, p.avatar_url, p.is_active, p.is_paused, p.pause_note, p.created_at, p.address, p.dob, p.occupation, p.height, p.weight,
                          us.id as sub_id, us.end_date, us.status as sub_status, pk.name as package_name, pk.duration_days,
                          GREATEST(0,
                            COALESCE((SELECT SUM(py.due_amount)  FROM payments py WHERE py.user_id = p.id AND py.payment_type NOT IN ('DUE_PAYMENT') AND py.payment_type NOT LIKE 'Due Clear%' AND py.payment_type NOT LIKE 'Partial Due%'), 0) -
                            COALESCE((SELECT SUM(py.paid_amount) FROM payments py WHERE py.user_id = p.id AND (py.payment_type = 'DUE_PAYMENT' OR py.payment_type LIKE 'Due Clear%' OR py.payment_type LIKE 'Partial Due%')), 0)
                          ) AS total_due
                   FROM profiles p
                   LEFT JOIN user_subscriptions us ON us.id = (
                       SELECT id FROM user_subscriptions s2
                       WHERE s2.user_id = p.id
                       ORDER BY s2.created_at DESC LIMIT 1
                   )
                   LEFT JOIN packages pk ON pk.id = us.package_id
                   WHERE 1=1";
        $params = [];

        if ($role) {
            $sql    .= " AND p.role = ?";
            $params[] = $role;
        }
        if ($isActive !== null) {
            $sql    .= " AND p.is_active = ?";
            $params[] = (int) $isActive;
        }

        $sql .= " ORDER BY p.created_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll();
        sendJson(['data' => $data, 'count' => count($data)]);
    }
}

elseif ($method === 'POST') {
    $email     = trim($body['email'] ?? '');
    $password  = $body['password'] ?? 'ChangeMe123!';
    $firstName = $body['first_name'] ?? '';
    $lastName  = $body['last_name'] ?? '';
    $phone     = $body['phone_number'] ?? null;
    $member_id   = $body['member_id'] ?? null;
    $pin         = $body['pin'] ?? null;
    $cardno      = $body['cardno'] ?? 0;
    $gender      = $body['gender'] ?? null;
    $blood_group = $body['blood_group'] ?? null;
    $role        = $body['role'] ?? 'member';
    $avatar      = $body['avatar_url'] ?? null;
    $address     = $body['address'] ?? null;
    $dob         = $body['dob'] ?? null;
    $occupation  = $body['occupation'] ?? null;
    $height      = $body['height'] ?? null;
    $weight      = $body['weight'] ?? null;

    if (!$email) {
        sendJson(['error' => 'Email is required'], 400);
    }

    // Check duplicate email
    $check = $db->prepare("SELECT id FROM profiles WHERE email = ? LIMIT 1");
    $check->execute([$email]);
    if ($check->fetch()) {
        sendJson(['error' => 'Email already registered'], 409);
    }

    $newId = generateUUID();
    $hash  = password_hash($password, PASSWORD_BCRYPT);

    $stmt = $db->prepare(
        "INSERT INTO profiles (id, email, password_hash, first_name, last_name, phone_number, member_id, pin, cardno, gender, blood_group, role, avatar_url, address, dob, occupation, height, weight, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)"
    );
    $stmt->execute([$newId, $email, $hash, $firstName, $lastName, $phone, $member_id, $pin, $cardno, $gender, $blood_group, $role, $avatar, $address, $dob, $occupation, $height, $weight]);

    sendJson(['data' => ['id' => $newId, 'email' => $email, 'role' => $role]], 201);
}

elseif ($method === 'PUT') {
    if (!$id) sendJson(['error' => 'ID is required'], 400);

    $fields = [];
    $params = [];

    $allowed = ['first_name', 'last_name', 'phone_number', 'member_id', 'pin', 'cardno', 'gender', 'blood_group', 'role', 'avatar_url', 'is_active', 'is_paused', 'pause_note', 'address', 'dob', 'occupation', 'height', 'weight'];
    foreach ($allowed as $field) {
        if (array_key_exists($field, $body)) {
            $fields[] = "$field = ?";
            $params[] = $body[$field];
        }
    }
    if (!empty($body['password'])) {
        $fields[] = "password_hash = ?";
        $params[] = password_hash($body['password'], PASSWORD_BCRYPT);
    }

    if (empty($fields)) sendJson(['error' => 'No fields to update'], 400);

    $params[] = $id;
    $stmt = $db->prepare("UPDATE profiles SET " . implode(', ', $fields) . " WHERE id = ?");
    $stmt->execute($params);

    sendJson(['data' => ['id' => $id, 'updated' => true]]);
}

elseif ($method === 'DELETE') {
    if (!$id) sendJson(['error' => 'ID is required'], 400);
    // Cascade-delete all orphaned rows before removing the profile
    $db->prepare("DELETE FROM payments WHERE user_id = ?")->execute([$id]);
    $db->prepare("DELETE FROM user_subscriptions WHERE user_id = ?")->execute([$id]);
    $db->prepare("DELETE FROM attendance WHERE user_id = ?")->execute([$id]);
    $stmt = $db->prepare("DELETE FROM profiles WHERE id = ?");
    $stmt->execute([$id]);
    sendJson(['data' => ['deleted' => true]]);
}

else {
    sendJson(['error' => 'Method not allowed'], 405);
}
