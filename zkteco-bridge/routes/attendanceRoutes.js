const express  = require("express");
const ZKLib    = require("zklib-js");
const { pool, uuidv4 } = require("../db");
const zkConfig = require("../zkConfig");

const router = express.Router();

const getErrMsg = (err) => {
  if (!err) return "Unknown error";
  return err.message || String(err);
};

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000; // UTC+6

// ─── Time Helpers (Dhaka UTC+6) ───────────────────────────────────────────────

function toDhakaStr(utcDate) {
  const d = new Date(utcDate.getTime() + DHAKA_OFFSET_MS);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth()+1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

function toDhakaDate(utcDate) {
  const d = new Date(utcDate.getTime() + DHAKA_OFFSET_MS);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth()+1)}-${p(d.getUTCDate())}`;
}

// mysql2 returns DATETIME as JS Date in local server time; DB stores Dhaka wall-clock values
function formatDhakaDatetime(dt) {
  if (!dt) return null;
  if (dt instanceof Date) {
    const p = (n) => String(n).padStart(2, "0");
    return `${dt.getFullYear()}-${p(dt.getMonth()+1)}-${p(dt.getDate())} ${p(dt.getHours())}:${p(dt.getMinutes())}:${p(dt.getSeconds())}`;
  }
  return String(dt).replace("T", " ").split(".")[0];
}

async function buildProfileMap(pins) {
  if (!pins || pins.length === 0) return {};
  const ph = pins.map(() => "?").join(", ");
  const [rows] = await pool.query(
    `SELECT id, first_name, last_name, phone_number, pin FROM profiles WHERE pin IN (${ph}) OR phone_number IN (${ph})`,
    [...pins, ...pins]
  );
  const map = {};
  for (const r of rows) {
    const key = String(r.pin || r.phone_number || "");
    if (key) map[key] = r;
  }
  return map;
}

// ─── GET /api/live-attendance ─────────────────────────────────────────────────
// Fetches from device, groups punches per person per day (1st=in, 2nd>5min=out).
// All times Dhaka (UTC+6). Optional ?date=YYYY-MM-DD filter.
router.get("/live-attendance", async (req, res) => {
  const zkInstance = new ZKLib(zkConfig.ZK_IP, zkConfig.ZK_PORT, 10000, 4000);
  try {
    await zkInstance.createSocket();
    const raw = (await zkInstance.getAttendances())?.data || [];
    console.log(`[live-attendance] ${raw.length} logs from device.`);

    const allPins = [...new Set(raw.map((l) => String(l.deviceUserId)))];
    const profileMap = await buildProfileMap(allPins);
    const filterDate = req.query.date || null;

    raw.sort((a, b) => new Date(a.recordTime) - new Date(b.recordTime));

    const grouped = {};
    for (const log of raw) {
      const pin = String(log.deviceUserId);
      const utc = new Date(log.recordTime);
      if (isNaN(utc.getTime())) continue;
      const dateStr = toDhakaDate(utc);
      if (filterDate && dateStr !== filterDate) continue;
      const timeStr = toDhakaStr(utc);
      const ms      = utc.getTime() + DHAKA_OFFSET_MS;
      const key     = `${dateStr}_${pin}`;
      const prof    = profileMap[pin] || null;
      if (!grouped[key]) {
        grouped[key] = {
          id: uuidv4(), pin, date: dateStr,
          check_in_time: timeStr, check_in_ms: ms, check_out_time: null,
          user_id:      prof?.id           || null,
          first_name:   prof?.first_name   || `Unknown (PIN: ${pin})`,
          last_name:    prof?.last_name    || "",
          phone_number: prof?.phone_number || pin,
        };
      } else {
        const rec = grouped[key];
        if (!rec.check_out_time && (ms - rec.check_in_ms) > 5 * 60 * 1000)
          rec.check_out_time = timeStr;
      }
    }

    // Sort newest check-in first (descending)
    const data = Object.values(grouped).sort((a, b) => (b.check_in_time > a.check_in_time ? 1 : -1));
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    const errMsg = getErrMsg(err);
    console.error("[live-attendance] Error:", errMsg);
    res.status(500).json({ success: false, error: errMsg, data: [] });
  } finally {
    try { await zkInstance.disconnect(); } catch (_) {}
  }
});

// ─── GET /api/raw-punches ─────────────────────────────────────────────────────
// Every individual punch event from the device — no grouping.
// Odd punches per person per day = "in", even = "out".
// All times Dhaka (UTC+6). Optional ?date=YYYY-MM-DD filter.
router.get("/raw-punches", async (req, res) => {
  const zkInstance = new ZKLib(zkConfig.ZK_IP, zkConfig.ZK_PORT, 10000, 4000);
  try {
    await zkInstance.createSocket();
    const raw = (await zkInstance.getAttendances())?.data || [];
    console.log(`[raw-punches] ${raw.length} logs from device.`);

    const allPins = [...new Set(raw.map((l) => String(l.deviceUserId)))];
    const profileMap = await buildProfileMap(allPins);
    const filterDate = req.query.date || null;

    raw.sort((a, b) => new Date(a.recordTime) - new Date(b.recordTime));

    const seqCount = {}; // "date_pin" → count
    const punches  = [];

    for (const log of raw) {
      const pin = String(log.deviceUserId);
      const utc = new Date(log.recordTime);
      if (isNaN(utc.getTime())) continue;
      const dateStr = toDhakaDate(utc);
      if (filterDate && dateStr !== filterDate) continue;
      const timeStr = toDhakaStr(utc);
      const ms      = utc.getTime() + DHAKA_OFFSET_MS;
      const key     = `${dateStr}_${pin}`;
      seqCount[key] = (seqCount[key] || 0) + 1;
      const seq  = seqCount[key];
      const type = seq % 2 === 1 ? "in" : "out";
      const prof = profileMap[pin] || null;
      punches.push({
        id: uuidv4(), pin, date: dateStr, time: timeStr, time_ms: ms,
        type, seq,
        user_id:      prof?.id           || null,
        first_name:   prof?.first_name   || `Unknown (PIN: ${pin})`,
        last_name:    prof?.last_name    || "",
        phone_number: prof?.phone_number || pin,
      });
    }

    punches.sort((a, b) => a.time_ms - b.time_ms);
    res.json({ success: true, data: punches, count: punches.length });
  } catch (err) {
    const errMsg = getErrMsg(err);
    console.error("[raw-punches] Error:", errMsg);
    res.status(500).json({ success: false, error: errMsg, data: [] });
  } finally {
    try { await zkInstance.disconnect(); } catch (_) {}
  }
});

// ─── GET /api/attendance-from-db ─────────────────────────────────────────────
// Fast DB lookup. Accepts ?date=YYYY-MM-DD and/or ?user_id=UUID.
router.get("/attendance-from-db", async (req, res) => {
  const { date, user_id } = req.query;
  try {
    let sql = `SELECT a.id, a.user_id, a.date, a.check_in_time, a.check_out_time,
               p.first_name, p.last_name, p.phone_number, p.pin, p.is_paused,
               us.status AS sub_status, us.end_date, pk.name AS package_name,
               GREATEST(0,
                 COALESCE((SELECT SUM(py.due_amount) FROM payments py WHERE py.user_id = p.id AND py.payment_type NOT IN ('DUE_PAYMENT') AND py.payment_type NOT LIKE 'Due Clear%' AND py.payment_type NOT LIKE 'Partial Due%'), 0) -
                 COALESCE((SELECT SUM(py.paid_amount) FROM payments py WHERE py.user_id = p.id AND (py.payment_type = 'DUE_PAYMENT' OR py.payment_type LIKE 'Due Clear%' OR py.payment_type LIKE 'Partial Due%')), 0)
               ) AS total_due
               FROM attendance a 
               JOIN profiles p ON p.id = a.user_id 
               LEFT JOIN user_subscriptions us ON us.id = (
                   SELECT id FROM user_subscriptions s2
                   WHERE s2.user_id = p.id
                   ORDER BY s2.created_at DESC LIMIT 1
               )
               LEFT JOIN packages pk ON pk.id = us.package_id
               WHERE 1=1`;
    const params = [];
    if (date)    { sql += " AND a.date = ?";    params.push(date); }
    if (user_id) { sql += " AND a.user_id = ?"; params.push(user_id); }
    sql += " ORDER BY a.check_in_time DESC LIMIT 1000";

    const [rows] = await pool.query(sql, params);
    const data = rows.map((r) => {
      let dateStr;
      if (r.date instanceof Date) {
        const p = (n) => String(n).padStart(2, "0");
        dateStr = `${r.date.getFullYear()}-${p(r.date.getMonth()+1)}-${p(r.date.getDate())}`;
      } else {
        dateStr = String(r.date).split("T")[0];
      }
      return {
        id: r.id, pin: r.pin || r.phone_number, date: dateStr,
        check_in_time:  formatDhakaDatetime(r.check_in_time),
        check_out_time: formatDhakaDatetime(r.check_out_time),
        user_id: r.user_id, first_name: r.first_name,
        last_name: r.last_name, phone_number: r.phone_number,
        is_paused: r.is_paused,
        sub_status: r.sub_status,
        end_date: r.end_date,
        package_name: r.package_name,
        total_due: r.total_due,
      };
    });
    console.log(`[attendance-from-db] ${data.length} records.`);
    res.json({ success: true, data, count: data.length, source: "database" });
  } catch (err) {
    const errMsg = getErrMsg(err);
    console.error("[attendance-from-db] Error:", errMsg);
    res.status(500).json({ success: false, error: errMsg, data: [] });
  }
});

// ─── POST /api/seed-packages ──────────────────────────────────────────────────
router.post("/seed-packages", async (req, res) => {
  const packages = [
    { name: "1 Month",   description: "30-day gym access",           price: 0, duration_days: 30  },
    { name: "3 Months",  description: "90-day gym access",           price: 0, duration_days: 90  },
    { name: "6 Months",  description: "180-day gym access",          price: 0, duration_days: 180 },
    { name: "12 Months", description: "365-day gym access (Annual)", price: 0, duration_days: 365 },
  ];
  const results = [];
  for (const pkg of packages) {
    const [existing] = await pool.query("SELECT id FROM packages WHERE name = ? LIMIT 1", [pkg.name]);
    if (existing.length === 0) {
      const newId = uuidv4();
      await pool.query(
        "INSERT INTO packages (id, name, description, price, duration_days) VALUES (?, ?, ?, ?, ?)",
        [newId, pkg.name, pkg.description, pkg.price, pkg.duration_days]
      );
      results.push({ name: pkg.name, id: newId });
    } else {
      results.push({ name: pkg.name, existed: true });
    }
  }
  res.json({ success: true, packages: results });
});

module.exports = router;
