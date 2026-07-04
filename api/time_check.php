<?php
echo "PHP date() default: " . date('Y-m-d H:i:s') . "\n";
$tz = new DateTimeZone('Asia/Dhaka');
$dt = new DateTime('now', $tz);
echo "PHP DateTime Asia/Dhaka: " . $dt->format('Y-m-d H:i:s') . "\n";

require 'db.php';
$db = getDB();
$stmt = $db->query("SELECT NOW() as mysql_now, CURRENT_TIMESTAMP as mysql_current");
print_r($stmt->fetch(PDO::FETCH_ASSOC));
