// ─── Central API Client for XAMPP PHP backend ────────────────────────────────
// The React dev-server proxies /api/* to XAMPP via vite.config.js (see below).
// For production builds placed inside htdocs you can set BASE_URL to '' (empty).
const BASE_URL = "/api";

function getToken() {
  return localStorage.getItem("gymos_token") || "";
}

async function request(path, method = "GET", body = null) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, options);
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json;
}

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    login: (email, password) =>
      request("/auth.php?action=login", "POST", { email, password }),
    signup: (email, password, firstName, lastName, role) =>
      request("/auth.php?action=signup", "POST", {
        email, password, first_name: firstName, last_name: lastName, role,
      }),
    session: () => request("/auth.php?action=session"),
  },

  // ─── Profiles ───────────────────────────────────────────────────────────────
  profiles: {
    list: (filters = {}) => {
      const qs = new URLSearchParams(filters).toString();
      return request(`/profiles.php${qs ? "?" + qs : ""}`);
    },
    get: (id) => request(`/profiles.php?id=${id}`),
    create: (data) => request("/profiles.php", "POST", data),
    update: (id, data) => request(`/profiles.php?id=${id}`, "PUT", data),
    delete: (id) => request(`/profiles.php?id=${id}`, "DELETE"),
  },

  // ─── Packages ───────────────────────────────────────────────────────────────
  packages: {
    list: () => request("/packages.php"),
    get: (id) => request(`/packages.php?id=${id}`),
    create: (data) => request("/packages.php", "POST", data),
    update: (id, data) => request(`/packages.php?id=${id}`, "PUT", data),
    delete: (id) => request(`/packages.php?id=${id}`, "DELETE"),
    stats: () => request("/package_stats.php"),
  },

  // ─── Subscriptions ──────────────────────────────────────────────────────────
  subscriptions: {
    list: (filters = {}) => {
      const qs = new URLSearchParams(filters).toString();
      return request(`/subscriptions.php${qs ? "?" + qs : ""}`);
    },
    create: (data) => request("/subscriptions.php", "POST", data),
    update: (id, data) => request(`/subscriptions.php?id=${id}`, "PUT", data),
  },

  // ─── Attendance ─────────────────────────────────────────────────────────────
  attendance: {
    list: (filters = {}) => {
      const qs = new URLSearchParams(filters).toString();
      return request(`/attendance.php${qs ? "?" + qs : ""}`);
    },
    create: (data) => request("/attendance.php", "POST", data),
    update: (id, data) => request(`/attendance.php?id=${id}`, "PUT", data),
  },

  // ─── Dashboard ──────────────────────────────────────────────────────────────
  dashboard: {
    stats: () => request("/dashboard.php"),
  },

  // ─── Payments ───────────────────────────────────────────────────────────────
  payments: {
    list: (filters = {}) => {
      const qs = new URLSearchParams(filters).toString();
      return request(`/payments.php${qs ? "?" + qs : ""}`);
    },
    create: (data) => request("/payments.php", "POST", data),
    update: (id, data) => request(`/payments.php?id=${id}`, "PUT", data),
  },

  // ─── Upload ─────────────────────────────────────────────────────────────────
    upload: {
    photo: async (userId, file) => {
      const token = getToken();
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("user_id", userId);
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${BASE_URL}/upload.php?user_id=${userId}`, {
        method: "POST",
        headers,
        body: formData,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      return json;
    },
  },

  // ─── Expenses ───────────────────────────────────────────────────────────────
  expenses: {
    list: (filters = {}) => {
      const qs = new URLSearchParams(filters).toString();
      return request(`/expenses.php${qs ? "?" + qs : ""}`);
    },
    create: (data) => request("/expenses.php", "POST", data),
    delete: (id) => request(`/expenses.php?id=${id}`, "DELETE"),
  },

  // ─── Monthly Summary ────────────────────────────────────────────────────────
  monthlySummary: {
    get: () => request("/monthly_summary.php")
  }
};
