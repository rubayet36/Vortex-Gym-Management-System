require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { startAutoSync } = require("./sync");
const deviceRoutes = require("./routes/deviceRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const { pool } = require("./db");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ─── Mount Routes ─────────────────────────────────────────────────────────────
app.use("/api", deviceRoutes);
app.use("/api", attendanceRoutes);

async function checkMigration() {
  try {
    const [columns] = await pool.query("SHOW COLUMNS FROM user_subscriptions LIKE 'whatsapp_warning_sent'");
    if (columns.length === 0) {
      await pool.query("ALTER TABLE user_subscriptions ADD COLUMN whatsapp_warning_sent TINYINT(1) DEFAULT 0");
      console.log("📦 [db] Database migration successful: added whatsapp_warning_sent column to user_subscriptions.");
    }
  } catch (err) {
    console.error("❌ [db] Migration failed:", err.message);
  }
}

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  const dbName = process.env.DB_NAME || "vortex_gym";
  console.log(`\n🚀 ZKTeco Bridge API running on http://localhost:${PORT}`);
  console.log(`📦 Connected to MySQL database: ${dbName} on localhost`);
  
  // Run DB warning flag migration
  await checkMigration();

  // Initialize WhatsApp client
  const { initWhatsApp } = require("./whatsapp");
  initWhatsApp();

  // Start auto-sync loop
  startAutoSync();
});
