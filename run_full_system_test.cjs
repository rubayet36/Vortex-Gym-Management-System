const { pool } = require("./zkteco-bridge/db");

// Simple wrapper around native fetch
async function apiCall(url, method = "GET", body = null) {
  const options = {
    method,
    headers: { "Content-Type": "application/json" }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`http://localhost/api${url}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status} on ${url}`);
  }
  return { status: res.status, data };
}

// Fetch total_due for a user directly from DB query
async function getDuesFromDB(userId) {
  const [rows] = await pool.query(`
    SELECT 
      GREATEST(0,
        COALESCE((SELECT SUM(py.due_amount) FROM payments py WHERE py.user_id = ? AND py.payment_type NOT IN ('DUE_PAYMENT') AND py.payment_type NOT LIKE 'Due Clear%' AND py.payment_type NOT LIKE 'Partial Due%'), 0) -
        COALESCE((SELECT SUM(py.paid_amount) FROM payments py WHERE py.user_id = ? AND (py.payment_type = 'DUE_PAYMENT' OR py.payment_type LIKE 'Due Clear%' OR py.payment_type LIKE 'Partial Due%')), 0)
      ) AS total_due
  `, [userId, userId]);
  return parseFloat(rows[0]?.total_due || 0);
}

// Fetch ZKTeco device push/block status from DB query
async function checkDeviceSyncStatus(userId) {
  const today = new Date().toISOString().split("T")[0];
  
  // Query for active members (to push)
  const [activeMembers] = await pool.query(
    `SELECT DISTINCT p.id
     FROM profiles p
     JOIN user_subscriptions us ON us.user_id = p.id
     WHERE us.status = 'active' AND us.end_date >= ?
       AND p.is_active = 1 AND (p.is_paused = 0 OR p.is_paused IS NULL)
       AND (
         COALESCE((SELECT SUM(py.due_amount) FROM payments py WHERE py.user_id = p.id AND py.payment_type NOT IN ('DUE_PAYMENT') AND py.payment_type NOT LIKE 'Due Clear%' AND py.payment_type NOT LIKE 'Partial Due%'), 0) -
         COALESCE((SELECT SUM(py.paid_amount) FROM payments py WHERE py.user_id = p.id AND (py.payment_type = 'DUE_PAYMENT' OR py.payment_type LIKE 'Due Clear%' OR py.payment_type LIKE 'Partial Due%')), 0)
       ) <= 0`,
    [today]
  );

  // Query for invalid members (to block)
  const [invalidUsers] = await pool.query(
    `SELECT p.id
     FROM profiles p
     WHERE p.role = 'member' AND (
       p.is_active = 0 OR p.is_paused = 1
       OR NOT EXISTS (
         SELECT 1 FROM user_subscriptions us
         WHERE us.user_id = p.id AND us.status = 'active' AND us.end_date >= ?
       )
       OR (
         COALESCE((SELECT SUM(py.due_amount) FROM payments py WHERE py.user_id = p.id AND py.payment_type NOT IN ('DUE_PAYMENT') AND py.payment_type NOT LIKE 'Due Clear%' AND py.payment_type NOT LIKE 'Partial Due%'), 0) -
         COALESCE((SELECT SUM(py.paid_amount) FROM payments py WHERE py.user_id = p.id AND (py.payment_type = 'DUE_PAYMENT' OR py.payment_type LIKE 'Due Clear%' OR py.payment_type LIKE 'Partial Due%')), 0)
       ) > 0
     )`,
    [today]
  );

  const shouldPush = activeMembers.some((m) => m.id === userId);
  const shouldBlock = invalidUsers.some((m) => m.id === userId);
  return { shouldPush, shouldBlock };
}

