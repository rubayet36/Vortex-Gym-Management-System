<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$id     = $_GET['id'] ?? null;

// GET /api/payments.php              → get payments (supports ?dues_only=1 or ?user_id=UUID)
// POST /api/payments.php             → record new payment
// PUT /api/payments.php?id=UUID      → update payment

if ($method === 'GET') {
    $userId = $_GET['user_id'] ?? null;
    $duesOnly = isset($_GET['dues_only']) && $_GET['dues_only'] == '1';

    $sql = "SELECT py.*,
                   py.discount AS discount_amount,
                   p.first_name, p.last_name, p.phone_number, p.email, p.pin, p.member_id,
                   (
                     SELECT pk.name
                     FROM user_subscriptions sub
                     JOIN packages pk ON pk.id = sub.package_id
                     WHERE sub.user_id = py.user_id
                       AND sub.start_date <= DATE(py.payment_date)
                     ORDER BY sub.start_date DESC
                     LIMIT 1
                   ) AS package_name
            FROM payments py
            JOIN profiles p ON p.id = py.user_id
            WHERE 1=1";
    
    $params = [];

    if ($userId) {
        $sql .= " AND py.user_id = ?";
        $params[] = $userId;
    }
    
    if ($duesOnly) {
        $sql .= " AND py.due_amount > 0";
    }

    $startDate = $_GET['start_date'] ?? null;
    $endDate = $_GET['end_date'] ?? null;

    if ($startDate) {
        $sql .= " AND py.payment_date >= ?";
        $params[] = $startDate . ' 00:00:00';
    }
    if ($endDate) {
        $sql .= " AND py.payment_date <= ?";
        $params[] = $endDate . ' 23:59:59';
    }

    $sql .= " ORDER BY py.payment_date DESC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Calculate totals
    // total_collections = sum of all paid_amount
    // total_dues = net outstanding = SUM(due from REGULAR payments) - SUM(paid from DUE_PAYMENT records)
    $total_collections = 0;
    $due_from_regular = 0;   // what was originally owed
    $repaid_via_due   = 0;   // what has since been paid back
    
    foreach ($data as $row) {
        $total_collections += (float)$row['paid_amount'];
        $ptype = $row['payment_type'] ?? '';
        $isDueRepayment = ($ptype === 'DUE_PAYMENT') || (stripos($ptype, 'Due Clear') === 0) || (stripos($ptype, 'Partial Due') === 0);
        if ($isDueRepayment) {
            // This row is a repayment of an old due → reduce outstanding
            $repaid_via_due += (float)$row['paid_amount'];
        } else {
            // Regular / advance / new payment row → adds to original outstanding
            $due_from_regular += (float)$row['due_amount'];
        }
    }
    
    $total_dues = max(0, $due_from_regular - $repaid_via_due);

    sendJson([
        'data' => $data, 
        'count' => count($data),
        'summary' => [
            'total_collections' => $total_collections,
            'total_dues' => $total_dues
        ]
    ]);
}
elseif ($method === 'POST') {
    $userId = $body['user_id'] ?? null;
    
    // Use payment_date from frontend (device local time) if provided,
    // otherwise fall back to server Dhaka time
    if (!empty($body['payment_date'])) {
        $paymentDate = $body['payment_date'];
    } else {
        $dhakaZone   = new DateTimeZone('Asia/Dhaka');
        $dhakaTime   = new DateTime('now', $dhakaZone);
        $paymentDate = $dhakaTime->format('Y-m-d H:i:s');
    }
    
    $paymentType = $body['payment_type'] ?? 'REGULAR_PAYMENT';
    $paymentMethod = $body['payment_method'] ?? 'CASH';
    $total = $body['total_amount'] ?? 0;
    $discount = $body['discount'] ?? 0;
    $paid = $body['paid_amount'] ?? 0;
    $due = $body['due_amount'] ?? 0;
    
    if (!$userId) {
        sendJson(['error' => 'user_id is required'], 400);
    }
    
    $newId = generateUUID();
    $stmt = $db->prepare(
        "INSERT INTO payments (id, user_id, payment_date, payment_type, payment_method, total_amount, discount, paid_amount, due_amount) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([$newId, $userId, $paymentDate, $paymentType, $paymentMethod, $total, $discount, $paid, $due]);
    
    sendJson(['data' => ['id' => $newId]], 201);
}
elseif ($method === 'PUT') {
    if (!$id) sendJson(['error' => 'Payment ID required'], 400);

    $allowed = ['due_amount', 'paid_amount', 'total_amount', 'payment_type', 'payment_method', 'discount'];
    $setClauses = [];
    $params = [];

    foreach ($allowed as $field) {
        if (array_key_exists($field, $body)) {
            $setClauses[] = "$field = ?";
            $params[] = $body[$field];
        }
    }

    if (empty($setClauses)) {
        sendJson(['error' => 'No valid fields to update'], 400);
    }

    $params[] = $id;
    $stmt = $db->prepare("UPDATE payments SET " . implode(', ', $setClauses) . " WHERE id = ?");
    $stmt->execute($params);

    sendJson(['data' => ['updated' => true]]);
}
elseif ($method === 'DELETE') {
    if (!$id) sendJson(['error' => 'Payment ID required'], 400);
    
    // Fetch the payment to get user_id and — crucially — the subscription_id
    // that was stored at creation time. This gives us an exact match.
    $stmt = $db->prepare("SELECT user_id, subscription_id, created_at FROM payments WHERE id = ?");
    $stmt->execute([$id]);
    $pay = $stmt->fetch();
    
    if ($pay) {
        $userId = $pay['user_id'];
        $createdAt = $pay['created_at'];

        // PRIMARY: delete by exact subscription_id stored in the payment row
        if (!empty($pay['subscription_id'])) {
            $db->prepare("DELETE FROM user_subscriptions WHERE id = ?")
               ->execute([$pay['subscription_id']]);
        } else {
            // FALLBACK for old payments created before subscription_id column existed:
            // use a 60-second timestamp window to find the closest subscription
            $subStmt = $db->prepare(
                "SELECT id FROM user_subscriptions
                 WHERE user_id = ?
                   AND ABS(TIMESTAMPDIFF(SECOND, created_at, ?)) <= 60
                 ORDER BY ABS(TIMESTAMPDIFF(SECOND, created_at, ?)) ASC
                 LIMIT 1"
            );
            $subStmt->execute([$userId, $createdAt, $createdAt]);
            $sub = $subStmt->fetch();
            if ($sub) {
                $db->prepare("DELETE FROM user_subscriptions WHERE id = ?")->execute([$sub['id']]);
            }
        }
    }

    $stmt = $db->prepare("DELETE FROM payments WHERE id = ?");
    $stmt->execute([$id]);

    // Roleback user subscription status if we deleted a payment/subscription for them
    if ($pay && isset($userId)) {
        // Find the next latest subscription
        $latestSubStmt = $db->prepare("SELECT id, end_date FROM user_subscriptions WHERE user_id = ? ORDER BY end_date DESC LIMIT 1");
        $latestSubStmt->execute([$userId]);
        $latestSub = $latestSubStmt->fetch();

        if ($latestSub) {
            // Revive the previous latest subscription
            $db->prepare("UPDATE user_subscriptions SET status = 'active' WHERE id = ?")->execute([$latestSub['id']]);
            // Check if it's currently valid
            $is_active = (strtotime($latestSub['end_date']) >= strtotime(date('Y-m-d'))) ? 1 : 0;
            $db->prepare("UPDATE profiles SET is_active = ? WHERE id = ?")->execute([$is_active, $userId]);
        } else {
            // No subscriptions left at all
            $db->prepare("UPDATE profiles SET is_active = 0 WHERE id = ?")->execute([$userId]);
        }
    }

    sendJson(['data' => ['deleted' => true]]);
}
else {
    sendJson(['error' => 'Method not allowed'], 405);
}
