<?php
require_once 'db.php';

$db = getDB();

// ─── 1. MAIN packages (price > 0) ────────────────────────────────────────────
// Group by name so same-branded packages collapse into one row
$stmt = $db->query(
    "SELECT
        MIN(p.id)          AS id,
        p.name             AS package_name,
        MIN(p.price)       AS price,
        MIN(p.duration_days) AS duration_days,
        COUNT(us.id)       AS total_members_assigned_ever,
        SUM(CASE WHEN us.status = 'active' THEN 1 ELSE 0 END) AS currently_active_members
     FROM packages p
     LEFT JOIN user_subscriptions us ON us.package_id = p.id
     WHERE p.price > 0
     GROUP BY p.name
     ORDER BY currently_active_members DESC, total_members_assigned_ever DESC"
);
$mainPackages = $stmt->fetchAll();

// ─── 2. CUSTOM packages (price = 0) summary row ───────────────────────────────
$stmt = $db->query(
    "SELECT
        COUNT(DISTINCT p.id)  AS total_custom_packages,
        COUNT(us.id)          AS total_ever_assigned,
        SUM(CASE WHEN us.status = 'active' THEN 1 ELSE 0 END) AS currently_active
     FROM packages p
     LEFT JOIN user_subscriptions us ON us.package_id = p.id
     WHERE p.price = 0"
);
$customSummary = $stmt->fetch();

// ─── 3. CUSTOM packages – grouped by name (for modal cards) ─────────────────
$stmt = $db->query(
    "SELECT
        p.name             AS package_name,
        p.duration_days,
        COUNT(us.id)       AS total_assigned,
        SUM(CASE WHEN us.status = 'active' THEN 1 ELSE 0 END) AS active_count
     FROM packages p
     LEFT JOIN user_subscriptions us ON us.package_id = p.id
     WHERE p.price = 0
     GROUP BY p.name, p.duration_days
     ORDER BY active_count DESC, total_assigned DESC"
);
$customGrouped = $stmt->fetchAll();

// ─── 4. Overall totals ────────────────────────────────────────────────────────
$totalMainActive = 0;
foreach ($mainPackages as $p) {
    $totalMainActive += (int) $p['currently_active_members'];
}
$totalActive = $totalMainActive + (int) ($customSummary['currently_active'] ?? 0);

sendJson([
    'data' => [
        'mainPackages'   => $mainPackages,
        'customSummary'  => $customSummary,
        'customGrouped'  => $customGrouped,
        'totals' => [
            'totalMainPackages'  => count($mainPackages),
            'totalActiveMembers' => $totalActive,
        ],
    ]
]);
