<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
$_SERVER['REQUEST_METHOD'] = 'GET';
require 'db.php';
$db = getDB();
$stmt = $db->query("SELECT id, payment_date, created_at, total_amount FROM payments ORDER BY created_at DESC LIMIT 5");
file_put_contents('output2.json', json_encode($stmt->fetchAll(PDO::FETCH_ASSOC), JSON_PRETTY_PRINT));
