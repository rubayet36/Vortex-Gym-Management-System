<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();

if ($method === 'GET') {
    // We need to calculate:
    // 1. Opening Balance (Total Income - Total Expense) PRIOR to the 1st of the current month
    // 2. This Month Total Income
    // 3. This Month Total Expense
    // 4. Total Cash (Opening Balance + Month Income - Month Expense)

    // Get the first day of the current month
    $firstDayOfMonth = date('Y-m-01');

    // 1. Opening Balance Income (All time up to last day of previous month)
    $stmt = $db->prepare("SELECT SUM(paid_amount) as total FROM payments WHERE payment_date < ?");
    $stmt->execute([$firstDayOfMonth]);
    $pastIncome = (float)($stmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);

    // 2. Opening Balance Expenses (All time up to last day of previous month)
    $stmt = $db->prepare("SELECT SUM(amount) as total FROM expenses WHERE date < ?");
    $stmt->execute([$firstDayOfMonth]);
    $pastExpense = (float)($stmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);

    $openingBalance = $pastIncome - $pastExpense;

    // 3. This Month Income (From 1st to today)
    $stmt = $db->prepare("SELECT SUM(paid_amount) as total FROM payments WHERE payment_date >= ?");
    $stmt->execute([$firstDayOfMonth]);
    $monthIncome = (float)($stmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);

    // 4. This Month Expense (From 1st to today)
    $stmt = $db->prepare("SELECT SUM(amount) as total FROM expenses WHERE date >= ?");
    $stmt->execute([$firstDayOfMonth]);
    $monthExpense = (float)($stmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);

    $totalCash = $openingBalance + $monthIncome - $monthExpense;

    sendJson([
        'data' => [
            'opening_balance' => $openingBalance,
            'monthly_income' => $monthIncome,
            'monthly_expense' => $monthExpense,
            'total_cash' => $totalCash
        ]
    ]);
} else {
    sendJson(['error' => 'Method not allowed'], 405);
}
