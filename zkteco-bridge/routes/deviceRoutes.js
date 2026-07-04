const express  = require("express");
const ZKLib    = require("zklib-js");
const { pool } = require("../db");
const zkConfig = require("../zkConfig");
const { performSync, SYNC_INTERVAL_MS } = require("../sync");

const router = express.Router();

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

// ─── GET /api/status ──────────────────────────────────────────────────────────
router.get("/status", async (req, res) => {
  res.json({
    status: "running",
    ip:   zkConfig.ZK_IP,
    port: zkConfig.ZK_PORT,
    autoSyncInterval: `${SYNC_INTERVAL_MS / 60000} minutes`,
  });
});

// ─── POST /api/config ─────────────────────────────────────────────────────────
router.post("/config", async (req, res) => {
  const { ip, port } = req.body;
  if (ip)   zkConfig.ZK_IP   = ip;
  if (port) zkConfig.ZK_PORT = parseInt(port, 10);
  console.log(`Bridge configuration updated: IP=${zkConfig.ZK_IP}, PORT=${zkConfig.ZK_PORT}`);
  res.json({ success: true, ip: zkConfig.ZK_IP, port: zkConfig.ZK_PORT });
});

// ─── POST /api/sync ───────────────────────────────────────────────────────────
router.post("/sync", async (req, res) => {
  const result = await performSync();
  if (result.error) {
    res.status(500).json(result);
  } else {
    res.json(result);
  }
});

// ─── GET /api/latest-pin ─────────────────────────────────────────────────────
// Get the next available PIN — scans from 1 upward, checking both device AND DB
router.get("/latest-pin", async (req, res) => {
  const zkInstance = new ZKLib(zkConfig.ZK_IP, zkConfig.ZK_PORT, 10000, 4000);
  try {
    await zkInstance.createSocket();
    const users    = await zkInstance.getUsers();
    const userList = users?.data || [];

    // Build a Set of all used PINs on the device
    const devicePins = new Set(
      userList.map((u) => parseInt(u.userId, 10)).filter((n) => !isNaN(n))
    );

    // Also fetch all PINs in the DB
    const [dbProfiles] = await pool.query(
      "SELECT pin FROM profiles WHERE role = 'member' AND pin IS NOT NULL"
    );
    const dbPins = new Set(
      dbProfiles
        .map((p) => parseInt(String(p.pin), 10))
        .filter((n) => !isNaN(n))
    );

    // Combine all used PINs
    const allUsedPins = new Set([...devicePins, ...dbPins]);

    // Scan from 1 upward to find the first unused PIN
    let nextPin = 1;
    while (allUsedPins.has(nextPin)) nextPin++;

    res.json({ success: true, nextPin, deviceCount: userList.length });
  } catch (err) {
    const errMsg = getErrMsg(err);
    console.error("Latest PIN error:", errMsg);
    res.status(500).json({ success: false, error: errMsg });
  } finally {
    try { await zkInstance.disconnect(); } catch (e) {}
  }
});

// ─── GET /api/device-users ────────────────────────────────────────────────────
// Fetch all users stored on the ZKTeco device
router.get("/device-users", async (req, res) => {
  const zkInstance = new ZKLib(zkConfig.ZK_IP, zkConfig.ZK_PORT, 10000, 4000);
  try {
    await zkInstance.createSocket();
    const users    = await zkInstance.getUsers();
    const userList = (users?.data || []).map((u) => ({
      uid:      u.uid,
      userId:   String(u.userId),
      name:     u.name || `User ${u.userId}`,
      role:     u.role,
      password: u.password || "",
      cardno:   u.cardno || 0,
    }));
    console.log(`Returned ${userList.length} users from device.`);
    res.json({ success: true, users: userList });
  } catch (err) {
    const errMsg = getErrMsg(err);
    console.error("Get device users error:", errMsg);
    res.status(500).json({ success: false, error: errMsg });
  } finally {
    try { await zkInstance.disconnect(); } catch (e) {}
  }
});

