<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$id     = $_GET['id'] ?? null;

// GET  /api/subscriptions.php?user_id=UUID   → subscriptions for a user
// GET  /api/subscriptions.php?status=expired → filtered by status
// GET  /api/subscriptions.php?expiring_soon=1 → expiring in 5 days
// POST /api/subscriptions.php                → create new subscription
// PUT  /api/subscriptions.php?id=UUID        → update status / renew

if ($method === 'GET') {
    $userId       = $_GET['user_id'] ?? null;
    $status       = $_GET['status'] ?? null;
    $expiringSoon = isset($_GET['expiring_soon']);

    $sql    = "SELECT us.*, p.first_name, p.last_name, p.email, p.phone_number,
                      pk.name as package_name, pk.duration_days
               FROM user_subscriptions us
               JOIN profiles p  ON p.id = us.user_id
               JOIN packages pk ON pk.id = us.package_id
               WHERE 1=1";
    $params = [];

    if ($userId) {
        $sql    .= " AND us.user_id = ?";
        $params[] = $userId;
    } else {
        // For global lists (like Expired or Expiring Soon dashboards), only consider the user's latest subscription
        $sql    .= " AND us.id = (SELECT id FROM user_subscriptions s2 WHERE s2.user_id = us.user_id ORDER BY s2.created_at DESC LIMIT 1)";
    }
    if ($status === 'expired') {
        // Include subscriptions explicitly marked expired OR those with a past end_date
        // (covers members whose end_date lapsed but status was never updated)
        $today = date('Y-m-d');
        $sql .= " AND (us.status = 'expired' OR (us.status = 'active' AND us.end_date < ?))";
        $params[] = $today;
    } elseif ($status) {
        $sql    .= " AND us.status = ?";
        $params[] = $status;
    }
    if ($expiringSoon) {
        $today       = date('Y-m-d');
        $fiveDaysOut = date('Y-m-d', strtotime('+5 days'));
        $sql    .= " AND us.end_date BETWEEN ? AND ?";
        $params[] = $today;
        $params[] = $fiveDaysOut;
    }

    // For expired list: sort by end_date DESC so most recently expired users come first
    if ($status === 'expired') {
        $sql .= " ORDER BY us.end_date DESC";
    } else {
        $sql .= " ORDER BY us.created_at DESC";
    }

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $data = $stmt->fetchAll();
    sendJson(['data' => $data, 'count' => count($data)]);
}

elseif ($method === 'POST') {
    $userId    = $body['user_id'] ?? null;
    $packageId = $body['package_id'] ?? null;
    $startDate = $body['start_date'] ?? date('Y-m-d');

    if (!$userId || !$packageId) {
        sendJson(['error' => 'user_id and package_id are required'], 400);
    }

    // Fetch package to calculate end_date and price
    $pkgStmt = $db->prepare("SELECT duration_days, price FROM packages WHERE id = ? LIMIT 1");
    $pkgStmt->execute([$packageId]);
    $pkg = $pkgStmt->fetch();
    if (!$pkg) sendJson(['error' => 'Package not found'], 404);

    $endDate = date('Y-m-d', strtotime($startDate . " + {$pkg['duration_days']} days"));
    // Allow caller to override the calculated end_date (e.g. EditMemberModal setting a manual expiry)
    if (!empty($body['end_date_override'])) {
        $endDate = $body['end_date_override'];
    }
    $newId   = generateUUID();
    
    $discount = isset($body['discount']) ? (float)$body['discount'] : 0.0;
    $paymentMethod = strtoupper($body['paymentMethod'] ?? $body['payment_method'] ?? 'CASH');
    $totalAmount = (float)$pkg['price'];
    $amountPaid = isset($body['paid_amount_override']) ? (float)$body['paid_amount_override'] : max(0, $totalAmount - $discount);
    $dueAmount = isset($body['due_amount_override']) ? (float)$body['due_amount_override'] : max(0, $totalAmount - $discount - $amountPaid);

    // Expire any existing active subscription for user
    $db->prepare("UPDATE user_subscriptions SET status = 'expired' WHERE user_id = ? AND status = 'active'")
       ->execute([$userId]);

    // Ensure user is marked active again on renewal
    $db->prepare("UPDATE profiles SET is_active = 1 WHERE id = ?")->execute([$userId]);

    $stmt = $db->prepare(
        "INSERT INTO user_subscriptions (id, user_id, package_id, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, 'active')"
    );
    $stmt->execute([$newId, $userId, $packageId, $startDate, $endDate]);

    // Record the payment if a real package (non-zero duration)
    if ($totalAmount > 0 || $discount > 0) {
        $paymentId = generateUUID();
        // Use payment_date from frontend (device local time) if provided,
        // otherwise fall back to server Dhaka time
        if (!empty($body['payment_date'])) {
            $paymentDate = $body['payment_date'];
        } else {
            $dhakaZone   = new DateTimeZone('Asia/Dhaka');
            $dhakaTime   = new DateTime('now', $dhakaZone);
            $paymentDate = $dhakaTime->format('Y-m-d H:i:s');
        }
        $db->prepare(
            "INSERT INTO payments (id, user_id, subscription_id, payment_date, payment_type, payment_method, total_amount, discount, paid_amount, due_amount)
             VALUES (?, ?, ?, ?, 'Package Subscription', ?, ?, ?, ?, ?)"
        )->execute([$paymentId, $userId, $newId, $paymentDate, $paymentMethod, $totalAmount, $discount, $amountPaid, $dueAmount]);
    }

    sendJson(['data' => ['id' => $newId, 'end_date' => $endDate, 'amount_paid' => $amountPaid]], 201);
}

elseif ($method === 'PUT') {
    if (!$id) sendJson(['error' => 'ID is required'], 400);

    $fields = [];
    $params = [];
    foreach (['status', 'end_date', 'package_id'] as $f) {
        if (array_key_exists($f, $body)) {
            $fields[] = "$f = ?";
            $params[] = $body[$f];
        }
    }
    if (empty($fields)) sendJson(['error' => 'No fields to update'], 400);

    $params[] = $id;
    $stmt = $db->prepare("UPDATE user_subscriptions SET " . implode(', ', $fields) . " WHERE id = ?");
    $stmt->execute($params);
    sendJson(['data' => ['updated' => true]]);
}

else {
    sendJson(['error' => 'Method not allowed'], 405);
}
