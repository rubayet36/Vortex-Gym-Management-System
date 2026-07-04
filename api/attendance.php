<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$id     = $_GET['id'] ?? null;

// GET  /api/attendance.php?user_id=UUID  → records for a user
// GET  /api/attendance.php?date=YYYY-MM-DD → records for a day
// GET  /api/attendance.php               → all records (recent 100)
// POST /api/attendance.php               → log a new check-in
// PUT  /api/attendance.php?id=UUID       → update check-out time

if ($method === 'GET') {
    $userId = $_GET['user_id'] ?? null;
    $date   = $_GET['date'] ?? null;
    $search = $_GET['search'] ?? null;

    $sql    = "SELECT a.*, p.first_name, p.last_name, p.email, p.phone_number
               FROM attendance a
               JOIN profiles p ON p.id = a.user_id
               WHERE 1=1";
    $params = [];

    if ($userId) {
        $sql    .= " AND a.user_id = ?";
        $params[] = $userId;
    }
    if ($date) {
        $sql    .= " AND a.date = ?";
        $params[] = $date;
    }
    if ($search) {
        $sql    .= " AND (p.first_name LIKE ? OR p.last_name LIKE ? OR CONCAT(p.first_name,' ',p.last_name) LIKE ? OR p.pin LIKE ? OR p.phone_number LIKE ?)";
        $like    = "%{$search}%";
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }

    $sql .= " ORDER BY a.check_in_time DESC LIMIT 300";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $data = $stmt->fetchAll();
    sendJson(['data' => $data, 'count' => count($data)]);
}

elseif ($method === 'POST') {
    $userId      = $body['user_id'] ?? null;
    $checkInTime = $body['check_in_time'] ?? date('Y-m-d H:i:s');
    $date        = $body['date'] ?? date('Y-m-d');

    if (!$userId) sendJson(['error' => 'user_id is required'], 400);

    $newId = generateUUID();
    $stmt  = $db->prepare(
        "INSERT INTO attendance (id, user_id, check_in_time, date) VALUES (?, ?, ?, ?)"
    );
    $stmt->execute([$newId, $userId, $checkInTime, $date]);

    sendJson(['data' => ['id' => $newId]], 201);
}

elseif ($method === 'PUT') {
    if (!$id) sendJson(['error' => 'ID is required'], 400);

    $checkOutTime = $body['check_out_time'] ?? date('Y-m-d H:i:s');
    $stmt = $db->prepare("UPDATE attendance SET check_out_time = ? WHERE id = ?");
    $stmt->execute([$checkOutTime, $id]);
    sendJson(['data' => ['updated' => true]]);
}

else {
    sendJson(['error' => 'Method not allowed'], 405);
}
