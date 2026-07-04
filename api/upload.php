<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

// POST /api/upload.php?type=avatar&user_id=UUID
// Accepts a multipart/form-data file upload named 'photo'

if ($method !== 'POST') {
    sendJson(['error' => 'Method not allowed'], 405);
}

$userId = $_GET['user_id'] ?? ($_POST['user_id'] ?? null);
if (!$userId) {
    sendJson(['error' => 'user_id is required'], 400);
}

if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
    sendJson(['error' => 'No valid file uploaded'], 400);
}

$file = $_FILES['photo'];

// Validate mime type
$allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime  = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mime, $allowedMimes)) {
    sendJson(['error' => 'Only JPEG, PNG, GIF, and WebP images are allowed'], 400);
}

// Create upload directory
$uploadDir = __DIR__ . '/../uploads/avatars/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Generate unique filename
$ext      = pathinfo($file['name'], PATHINFO_EXTENSION);
$filename = $userId . '_' . time() . '.' . $ext;
$destPath = $uploadDir . $filename;

if (!move_uploaded_file($file['tmp_name'], $destPath)) {
    sendJson(['error' => 'Failed to save uploaded file'], 500);
}

// Build URL relative to web root
$avatarUrl = '/uploads/avatars/' . $filename;

// Save URL to profiles table
$db   = getDB();
$stmt = $db->prepare("UPDATE profiles SET avatar_url = ? WHERE id = ?");
$stmt->execute([$avatarUrl, $userId]);

sendJson(['data' => ['avatar_url' => $avatarUrl]]);
