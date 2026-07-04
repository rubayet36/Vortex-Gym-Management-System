<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$id     = $_GET['id'] ?? null;

// GET  /api/packages.php       → list all packages
// POST /api/packages.php       → create a package
// PUT  /api/packages.php?id=X  → update package
// DELETE /api/packages.php?id=X → delete package

if ($method === 'GET') {
    if ($id) {
        $stmt = $db->prepare("SELECT * FROM packages WHERE id = ? LIMIT 1");
        $stmt->execute([$id]);
        sendJson(['data' => $stmt->fetch()]);
    } else {
        // By default, only return global (non-custom) packages
        $includeCustom = isset($_GET['include_custom']) && $_GET['include_custom'] == '1';
        $forUserId = $_GET['for_user_id'] ?? null;
        
        if ($includeCustom && $forUserId) {
            // Show global packages + custom packages for this specific user
            $stmt = $db->prepare("SELECT * FROM packages WHERE is_custom = 0 OR (is_custom = 1 AND created_for_user_id = ?) ORDER BY duration_days ASC");
            $stmt->execute([$forUserId]);
        } elseif ($includeCustom) {
            $stmt = $db->query("SELECT * FROM packages ORDER BY duration_days ASC");
        } else {
            // Default: only global packages
            $stmt = $db->query("SELECT * FROM packages WHERE is_custom = 0 ORDER BY duration_days ASC");
        }
        
        $data = $stmt->fetchAll();
        sendJson(['data' => $data]);
    }
}

elseif ($method === 'POST') {
    $name        = $body['name'] ?? '';
    $description = $body['description'] ?? null;
    $price       = $body['price'] ?? 0;
    $duration    = $body['duration_days'] ?? 30;
    $isCustom    = isset($body['is_custom']) && $body['is_custom'] ? 1 : 0;
    $forUserId   = $body['created_for_user_id'] ?? null;

    if (!$name) sendJson(['error' => 'Package name is required'], 400);

    // Only check for duplicate names in global packages
    if (!$isCustom) {
        $check = $db->prepare("SELECT id FROM packages WHERE name = ? AND is_custom = 0 LIMIT 1");
        $check->execute([$name]);
        if ($check->fetch()) {
            sendJson(['error' => 'Package with this name already exists'], 409);
        }
    }

    $newId = generateUUID();
    $stmt  = $db->prepare(
        "INSERT INTO packages (id, name, description, price, duration_days, is_custom, created_for_user_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([$newId, $name, $description, $price, $duration, $isCustom, $forUserId]);

    sendJson(['data' => ['id' => $newId, 'name' => $name, 'is_custom' => $isCustom]], 201);
}

elseif ($method === 'PUT') {
    if (!$id) sendJson(['error' => 'ID is required'], 400);

    $fields = [];
    $params = [];
    foreach (['name', 'description', 'price', 'duration_days'] as $f) {
        if (array_key_exists($f, $body)) {
            $fields[] = "$f = ?";
            $params[] = $body[$f];
        }
    }
    if (empty($fields)) sendJson(['error' => 'No fields to update'], 400);

    $params[] = $id;
    $stmt = $db->prepare("UPDATE packages SET " . implode(', ', $fields) . " WHERE id = ?");
    $stmt->execute($params);
    sendJson(['data' => ['id' => $id, 'updated' => true]]);
}

elseif ($method === 'DELETE') {
    if (!$id) sendJson(['error' => 'ID is required'], 400);
    $stmt = $db->prepare("DELETE FROM packages WHERE id = ?");
    $stmt->execute([$id]);
    sendJson(['data' => ['deleted' => true]]);
}

else {
    sendJson(['error' => 'Method not allowed'], 405);
}
