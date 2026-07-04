<?php
$tz = new DateTimeZone('Asia/Dhaka');
$dt = new DateTime('now', $tz);
$out = [
    'date_default' => date('Y-m-d H:i:s'),
    'datetime_dhaka' => $dt->format('Y-m-d H:i:s'),
    'time' => time()
];

require 'db.php';
$db = getDB();
$stmt = $db->query("SELECT NOW() as mysql_now, CURRENT_TIMESTAMP as mysql_current");
$out['mysql'] = $stmt->fetch(PDO::FETCH_ASSOC);

echo json_encode($out);