async function runTests() {
  console.log("==================================================");
  console.log("   VORTEX GYM MANAGEMENT SYSTEM WORKFLOW TESTS   ");
  console.log("==================================================");

  let successCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      successCount++;
    } else {
      console.error(`[FAIL] ${message}`);
      failCount++;
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: ADD NEW MEMBER (NO DUE)
    // ----------------------------------------------------
    console.log("\n--- Running Test 1: Add Member (No Due) ---");
    const testId1 = "TEST_001";
    const profile1 = {
      email: "test_no_due@gym.local",
      first_name: "John",
      last_name: "Doe",
      phone_number: "01799999991",
      member_id: testId1,
      pin: "99991",
      cardno: 11111,
      gender: "male",
      blood_group: "A+",
      role: "member",
      address: "123 Main St, Dhaka",
      dob: "1990-01-01",
      occupation: "Engineer",
      height: "180 cm",
      weight: "80 kg"
    };

    const resProfile1 = await apiCall("/profiles.php", "POST", profile1);
    const userId1 = resProfile1.data.data.id;
    assert(userId1 !== undefined, "Profile 1 created successfully via API");

    // Fetch package list to assign a package
    const resPackages = await apiCall("/packages.php", "GET");
    const packages = resPackages.data.data || [];
    const testPkg = packages.find(p => parseFloat(p.price) >= 2000 && parseInt(p.is_custom) === 0) || 
                    packages.find(p => parseFloat(p.price) >= 2000) || 
                    packages[0] || 
                    { id: "1", price: 2000 };

    const pkgPrice = parseFloat(testPkg.price);
    console.log(`Selected package for tests: "${testPkg.name}" (Price: ${pkgPrice} BDT, ID: ${testPkg.id})`);

    const sub1 = {
      user_id: userId1,
      package_id: testPkg.id,
      start_date: "2026-06-11",
      discount: 0,
      paymentMethod: "CASH",
      paid_amount_override: pkgPrice,
      due_amount_override: 0
    };

    const resSub1 = await apiCall("/subscriptions.php", "POST", sub1);
    assert(resSub1.status === 201, "Subscription 1 created successfully");

    // Verify DB dues
    const dueVal1 = await getDuesFromDB(userId1);
    assert(dueVal1 === 0, `Computed outstanding due for John Doe is 0 BDT (got: ${dueVal1})`);

    // Verify ZKTeco device push/block status
    const status1 = await checkDeviceSyncStatus(userId1);
    assert(status1.shouldPush === true && status1.shouldBlock === false, "Member 1 (no due) is scheduled to be PUSHED to ZKTeco F22 device and NOT blocked");


    // ----------------------------------------------------
    // TEST 2: ADD NEW MEMBER (WITH DUE)
    // ----------------------------------------------------
    console.log("\n--- Running Test 2: Add Member (With Due) ---");
    const testId2 = "TEST_002";
    const profile2 = {
      email: "test_with_due@gym.local",
      first_name: "Jane",
      last_name: "Smith",
      phone_number: "01799999992",
      member_id: testId2,
      pin: "99992",
      cardno: 22222,
      gender: "female",
      blood_group: "B-",
      role: "member",
      address: "456 Side St, Dhaka",
      dob: "1992-02-02",
      occupation: "Designer",
      height: "165 cm",
      weight: "55 kg"
    };

    const resProfile2 = await apiCall("/profiles.php", "POST", profile2);
    const userId2 = resProfile2.data.data.id;
    assert(userId2 !== undefined, "Profile 2 created successfully via API");

    const sub2 = {
      user_id: userId2,
      package_id: testPkg.id,
      start_date: "2026-06-11",
      discount: 0,
      paymentMethod: "BKASH",
      paid_amount_override: pkgPrice - 1500, // 1500 due
      due_amount_override: 1500
    };

    const resSub2 = await apiCall("/subscriptions.php", "POST", sub2);
    assert(resSub2.status === 201, "Subscription 2 created successfully");

    const dueVal2 = await getDuesFromDB(userId2);
    assert(dueVal2 === 1500, `Computed outstanding due for Jane Smith is 1500 BDT (got: ${dueVal2})`);

    // Verify ZKTeco device push/block status
    const status2 = await checkDeviceSyncStatus(userId2);
    assert(status2.shouldPush === false && status2.shouldBlock === true, "Member 2 (with due) is scheduled to be BLOCKED/NOT pushed on ZKTeco F22 device");


    // ----------------------------------------------------
    // TEST 3: CLEAR DUE (DUE CLEARANCE WORKFLOW)
    // ----------------------------------------------------
    console.log("\n--- Running Test 3: Clear Due for Member 2 ---");
    const payClear = {
      user_id: userId2,
      payment_type: "Due Clear (Test Pkg)",
      total_amount: 1500,
      paid_amount: 1500,
      due_amount: 0,
      discount_amount: 0,
      payment_method: "BKASH",
      payment_date: "2026-06-11 15:15:00"
    };

    const resPayClear = await apiCall("/payments.php", "POST", payClear);
    assert(resPayClear.status === 201, "Due Clearance Payment recorded successfully");

    const dueVal2After = await getDuesFromDB(userId2);
    assert(dueVal2After === 0, `Outstanding due after full due clearance is 0 BDT (got: ${dueVal2After})`);

    // Verify ZKTeco device push/block status after due cleared
    const status2After = await checkDeviceSyncStatus(userId2);
    assert(status2After.shouldPush === true && status2After.shouldBlock === false, "Member 2 (due cleared) is now scheduled to be PUSHED to ZKTeco F22 device and NOT blocked");


    // ----------------------------------------------------
    // TEST 4: TRANSACTION & EXPENSES WORKFLOW
    // ----------------------------------------------------
    console.log("\n--- Running Test 4: Expenses workflow ---");
    
    // Insert Expense
    const expense = {
      logged_by: userId1, // logged by profile 1
      category: "Internet bill",
      amount: 1200.50,
      description: "Monthly broadband fee",
      date: "2026-06-11"
    };

    const resExpense = await apiCall("/expenses.php", "POST", expense);
    const expenseId = resExpense.data.data?.id;
    assert(expenseId !== undefined, "Expense created successfully");

    // Verify inside DB
    const [expRows] = await pool.query("SELECT * FROM expenses WHERE id = ?", [expenseId]);
    assert(expRows.length > 0 && parseFloat(expRows[0].amount) === 1200.50, "Expense amount verified correctly in database");

    // Delete Expense
    const resExpDel = await apiCall(`/expenses.php?id=${expenseId}`, "DELETE");
    assert(resExpDel.data.data?.deleted === true, "Expense deleted successfully");

    // Verify deleted from DB
    const [expRowsDel] = await pool.query("SELECT * FROM expenses WHERE id = ?", [expenseId]);
    assert(expRowsDel.length === 0, "Expense successfully removed from database");


    // ----------------------------------------------------
    // TEST 5: PROFILE EDITING & VISIBILITY
    // ----------------------------------------------------
    console.log("\n--- Running Test 5: Profile editing and visibility ---");
    
    // Fetch profile details
    const resGetProfile = await apiCall(`/profiles.php?id=${userId1}`, "GET");
    assert(resGetProfile.data.data?.address === "123 Main St, Dhaka", "Profile Address returned correctly in details API");
    assert(parseFloat(resGetProfile.data.data?.total_due) === 0, "Profiles details API returns correct total_due");

    // Edit profile (PUT)
    const updatePayload = {
      first_name: "John Updated",
      address: "789 New St, Dhaka",
      height: "182 cm",
      weight: "82 kg"
    };
    const resProfileUpdate = await apiCall(`/profiles.php?id=${userId1}`, "PUT", updatePayload);
    assert(resProfileUpdate.data.data?.updated === true, "Profile updated successfully via API");

    // Verify updated values in DB
    const [updateRows] = await pool.query("SELECT first_name, address, height FROM profiles WHERE id = ?", [userId1]);
    assert(updateRows[0].first_name === "John Updated" && updateRows[0].address === "789 New St, Dhaka", "Updated values verified correctly in database");


    // ----------------------------------------------------
    // CLEAN UP TEST DATA
    // ----------------------------------------------------
    console.log("\n--- Cleaning up test members ---");
    await apiCall(`/profiles.php?id=${userId1}`, "DELETE");
    await apiCall(`/profiles.php?id=${userId2}`, "DELETE");
    console.log("Cleanup complete.");

  } catch (err) {
    console.error("Test execution aborted due to error:", err.message);
    failCount++;
  } finally {
    await pool.end();
    console.log("\n==================================================");
    console.log("               TEST RESULT SUMMARY                ");
    console.log("==================================================");
    console.log(`Successful Assertions: ${successCount}`);
    console.log(`Failed Assertions:     ${failCount}`);
    console.log("==================================================");
  }
}

runTests();
