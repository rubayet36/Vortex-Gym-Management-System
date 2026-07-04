<?php
// ─── Run this ONCE to create the initial admin/owner account ─────────────────
// Access via: http://localhost/api/seed-admin.php
// Delete or restrict this file after use!
require_once 'db.php';

$db = getDB();

$email     = "admin@vortexgym.com";
$password  = "Admin@1234";     // ← Change this before running!
$firstName = "Gym";
$lastName  = "Owner";
$role      = "owner";

// Check if admin already exists
$check = $db->prepare("SELECT id FROM profiles WHERE email = ? LIMIT 1");
$check->execute([$email]);
if ($check->fetch()) {
    sendJson(['message' => 'Admin user already exists.', 'email' => $email]);
}

$id   = generateUUID();
$hash = password_hash($password, PASSWORD_BCRYPT);

$db->prepare(
    "INSERT INTO profiles (id, email, password_hash, first_name, last_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)"
)->execute([$id, $email, $hash, $firstName, $lastName, $role]);

sendJson([
    'success' => true,
    'message' => 'Admin account created successfully!',
    'email'   => $email,
    'password'=> $password,
    'note'    => 'Please delete seed-admin.php after logging in.'
]);
