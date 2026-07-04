require("dotenv").config();
const mysql = require("mysql2/promise");
const ZKLib = require("zklib-js");
const crypto = require("crypto");

const ZK_IP = process.env.ZKTECO_IP || "192.168.68.100";
const ZK_PORT = parseInt(process.env.ZKTECO_PORT || "8010", 10);
const NA_PACKAGE_ID = "03220bcb-1de7-11f1-a18f-14133381e81e"; // N/A package UUID

function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

async function syncDeviceUsersToDB() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "vortex_gym",
  });

  console.log(`\n[${new Date().toISOString()}] Connecting to ZKTeco F22 at ${ZK_IP}:${ZK_PORT}...`);
  const zkInstance = new ZKLib(ZK_IP, ZK_PORT, 10000, 4000);

  let result = { fetched: 0, added: 0, skipped: 0, errors: 0 };

  try {
    await zkInstance.createSocket();
    console.log("✅ Connected to ZKTeco Machine. Fetching users...");

    const devUsers = await zkInstance.getUsers();
    const userList = devUsers?.data || [];
    result.fetched = userList.length;
    console.log(`Found ${result.fetched} users on device.\n`);

    // Get all existing profiles pins to avoid duplicates
    const [existingProfiles] = await pool.query("SELECT phone_number FROM profiles");
    const existingPins = new Set(existingProfiles.map(p => String(p.phone_number)));

    for (const u of userList) {
      const pinStr = String(u.userId);

      if (existingPins.has(pinStr)) {
        console.log(`⏭️  Skipped PIN ${pinStr} (already in DB)`);
        result.skipped++;
        continue;
      }

      const profileId = uuidv4();
      const nameParts = (u.name || `User_${pinStr}`).trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      const fakeEmail = `zk_${pinStr}@vortex.gym`;
      // Use a bcrypt-compatible placeholder — actually just a random hash people can't log in with
      const hash = "$2b$10$invalidhashplaceholderXXXXXXXXXXXXXXXXXXXXXXXXX";

      try {
        await pool.query(
          `INSERT INTO profiles (id, email, password_hash, first_name, last_name, phone_number, pin, role, is_active, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, 'member', 1, NOW())`,
          [profileId, fakeEmail, hash, firstName, lastName, pinStr, pinStr]
        );

        console.log(`✅ Added: ${firstName} ${lastName} (PIN: ${pinStr})`);
        result.added++;
        existingPins.add(pinStr);
      } catch (err) {
        console.error(`❌ Failed adding PIN ${pinStr}:`, err.message);
        result.errors++;
      }
    }

    console.log("\n=== Sync Summary ===");
    console.log(`Fetched from device : ${result.fetched}`);
    console.log(`Added to DB         : ${result.added}`);
    console.log(`Skipped (existing)  : ${result.skipped}`);
    console.log(`Errors              : ${result.errors}`);

  } catch (err) {
    console.error("Critical Sync Error:", err.message);
  } finally {
    try { await zkInstance.disconnect(); } catch (e) {}
    await pool.end();
  }
}

syncDeviceUsersToDB();