// ─── GET /api/ghost-users ─────────────────────────────────────────────────────
// Fetch device users whose PIN is NOT in the database (ghost/unknown users)
router.get("/ghost-users", async (req, res) => {
  const zkInstance = new ZKLib(zkConfig.ZK_IP, zkConfig.ZK_PORT, 10000, 4000);
  try {
    await zkInstance.createSocket();
    const users    = await zkInstance.getUsers();
    const userList = users?.data || [];

    // Fetch all known PINs and phone numbers from the DB
    const [dbProfiles] = await pool.query(
      "SELECT pin, phone_number FROM profiles WHERE role = 'member'"
    );

    const knownPins = new Set();
    for (const p of dbProfiles) {
      if (p.pin)          knownPins.add(String(p.pin).trim());
      if (p.phone_number) knownPins.add(String(p.phone_number).trim());
    }

    const ghostUsers = userList
      .filter((u) => !knownPins.has(String(u.userId).trim()))
      .map((u) => ({
        uid:    u.uid,
        userId: String(u.userId),
        name:   u.name || `Unknown (PIN: ${u.userId})`,
        cardno: u.cardno || 0,
      }));

    console.log(`Ghost users found: ${ghostUsers.length} of ${userList.length} device users.`);
    res.json({ success: true, ghostUsers, totalOnDevice: userList.length });
  } catch (err) {
    const errMsg = getErrMsg(err);
    console.error("Ghost users error:", errMsg);
    res.status(500).json({ success: false, error: errMsg });
  } finally {
    try { await zkInstance.disconnect(); } catch (e) {}
  }
});

// Add or Update a user on the ZKTeco device
router.post("/users", async (req, res) => {
  const { pin, memberId, name, role = 0, cardno = 0, phone, packageName, duration, expiryDate, isRenewal, dueAmount = 0, skipDevicePush = false } = req.body;
  
  let userName = (name || "").trim();
  if (userName.length > 24) {
    userName = userName.substring(0, 24).trim();
  }
  
  const pinStr = sanitizePin(pin);
  const skipDevicePushBool = String(skipDevicePush) === "true" || !!skipDevicePush;
  const dueAmountNum = parseFloat(dueAmount) || 0;
  let pushError = null;

  console.log(`\n--- Received request to ADD/UPDATE user: ${userName} (PIN: ${pinStr}, CardNo: ${cardno}, Due: ${dueAmountNum}, SkipPush: ${skipDevicePushBool}) ---`);

  if (skipDevicePushBool) {
    console.log(`[users] Skipping physical ZKTeco hardware push for ${userName} (skipDevicePush = true)`);
  } else {
    const zkInstance = new ZKLib(zkConfig.ZK_IP, zkConfig.ZK_PORT, 10000, 4000);
    try {
      await zkInstance.createSocket();
      const users = await zkInstance.getUsers();

      // Check if user already exists
      const match = (users?.data || []).find((u) => String(u.userId) === String(pinStr));

      let targetUid;
      if (match) {
        targetUid = match.uid;
        console.log(`User found on device with internal uid=${targetUid}. Updating...`);
      } else {
        const existingUids = (users?.data || []).map((u) => parseInt(u.uid, 10));
        const maxUid = existingUids.length > 0 ? Math.max(...existingUids) : 0;
        targetUid = maxUid + 1;
        if (targetUid > 65000) targetUid = 1;
        while (existingUids.includes(targetUid)) targetUid++;
        console.log(`Calculated new internal uid=${targetUid} for PIN=${pinStr}`);
      }

      // Pass the actual cardno to zklib (which has been patched to support 32-bit)
      const cardnoInt = parseInt(cardno, 10) || 0;
      await zkInstance.setUser(targetUid, String(pinStr), userName, "", role, cardnoInt);

      console.log(`✅ Successfully pushed ${userName} to F22 hardware.`);
    } catch (err) {
      pushError = getErrMsg(err);
      console.error("❌ Add/Update user on hardware error:", pushError);
    } finally {
      try { await zkInstance.disconnect(); } catch (e) {}
    }
  }

  // Send WhatsApp notification if phone number is provided
  if (phone) {
    const { sendWhatsAppMessage } = require("../whatsapp");
    const cleanName = (name || "").trim();
    const displayId = (memberId || pinStr || "").trim();
    let msg = "";
    if (isRenewal) {
      const formattedExpiry = expiryDate ? new Date(expiryDate).toLocaleDateString("en-GB") : "—";
      if (dueAmountNum > 0) {
        // Scenario B: Package Renewal with Due (Option 1)
        msg = `Hello ${cleanName},\n\nThank you for renewing! Your package *${packageName || ""}* has been successfully activated.\n\n📅 **Expiry Date**: *${formattedExpiry}*\n💰 **Pending Due**: *${dueAmountNum} BDT*\n\nWe kindly request you to clear this remaining balance within the next 7 days. Thank you for your continued dedication—let's keep grinding! 🏋️💪\n\nBest regards,\n*Vortex Fitness Club*`;
      } else {
        // Renewal message without due amount and without rude door access references
        msg = `Hello ${cleanName},\n\nThank you for renewing! Your package *${packageName || ""}* has been successfully activated.\n\n📅 **Expiry Date**: *${formattedExpiry}*\n\nThank you for your continued dedication—let's keep grinding! 🏋️💪\n\nBest regards,\n*Vortex Fitness Club*`;
      }
    } else {
      if (dueAmountNum > 0) {
        // Scenario A: New Member Registration with Due (Option 1)
        msg = `Welcome to Vortex Fitness Club, ${cleanName}! 🎉\n\nWe are thrilled to welcome you to our community! Your gym membership has been successfully registered.\n\n🔑 **Your User ID**: *${displayId}*\n📦 **Package**: *${packageName || ""}*\n💰 **Pending Due**: *${dueAmountNum} BDT*\n\nWe kindly request you to clear the remaining due within the next 7 days. We are excited to help you crush your fitness goals. Let's get to work! 🏋️🔥\n\nBest regards,\n*Vortex Fitness Club*`;
      } else {
        // Normal Welcome message
        msg = `Welcome to Vortex Fitness Club, ${cleanName}! 🎉\n\nWe are thrilled to welcome you to our community! Your gym membership has been successfully registered.\n\n🔑 **Your User ID**: *${displayId}*\n📦 **Package**: *${packageName || ""}*\n\nWe are excited to help you crush your fitness goals. Let's get to work! 🏋️🔥\n\nBest regards,\n*Vortex Fitness Club*`;
      }
    }
    // Send asynchronously (no need to block the device HTTP response!)
    sendWhatsAppMessage(phone, msg).catch((e) => console.error("[whatsapp] Error sending message:", getErrMsg(e)));
  }

  res.json({
    success: !pushError,
    error: pushError,
    message: pushError ? `User processed but hardware push failed: ${pushError}` : `User processed successfully.`,
  });
});

