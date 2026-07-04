<?php
require_once 'db.php';

$db    = getDB();
$today = date('Y-m-d');
$fiveDaysLater = date('Y-m-d', strtotime('+5 days'));

// Active members (is_active = 1 and role = member)
$stmt = $db->query("SELECT COUNT(*) as cnt FROM profiles WHERE is_active = 1 AND role = 'member'");
$activeMembers = (int) $stmt->fetchColumn();

// This month's new member registrations
$stmt = $db->query("SELECT COUNT(*) as cnt FROM profiles WHERE role = 'member' AND DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')");
$thisMonthRegistrations = (int) $stmt->fetchColumn();

// Members expiring within 5 days
$stmt = $db->prepare(
    "SELECT COUNT(*) as cnt FROM user_subscriptions WHERE status = 'active' AND end_date BETWEEN ? AND ?"
);
$stmt->execute([$today, $fiveDaysLater]);
$expiringSoon = (int) $stmt->fetchColumn();

// Monthly revenue (sum of subscription packages for this month) - approximate
$stmt = $db->prepare(
    "SELECT COALESCE(SUM(pk.price), 0) as revenue
     FROM user_subscriptions us
     JOIN packages pk ON pk.id = us.package_id
     WHERE DATE_FORMAT(us.created_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')"
);
$stmt->execute();
$monthlyRevenue = (float) $stmt->fetchColumn();

// Recent 7-day attendance trend
$stmt = $db->prepare(
    "SELECT date, COUNT(*) as count
     FROM attendance
     WHERE date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
     GROUP BY date ORDER BY date ASC"
);
$stmt->execute();
$attendanceTrend = $stmt->fetchAll();

// Today's revenue (sum of all paid_amount on today's payments)
$stmt = $db->prepare(
    "SELECT COALESCE(SUM(paid_amount), 0) as revenue FROM payments WHERE DATE(payment_date) = ?"
);
$stmt->execute([$today]);
$todayRevenue = (float) $stmt->fetchColumn();

sendJson([
    'data' => [
        'activeMembers'          => $activeMembers,
        'thisMonthRegistrations'  => $thisMonthRegistrations,
        'expiringSoon'           => $expiringSoon,
        'monthlyRevenue'         => $monthlyRevenue,
        'todayRevenue'           => $todayRevenue,
        'attendanceTrend'        => $attendanceTrend,
    ]
]);
