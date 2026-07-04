const ZKLib  = require("zklib-js");
const { pool, uuidv4 } = require("./db");
const zkConfig = require("./zkConfig");

const pad = (n) => String(n).padStart(2, "0");
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

const sanitizePin = (pin) => {
  if (!pin) return "";
  let pinStr = String(pin).trim();
  if (pinStr.length > 9) {
    if (pinStr.length === 11 && pinStr.startsWith("01")) {
      return pinStr.substring(2);
    }
    return pinStr.slice(-9);
  }
  return pinStr;
};

const getErrMsg = (err) => {
  if (!err) return "Unknown error";
  return err.message || String(err);
};

// ─── Concurrency guard — prevents overlapping sync cycles ─────────────────────
let syncInProgress = false;

// ─── Core Sync Function ────────────────────────────────────────────────────────
async function performSync() {
  if (syncInProgress) {
    console.log("[sync] Sync already in progress — skipping this cycle.");
    return { skipped: true };
  }
  syncInProgress = true;

  const { ZK_IP, ZK_PORT } = zkConfig;
  console.log(`\n[${new Date().toISOString()}] Starting ZKTeco Sync Cycle...`);
  const zkInstance = new ZKLib(ZK_IP, ZK_PORT, 10000, 4000);

  let result = {
    connected: false,
    pushedToDevice: 0,
    syncedCheckins: 0,
    expiredBlocked: 0,
    error: null,
  };

  try {
    await zkInstance.createSocket();
    result.connected = true;
    console.log("Connected to ZKTeco Machine at", ZK_IP);

    // ── Fetch all current device users ─────────────────────────────────────────
    console.log("Fetching users from device...");
    const devUsers = await zkInstance.getUsers();
    const userList = devUsers?.data || [];
    console.log(`Found ${userList.length} users on device.`);

    const devicePins = new Set(userList.map((u) => String(u.userId)));

    // ── Build existingUids ONCE outside the loop (fixes O(n²)) ────────────────
    const existingUids = userList.map((u) => parseInt(u.uid, 10)).filter((n) => !isNaN(n));

    // ── STEP 1: DB → Device ────────────────────────────────────────────────────
    console.log("\n📤 Checking DB members to push to device...");
    const today = new Date().toISOString().split("T")[0];

    const [activeMembers] = await pool.query(
      `SELECT DISTINCT p.id, p.first_name, p.last_name, p.phone_number AS pin, p.pin AS device_pin
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
    console.log(`Found ${activeMembers.length} active DB member(s).`);

    for (const member of activeMembers) {
      const pin = member.device_pin || member.pin;
      if (!pin) { console.log(`Skipping ${member.first_name} — no PIN.`); continue; }
      const pinStr = sanitizePin(pin);
      if (!pinStr) { console.log(`Skipping ${member.first_name} — invalid sanitized PIN.`); continue; }
      if (devicePins.has(pinStr)) continue;

      let name = `${member.first_name || ""} ${member.last_name || ""}`.trim();
      if (name.length > 24) {
        name = name.substring(0, 24).trim();
      }
      // newUid calculated from the already-built existingUids array
      let newUid = (existingUids.length > 0 ? Math.max(...existingUids) : 0) + 1;
      if (newUid > 65000) newUid = 1;
      while (existingUids.includes(newUid)) newUid++;

      try {
        await zkInstance.setUser(newUid, pinStr, name, "", 0, 0);
        userList.push({ uid: String(newUid), userId: pinStr, name });
        existingUids.push(newUid); // keep array in sync
        devicePins.add(pinStr);
        console.log(`✅ Pushed: ${name} (PIN: ${pinStr})`);
        result.pushedToDevice++;
      } catch (pushErr) {
        console.error(`Failed to push ${name}:`, getErrMsg(pushErr));
      }
    }

    // ── STEP 2: Block expired/paused/inactive users ────────────────────────────
    console.log("\n🔎 Checking for expired, paused, or deleted memberships...");
    const [invalidUsers] = await pool.query(
      `SELECT p.id, p.first_name, p.last_name, p.phone_number, p.pin as device_pin
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

    if (invalidUsers.length > 0) {
      for (const user of invalidUsers) {
        const pin = user.device_pin || user.phone_number;
        const name = `${user.first_name || ""} ${user.last_name || ""}`.trim();
        if (!pin) continue;
        const pinStr = sanitizePin(pin);
        await pool.query(
          "UPDATE user_subscriptions SET status = 'expired' WHERE user_id = ? AND status = 'active' AND end_date < ?",
          [user.id, today]
        );
        const match = userList.find((u) => String(u.userId) === String(pinStr));
        if (match) {
          try {
            const buf = Buffer.alloc(2);
            buf.writeUInt16LE(parseInt(match.uid, 10), 0);
            await zkInstance.executeCmd(18, buf);
            console.log(`🚫 Blocked: ${name} (PIN: ${pinStr})`);
            const idx = userList.indexOf(match);
            if (idx > -1) userList.splice(idx, 1);
            result.expiredBlocked++;
          } catch (delErr) {
            console.error(`Failed to remove PIN ${pinStr}:`, getErrMsg(delErr));
          }
        }
      }
      console.log(`Processed ${invalidUsers.length} invalid profiles.`);
    } else {
      console.log("✅ No restricted memberships found.");
    }

    // ── STEP 3: SYNC ATTENDANCE — bulk queries, no N+1 ────────────────────────
    const attendanceLogs = await zkInstance.getAttendances();
    const logsData = attendanceLogs?.data || [];
    console.log(`\nFetched ${logsData.length} total attendance logs.`);

    if (logsData.length > 0) {
      // 3a. Bulk-fetch all profiles for every unique PIN in the logs
      const uniquePins = [...new Set(logsData.map((l) => String(l.deviceUserId)))];
      const ph = uniquePins.map(() => "?").join(", ");
      const [profileRows] = await pool.query(
        `SELECT id, pin, phone_number FROM profiles WHERE pin IN (${ph}) OR phone_number IN (${ph})`,
        [...uniquePins, ...uniquePins]
      );
      const pinToId = {};
      for (const r of profileRows) {
        if (r.pin) {
          pinToId[String(r.pin)] = r.id;
          pinToId[sanitizePin(r.pin)] = r.id;
        }
        if (r.phone_number) {
          pinToId[String(r.phone_number)] = r.id;
          pinToId[sanitizePin(r.phone_number)] = r.id;
        }
      }

      // 3b. Pre-process logs — convert to Dhaka time, skip unknowns
      const enriched = [];
      for (const log of logsData) {
        const pin = String(log.deviceUserId);
        const profileId = pinToId[pin];
        if (!profileId) continue;
        const utc = new Date(log.recordTime);
        if (isNaN(utc.getTime())) continue;
        const dhaka = new Date(utc.getTime() + DHAKA_OFFSET_MS);
        const dateStr = `${dhaka.getUTCFullYear()}-${pad(dhaka.getUTCMonth()+1)}-${pad(dhaka.getUTCDate())}`;
        const timeStr = `${dateStr} ${pad(dhaka.getUTCHours())}:${pad(dhaka.getUTCMinutes())}:${pad(dhaka.getUTCSeconds())}`;
        enriched.push({ profileId, dateStr, timeStr, ms: dhaka.getTime() });
      }
      enriched.sort((a, b) => a.ms - b.ms); // oldest first

      // 3c. Bulk-fetch all existing attendance rows for these profile+date combos
      const profileIdSet = [...new Set(enriched.map((e) => e.profileId))];
      const dateSet      = [...new Set(enriched.map((e) => e.dateStr))];
      let existingMap = {}; // "profileId_date" → [rows]

      if (profileIdSet.length > 0) {
        const [existingRows] = await pool.query(
          `SELECT id, user_id, date, check_in_time, check_out_time
           FROM attendance
           WHERE user_id IN (${profileIdSet.map(() => "?").join(",")})
             AND date IN (${dateSet.map(() => "?").join(",")})
           ORDER BY check_in_time ASC`,
          [...profileIdSet, ...dateSet]
        );
        for (const row of existingRows) {
          const dateKey = row.date instanceof Date
            ? `${row.date.getFullYear()}-${pad(row.date.getMonth()+1)}-${pad(row.date.getDate())}`
            : String(row.date).split("T")[0];
          const key = `${row.user_id}_${dateKey}`;
          if (!existingMap[key]) existingMap[key] = [];
          existingMap[key].push(row);
        }
      }

      // 3d. Process each log using in-memory existingMap (no per-row DB queries)
      for (const { profileId, dateStr, timeStr, ms } of enriched) {
        const key     = `${profileId}_${dateStr}`;
        const records = existingMap[key] || [];

        if (records.length === 0) {
          const newId = uuidv4();
          await pool.query(
            "INSERT INTO attendance (id, user_id, check_in_time, date) VALUES (?, ?, ?, ?)",
            [newId, profileId, timeStr, dateStr]
          );
          existingMap[key] = [{ id: newId, check_in_time: timeStr, check_out_time: null }];
          result.syncedCheckins++;
        } else {
          const last = records[records.length - 1];
          const rawIn = last.check_in_time;
          let lastMs;
          if (rawIn instanceof Date) {
            lastMs = new Date(rawIn.toISOString().replace("Z", "+06:00")).getTime();
          } else {
            lastMs = new Date(String(rawIn).replace(" ", "T") + "+06:00").getTime();
          }
          if ((ms - lastMs) > 5 * 60 * 1000 && !last.check_out_time) {
            await pool.query("UPDATE attendance SET check_out_time = ? WHERE id = ?", [timeStr, last.id]);
            last.check_out_time = timeStr;
            result.syncedCheckins++;
          }
        }
      }
    }

  } catch (error) {
    const errMsg = (error && error.message) ? error.message : String(error);
    result.error = errMsg;
    console.error("ZKTeco Bridge Error:", errMsg);
  } finally {
    try { await zkInstance.disconnect(); } catch (_) {}
    syncInProgress = false;
  }

  console.log(`\nSync result:`, JSON.stringify(result));
  return result;
}

// ─── Auto-Sync (every 20 seconds) ──────────────────────────────────────────────
const SYNC_INTERVAL_MS = 20 * 1000;
let autoSyncTimer = null;
let expiryCheckTimer = null;
let duesCheckTimer = null;

async function checkExpiringSubscriptions() {
  console.log("\n[whatsapp] Checking for memberships expiring in 3 days...");
  const { sendWhatsAppMessage } = require("./whatsapp");

  try {
    // Current date + 3 days in Dhaka Time
    const DhakaTime = new Date(Date.now() + DHAKA_OFFSET_MS);
    const targetDate = new Date(DhakaTime.getTime() + 3 * 24 * 60 * 60 * 1000);
    const targetDateStr = `${targetDate.getUTCFullYear()}-${pad(targetDate.getUTCMonth()+1)}-${pad(targetDate.getUTCDate())}`;
    
    console.log(`[whatsapp] Searching for end_date = '${targetDateStr}' with whatsapp_warning_sent = 0`);

    const [expiring] = await pool.query(
      `SELECT us.id AS sub_id, us.end_date, p.first_name, p.last_name, p.phone_number, p.pin, pk.name AS package_name
       FROM user_subscriptions us
       JOIN profiles p ON p.id = us.user_id
       JOIN packages pk ON pk.id = us.package_id
       WHERE us.status = 'active'
         AND us.end_date = ?
         AND (us.whatsapp_warning_sent = 0 OR us.whatsapp_warning_sent IS NULL)
         AND p.phone_number IS NOT NULL`,
      [targetDateStr]
    );

    console.log(`[whatsapp] Found ${expiring.length} subscription(s) expiring on ${targetDateStr}`);

    for (let i = 0; i < expiring.length; i++) {
      const sub = expiring[i];
      const name = `${sub.first_name || ""} ${sub.last_name || ""}`.trim();
      const phone = sub.phone_number;
      const pkgName = sub.package_name;
      const formattedDate = new Date(sub.end_date).toLocaleDateString("en-GB");

      const msg = `Hello ${name},\n\nYour fitness goals don't stop, and neither do we! 💪\n\nThis is a quick reminder that your *${pkgName}* membership expires in 3 days on *${formattedDate}*. To keep your door access active, please renew your package at your earliest convenience.\n\nSee you on the training floor! 🏋️\n\nBest,\n*Vortex Fitness Club*`;

      // Spam prevention: delay subsequent messages by a random 5-10 seconds
      if (i > 0) {
        const delayMs = Math.floor(Math.random() * 5000) + 5000;
        console.log(`[whatsapp] Waiting ${delayMs / 1000} seconds before sending the next message to prevent spam triggers...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      const res = await sendWhatsAppMessage(phone, msg);
      if (res.success) {
        // Mark as warning sent
        await pool.query("UPDATE user_subscriptions SET whatsapp_warning_sent = 1 WHERE id = ?", [sub.sub_id]);
        console.log(`[whatsapp] Expiry warning sent to ${name} (${phone})`);
      } else {
        console.error(`[whatsapp] Failed to send warning to ${name}:`, res.error);
      }
    }
  } catch (err) {
    console.error("[whatsapp] Error checking expiring subscriptions:", getErrMsg(err));
  }
}

async function checkOutstandingDues() {
  console.log("\n[whatsapp] Checking for outstanding dues unpaid for 7 days...");
  const { sendWhatsAppMessage } = require("./whatsapp");

  try {
    // Current date in Dhaka Time
    const DhakaTime = new Date(Date.now() + DHAKA_OFFSET_MS);
    // Find payments created exactly 7 days ago (or more) that still have dues
    // We check if the overall user total_due is still > 0.
    const [unpaid] = await pool.query(
      `SELECT py.id AS payment_id, py.payment_date, py.due_amount,
              p.first_name, p.last_name, p.phone_number, pk.name AS package_name
       FROM payments py
       JOIN profiles p ON p.id = py.user_id
       LEFT JOIN user_subscriptions us ON us.id = py.subscription_id
       LEFT JOIN packages pk ON pk.id = us.package_id
       WHERE py.due_amount > 0
         AND (py.whatsapp_due_warning_sent = 0 OR py.whatsapp_due_warning_sent IS NULL)
         AND DATEDIFF(?, py.payment_date) >= 7
         AND p.phone_number IS NOT NULL
         AND (
           COALESCE((SELECT SUM(py2.due_amount) FROM payments py2 WHERE py2.user_id = p.id AND py2.payment_type NOT IN ('DUE_PAYMENT') AND py2.payment_type NOT LIKE 'Due Clear%' AND py2.payment_type NOT LIKE 'Partial Due%'), 0) -
           COALESCE((SELECT SUM(py2.paid_amount) FROM payments py2 WHERE py2.user_id = p.id AND (py2.payment_type = 'DUE_PAYMENT' OR py2.payment_type LIKE 'Due Clear%' OR py2.payment_type LIKE 'Partial Due%')), 0)
         ) > 0`,
      [DhakaTime.toISOString().split("T")[0]]
    );

    console.log(`[whatsapp] Found ${unpaid.length} unpaid payment(s) with dues outstanding for 7+ days`);

    for (let i = 0; i < unpaid.length; i++) {
      const record = unpaid[i];
      const name = `${record.first_name || ""} ${record.last_name || ""}`.trim();
      const phone = record.phone_number;
      const pkgName = record.package_name || "Gym Package";
      const dueVal = Number(record.due_amount).toFixed(0);
      const formattedDate = new Date(record.payment_date).toLocaleDateString("en-GB");

      const msg = `Hello ${name},\n\nThis is a friendly reminder from Vortex Fitness Club. 🏋️\n\nOur records show an outstanding balance of *${dueVal} BDT* for your package *${pkgName}* registered on *${formattedDate}* (7 days ago).\n\nTo keep your gym membership active and ensure uninterrupted door access, please clear your outstanding dues at your earliest convenience.\n\nIf you have already made this payment, please reply with a copy of your receipt so we can update our records.\n\nThank you for your cooperation! 💪\n\nBest regards,\n*Vortex Fitness Club*`;

      if (i > 0) {
        const delayMs = Math.floor(Math.random() * 5000) + 5000;
        console.log(`[whatsapp] Waiting ${delayMs / 1000} seconds before sending the next due warning to prevent spam triggers...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      const res = await sendWhatsAppMessage(phone, msg);
      if (res.success) {
        await pool.query("UPDATE payments SET whatsapp_due_warning_sent = 1 WHERE id = ?", [record.payment_id]);
        console.log(`[whatsapp] Due warning sent to ${name} (${phone})`);
      } else {
        console.error(`[whatsapp] Failed to send due warning to ${name}:`, res.error);
      }
    }
  } catch (err) {
    console.error("[whatsapp] Error checking outstanding dues:", getErrMsg(err));
  }
}

function startAutoSync() {
  console.log(`\n🔄 Auto-Sync enabled. Will sync every ${SYNC_INTERVAL_MS / 1000} seconds.`);
  performSync().catch((e) => console.error("Auto-Sync startup error:", getErrMsg(e)));
  autoSyncTimer = setInterval(() => {
    performSync().catch((e) => console.error("Auto-Sync error:", getErrMsg(e)));
  }, SYNC_INTERVAL_MS);

  // Expiring check — runs 10 seconds after startup, then every 2 hours
  setTimeout(() => {
    checkExpiringSubscriptions().catch((e) => console.error("Expiry check startup error:", getErrMsg(e)));
  }, 10000);

  // Outstanding dues check — runs 20 seconds after startup, then every 2 hours
  setTimeout(() => {
    checkOutstandingDues().catch((e) => console.error("Dues check startup error:", getErrMsg(e)));
  }, 20000);

  expiryCheckTimer = setInterval(() => {
    checkExpiringSubscriptions().catch((e) => console.error("Expiry check error:", getErrMsg(e)));
  }, 2 * 60 * 60 * 1000);

  duesCheckTimer = setInterval(() => {
    checkOutstandingDues().catch((e) => console.error("Dues check error:", getErrMsg(e)));
  }, 2 * 60 * 60 * 1000);
}

function stopAutoSync() {
  if (autoSyncTimer) {
    clearInterval(autoSyncTimer);
    autoSyncTimer = null;
    console.log("Auto-Sync stopped.");
  }
  if (expiryCheckTimer) {
    clearInterval(expiryCheckTimer);
    expiryCheckTimer = null;
  }
  if (duesCheckTimer) {
    clearInterval(duesCheckTimer);
    duesCheckTimer = null;
  }
}

module.exports = { performSync, startAutoSync, stopAutoSync, SYNC_INTERVAL_MS, checkExpiringSubscriptions, checkOutstandingDues };
