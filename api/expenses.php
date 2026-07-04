<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$id     = $_GET['id'] ?? null;

// GET /api/expenses.php
// GET /api/expenses.php?id=UUID
if ($method === 'GET') {
    if ($id) {
        $stmt = $db->prepare("SELECT e.*, p.first_name, p.last_name FROM expenses e JOIN profiles p ON e.logged_by = p.id WHERE e.id = ?");
        $stmt->execute([$id]);
        $expense = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($expense) {
            sendJson(['data' => $expense]);
        } else {
            sendJson(['error' => 'Expense not found'], 404);
        }
    } else {
        $sql = "SELECT e.*, p.first_name, p.last_name FROM expenses e JOIN profiles p ON e.logged_by = p.id WHERE 1=1";
        $params = [];

        $startDate = $_GET['start_date'] ?? null;
        $endDate = $_GET['end_date'] ?? null;

        if ($startDate) {
            $sql .= " AND e.date >= ?";
            $params[] = $startDate;
        }
        if ($endDate) {
            $sql .= " AND e.date <= ?";
            $params[] = $endDate;
        }

        $sql .= " ORDER BY e.date DESC, e.created_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Calculate total summary
        $total_expenses = 0;
        foreach ($data as $row) {
            $total_expenses += (float)$row['amount'];
        }

        sendJson([
            'data' => $data, 
            'count' => count($data),
            'summary' => [
                'total_expenses' => $total_expenses
            ]
        ]);
    }
}
// POST /api/expenses.php
elseif ($method === 'POST') {
    $loggedBy = $body['logged_by'] ?? null;
    $category = $body['category'] ?? 'OTHER';
    $amount = $body['amount'] ?? 0;
    $description = $body['description'] ?? '';
    $dhakaZone = new DateTimeZone('Asia/Dhaka');
    $dhakaTime = new DateTime('now', $dhakaZone);
    $date      = $body['date'] ?? $dhakaTime->format('Y-m-d');
    if (!$loggedBy) {
        // Fallback to first admin if not provided via token natively yet
        $stmt = $db->query("SELECT id FROM profiles WHERE role IN ('owner', 'manager') LIMIT 1");
        $admin = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($admin) {
            $loggedBy = $admin['id'];
        } else {
            sendJson(['error' => 'logged_by is required'], 400);
        }
    }
    
    $newId = generateUUID();
    $stmt = $db->prepare(
        "INSERT INTO expenses (id, logged_by, category, amount, description, date) 
         VALUES (?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([$newId, $loggedBy, $category, $amount, $description, $date]);
    
    sendJson(['data' => ['id' => $newId]], 201);
}
// DELETE /api/expenses.php?id=UUID
elseif ($method === 'DELETE') {
    if (!$id) {
        sendJson(['error' => 'ID is required'], 400);
    }
    $stmt = $db->prepare("DELETE FROM expenses WHERE id = ?");
    $stmt->execute([$id]);
    sendJson(['data' => ['deleted' => true]]);
}
else {
    sendJson(['error' => 'Method not allowed'], 405);
}