// ─── DELETE /api/users/:pin ───────────────────────────────────────────────────
// Delete a user from the ZKTeco device by PIN
router.delete("/users/:pin", async (req, res) => {
  const { pin } = req.params;
  const pinStr = sanitizePin(pin);
  const zkInstance = new ZKLib(zkConfig.ZK_IP, zkConfig.ZK_PORT, 10000, 4000);
  try {
    await zkInstance.createSocket();
    const users = await zkInstance.getUsers();

    const match = (users?.data || []).find((u) => String(u.userId) === String(pinStr));
    if (!match) {
      return res.status(404).json({ success: false, error: `User with PIN ${pinStr} not found on device.` });
    }

    const uidBuffer = Buffer.alloc(2);
    uidBuffer.writeUInt16LE(match.uid, 0);
    await zkInstance.executeCmd(18, uidBuffer); // CMD_DELETE_USER

    console.log(`🗑️ Deleted User PIN: ${pinStr} (uid=${match.uid}) from F22 hardware.`);
    res.json({ success: true, message: "User deleted from hardware" });
  } catch (err) {
    const errMsg = getErrMsg(err);
    console.error("Delete user error:", errMsg);
    res.status(500).json({ success: false, error: errMsg });
  } finally {
    try { await zkInstance.disconnect(); } catch (e) {}
  }
});

// ─── POST /api/enforce-expiry ─────────────────────────────────────────────────
// Block an expired/specific user from the device
router.post("/enforce-expiry", async (req, res) => {
  const { uid, pin } = req.body;
  if (!uid && !pin) return res.status(400).json({ error: "uid or pin is required" });

  const pinStr = sanitizePin(pin);
  const zkInstance = new ZKLib(zkConfig.ZK_IP, zkConfig.ZK_PORT, 10000, 4000);
  try {
    await zkInstance.createSocket();

    let targetUid = uid ? parseInt(uid, 10) : null;

    if (!targetUid) {
      const users = await zkInstance.getUsers();
      const match = (users?.data || []).find((u) => String(u.userId) === String(pinStr));
      if (!match) {
        return res.status(404).json({ success: false, error: `User with PIN ${pinStr} not found on device.` });
      }
      targetUid = match.uid;
    }

    const uidBuffer = Buffer.alloc(2);
    uidBuffer.writeUInt16LE(targetUid, 0);
    await zkInstance.executeCmd(18, uidBuffer);

    console.log(`🚫 Access revoked: uid=${targetUid} (PIN: ${pinStr}) deleted from hardware.`);
    res.json({ success: true, message: "Access blocked. User deleted from hardware." });
  } catch (err) {
    const errMsg = getErrMsg(err);
    console.error("Enforce expiry error:", errMsg);
    res.status(500).json({ success: false, error: errMsg });
  } finally {
    try { await zkInstance.disconnect(); } catch (e) {}
  }
});

module.exports = router;
