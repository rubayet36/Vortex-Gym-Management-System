import dotenv from "dotenv";
import mysql from "mysql2/promise";
import ZKLib from "zklib-js";
import crypto from "crypto";

dotenv.config();

const ZK_IP = process.env.ZKTECO_IP || "192.168.68.100";
const ZK_PORT = parseInt(process.env.ZKTECO_PORT || "8010", 10);
const NA_PACKAGE_ID = "03220bcb-1de7-11f1-a18f-14133381e81e"; // N/A package UUID

// Helper to generate UUID v4
function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

async function syncDeviceUsersToDB() {
  // ─── MySQL Connection ────────────────────────────────────────────
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "vortex_gym",
  });

  console.log(`\n[${new Date().toISOString()}] Connecting to ZKTeco F22 at ${ZK_IP}:${ZK_PORT}...`);
  const zkInstance = new ZKLib(ZK_IP, ZK_PORT, 10000, 4000);

  let result = {
    fetched: 0,
    added: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    await zkInstance.createSocket();
    console.log("Connected to ZKTeco Machine. Fetching users...");
    
    // Fetch all ZKTeco Users
    const devUsers = await zkInstance.getUsers();
    const userList = devUsers?.data || [];
    result.fetched = userList.length;
    console.log(`Found ${result.fetched} users on device.`);

    // Get all existing profiles to avoid duplicates (using phone_number as PIN matching)
    const [existingProfiles] = await pool.query("SELECT phone_number FROM profiles");
    const existingPins = new Set(existingProfiles.map(p => String(p.phone_number)));

    for (const u of userList) {
      // ZKTeco device user PINs usually come through as userId
      const pinStr = String(u.userId);

      if (existingPins.has(pinStr)) {
        // We already have this user in the DB
        result.skipped++;
        continue;
      }

      // We need to create the user in the database
      const profileId = uuidv4();
      
      // We don't have emails, names might be partial, etc. We'll use formatting.
      const nameParts = (u.name || `User_${pinStr}`).split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      const fakeEmail = `zk_${pinStr}@vortex.gym`;
      const hash = crypto.createHash("md5").update("123456").digest("hex"); // placeholder pass

      // 1. Insert Profile
      try {
        await pool.query(
          `INSERT INTO profiles 
           (id, email, password_hash, first_name, last_name, phone_number, pin, role, is_active, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, 'member', 1, NOW())`,
          [profileId, fakeEmail, hash, firstName, lastName, pinStr, pinStr]
        );

        // 2. Insert N/A Package Subscription
        const subId = uuidv4();
        // Give them an active subscription but far past end_date initially, or empty. 
        // We'll give it a generic date that admin has to edit.
        const defaultEndDate = new Date();
        defaultEndDate.setFullYear(2099); // Placeholder far future date till "Set Expiry" used OR expired yesterday.
        // Better: Set it to expire immediately so it prompts them to set the REAL date.
        const zeroDate = new Date();
        zeroDate.setHours(0,0,0,0);
        
        await pool.query(
          `INSERT INTO user_subscriptions 
           (id, user_id, package_id, status, start_date, end_date, price_at_purchase) 
           VALUES (?, ?, ?, 'active', NOW(), ?, 0)`,
          [subId, profileId, NA_PACKAGE_ID, zeroDate.toISOString().split('T')[0]]
        );

        console.log(`✅ Added ${firstName} ${lastName} (Device PIN: ${pinStr}) to DB`);
        result.added++;
      } catch (err) {
        console.error(`❌ Failed adding user ${pinStr}:`, err.message);
        result.errors++;
      }
    }

    console.log("\nSync Complete!");
    console.log(result);

  } catch (err) {
    console.error("Critical Sync Error:", err);
  } finally {
    try { await zkInstance.disconnect(); } catch (e) {}
    await pool.end();
  }
}

syncDeviceUsersToDB();
