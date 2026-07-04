// Shared constants and utility functions for the Members Manager

export const BRIDGE = "/api/zk_proxy.php?endpoint=";

// Package options with durations in days
export const PACKAGE_OPTIONS = [
  { label: "1 Month", days: 30 },
  { label: "3 Months", days: 90 },
  { label: "6 Months", days: 180 },
  { label: "12 Months", days: 365 },
];

// Utility: get local date string YYYY-MM-DD
export function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Utility: get local datetime string YYYY-MM-DD HH:MM:SS (device local time)
export function getLocalDateTimeString(date = new Date()) {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${y}-${mo}-${d} ${h}:${mi}:${s}`;
}

// Utility: format a payment/datetime string as DD/MM/YYYY WITHOUT JS Date() parsing
// This avoids timezone shifting — reads the date directly from the YYYY-MM-DD prefix
export function fmtPayDate(dtStr) {
  if (!dtStr) return "—";
  const datePart = String(dtStr).slice(0, 10); // "2026-03-14"
  const [y, m, d] = datePart.split("-");
  if (!y || !m || !d) return dtStr;
  return `${d}/${m}/${y}`; // "14/03/2026"
}

// Utility: compute expiry date from today + days
export function computeExpiryDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return getLocalDateString(d);
}

// Utility: days left from today
// NOTE: Parse date string components directly to avoid UTC-midnight off-by-one
// in Dhaka timezone. new Date('2026-04-15') is UTC midnight = 2026-04-14 18:00 local.
export function daysLeft(endDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = String(endDate).split("-").map(Number);
  const end = new Date(y, m - 1, d); // local midnight
  const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  return diff;
}
