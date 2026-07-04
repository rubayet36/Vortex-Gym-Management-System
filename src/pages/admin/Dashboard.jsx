import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  DollarSign,
  Activity,
  TrendingUp,
  UserPlus,
  X,
  Mail,
  Lock,
  User,
  CheckCircle2,
  Shield,
  Fingerprint,
  Phone,
  RefreshCw,
  Ban,
  UserCheck,
  AlertCircle,
  CreditCard,
  Trash2,
} from "lucide-react";
import ExpiredMembers from "../../components/admin/ExpiredMembers";
import BusinessOverview from "../../components/admin/BusinessOverview";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

const BRIDGE = "/api/zk_proxy.php?endpoint=";

const AdminDashboard = () => {
  const { profile } = useAuth();
  const isOwner = profile?.role === "owner";
  const [stats, setStats] = useState({
    activeMembers: "...",
    thisMonthRegistrations: "...",
    expiringSoon: "...",
    todayRevenue: "...",
  });
  const [showAddManagerModal, setShowAddManagerModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.dashboard.stats();
        const d = res?.data || {};
        setStats({
          activeMembers: d.activeMembers ?? 0,
          thisMonthRegistrations: d.thisMonthRegistrations ?? 0,
          expiringSoon: d.expiringSoon ?? 0,
          todayRevenue: d.todayRevenue ?? 0,
        });
      } catch (e) {
        console.error("Dashboard stats error:", e);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-5 md:space-y-8 md:px-8 md:py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-text-main tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-text-muted mt-1">
            Welcome back, {isOwner ? "owner" : "manager"}. Here's what's happening today.
          </p>
        </div>
        {isOwner && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowStaffModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all"
            >
              <Shield className="w-4 h-4" />
              Staff Accounts
            </button>
            <button
              onClick={() => setShowAddManagerModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Add Manager
            </button>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total  Members"
          value={stats.activeMembers.toLocaleString()}
          icon={<Users className="w-5 h-5 text-secondary" />}
        />
        <StatCard
          title="This Month's Registrations"
          value={stats.thisMonthRegistrations.toLocaleString()}
          icon={<UserPlus className="w-5 h-5 text-accent" />}
        />
        <StatCard
          title="Revenue Today"
          value={stats.todayRevenue === "..." ? "..." : `${Number(stats.todayRevenue).toLocaleString()} BDT`}
          icon={<DollarSign className="w-5 h-5 text-primary" />}
        />
        <StatCard
          title="Expiring Soon (5 days)"
          value={stats.expiringSoon.toLocaleString()}
          icon={<TrendingUp className="w-5 h-5 text-text-muted" />}
        />
      </div>

      {/* Critical: Expired Members Visual Dashboard */}
      <ExpiredMembers />

      {/* Charts */}
      <BusinessOverview />

      {/* Add Manager Modal */}
      {showAddManagerModal && (
        <AddManagerModal onClose={() => setShowAddManagerModal(false)} />
      )}

      {/* Staff Accounts Modal */}
      {showStaffModal && (
        <StaffAccountModal onClose={() => setShowStaffModal(false)} />
      )}
    </div>
  );
};

// ─── Add Manager Modal ─────────────────────────────────────────────────────────
const AddManagerModal = ({ onClose }) => {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.firstName.trim()) return setError("First name is required.");
    if (!form.email.trim()) return setError("Email is required.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");

    setSaving(true);
    try {
      await api.auth.signup(
        form.email.trim().toLowerCase(),
        form.password,
        form.firstName.trim(),
        form.lastName.trim(),
        "manager"
      );
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to create manager account.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-2xl w-[95%] max-w-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <UserPlus className="w-5 h-5 text-accent" />
            </div>
            <div>
          <h2 className="text-text-main font-bold">Add Manager</h2>
              <p className="text-text-muted text-xs mt-0.5">Create a manager account for this gym</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-accent" />
            </div>
            <h3 className="text-text-main font-bold text-lg">Manager Created!</h3>
            <p className="text-text-muted text-sm">
              <span className="text-white font-medium">{form.email}</span> can now log in as a manager.
            </p>
            <button onClick={onClose} className="btn-primary w-full mt-4">Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">First Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    className="input-field pl-9"
                    placeholder="John"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Last Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Doe"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="email"
                  className="input-field pl-9"
                  placeholder="manager@vortexgym.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="password"
                  className="input-field pl-9"
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? "Creating..." : "Create Manager"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// ─── Staff Account Modal ───────────────────────────────────────────────────────
const StaffAccountModal = ({ onClose }) => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [blockingId, setBlockingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.profiles.list({ role: "staff" });
      setStaffList(res?.data || []);
    } catch (e) {
      console.error("fetchStaff error:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const handleBlockAccess = async (staff) => {
    const pin = staff.pin;
    const fullName = `${staff.first_name} ${staff.last_name}`.trim();
    if (!window.confirm(`Block door access for "${fullName}"?\n\nThis removes them from the F22 device and deactivates their account. You can re-enable them from the database if needed.`))
      return;

    setBlockingId(staff.id);
    try {
      // Remove from ZKTeco device if PIN exists
      if (pin) {
        try {
          await fetch(`${BRIDGE}/api/enforce-expiry`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pin: String(pin) }),
          });
        } catch {
          // Bridge offline — still deactivate in DB
        }
      }
      // Deactivate in DB
      await api.profiles.update(staff.id, { is_active: 0 });
      showToast(`🚫 "${fullName}" blocked — removed from F22 device.`);
      fetchStaff();
    } catch (e) {
      showToast(e.message || "Block failed.", "error");
    } finally {
      setBlockingId(null);
    }
  };

  const handleDeleteStaff = async (staff) => {
    const fullName = `${staff.first_name} ${staff.last_name}`.trim();
    if (!window.confirm(`Permanently delete "${fullName}"?\n\nThis removes them from the F22 device AND deletes the account from the database. This cannot be undone.`))
      return;

    setDeletingId(staff.id);
    try {
      if (staff.pin) {
        try {
          await fetch(`${BRIDGE}/api/enforce-expiry`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pin: String(staff.pin) }),
          });
        } catch { /* Bridge offline — still delete */ }
      }
      await api.profiles.delete(staff.id);
      showToast(`🗑️ "${fullName}" deleted permanently.`);
      fetchStaff();
    } catch (e) {
      showToast(e.message || "Delete failed.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-2xl w-[95%] max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-white font-bold">Staff Accounts</h2>
              <p className="text-text-muted text-xs mt-0.5">Door access admin accounts — no expiry</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreate((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all"
            >
              <UserCheck className="w-4 h-4" />
              {showCreate ? "Cancel" : "Create Staff Account"}
            </button>
            <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`mx-5 mt-4 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border flex-shrink-0 ${
            toast.type === "error"
              ? "bg-red-500/10 border-red-500/30 text-red-400"
              : "bg-blue-500/10 border-blue-500/30 text-blue-400"
          }`}>
            {toast.type === "error" ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            {toast.msg}
          </div>
        )}

        {/* Create Form (collapsible) */}
        {showCreate && (
          <CreateStaffForm
            onClose={() => setShowCreate(false)}
            onSuccess={() => {
              setShowCreate(false);
              fetchStaff();
              showToast("✅ Staff account created and pushed to device!");
            }}
            onError={(msg) => showToast(msg, "error")}
          />
        )}

        {/* Staff List */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="p-12 text-center text-text-muted">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-blue-400" />
              Loading staff accounts...
            </div>
          ) : staffList.length === 0 ? (
            <div className="p-12 text-center text-text-muted">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium">No staff accounts yet</p>
              <p className="text-sm text-text-muted/60 mt-1">Click "Create Staff Account" to add one.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-surface z-10">
                <tr className="bg-surfaceLight/50 text-text-muted text-xs uppercase tracking-wider border-b border-border/50">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Device PIN</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {staffList.map((staff) => (
                  <tr key={staff.id} className={`transition-colors ${
                    staff.is_active ? "hover:bg-surfaceLight/20" : "opacity-50"
                  }`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm flex-shrink-0">
                          {(staff.first_name || "S").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{staff.first_name} {staff.last_name}</p>
                          <p className="text-text-muted text-xs">ID: {staff.member_id || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-text-muted">{staff.phone_number || "—"}</td>
                    <td className="px-4 py-4">
                      <span className="flex items-center gap-1.5 text-sm text-white font-mono">
                        <Fingerprint className="w-3.5 h-3.5 text-blue-400" />
                        {staff.pin || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {staff.is_active ? (
                        <span className="px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 w-max bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 w-max bg-red-500/10 text-red-400 border border-red-500/20">
                          <Ban className="w-3 h-3" />
                          Blocked
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {staff.is_active && (
                          <button
                            onClick={() => handleBlockAccess(staff)}
                            disabled={blockingId === staff.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all border border-red-500/30 hover:border-red-500 disabled:opacity-50"
                          >
                            {blockingId === staff.id
                              ? <RefreshCw className="w-3 h-3 animate-spin" />
                              : <Ban className="w-3 h-3" />}
                            {blockingId === staff.id ? "Blocking..." : "Block Access"}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteStaff(staff)}
                          disabled={deletingId === staff.id}
                          title="Delete staff account permanently"
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-500/10 text-gray-400 hover:bg-red-600 hover:text-white transition-all border border-gray-500/20 hover:border-red-600 disabled:opacity-50"
                        >
                          {deletingId === staff.id
                            ? <RefreshCw className="w-3 h-3 animate-spin" />
                            : <Trash2 className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Create Staff Form (inline within StaffAccountModal) ───────────────────────
const CreateStaffForm = ({ onClose, onSuccess, onError }) => {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    staffId: "",
    devicePin: "",
    cardno: "",
  });
  const [nextPin, setNextPin] = useState(null);
  const [loadingPin, setLoadingPin] = useState(true);
  const [bridgeOnline, setBridgeOnline] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Check bridge and fetch next PIN
    fetch(`${BRIDGE}/api/status`)
      .then((r) => { if (r.ok) setBridgeOnline(true); })
      .catch(() => {});

    fetch(`${BRIDGE}/api/latest-pin`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.nextPin) {
          setNextPin(d.nextPin);
          setForm((f) => ({ ...f, devicePin: String(d.nextPin) }));
        }
      })
      .catch(() => setNextPin(null))
      .finally(() => setLoadingPin(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim()) return onError("First name is required.");
    if (!form.staffId.trim()) return onError("Staff ID is required.");

    setSaving(true);
    try {
      const pin = form.devicePin ? String(form.devicePin) : null;
      const staffId = String(form.staffId).trim();
      const fullEmail = `staff_${staffId}@gym.local`;
      const password = `StaffPass!${staffId}`;

      // 1. Create profile
      const cardno = form.cardno ? parseInt(form.cardno, 10) : 0;
      const profileRes = await api.profiles.create({
        email: fullEmail,
        password,
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        phone_number: form.phone.trim() || null,
        member_id: staffId,
        pin: pin || null,
        cardno,
        role: "staff",
      });
      if (!profileRes?.data?.id) throw new Error("Profile creation failed.");

      // 2. Push to ZKTeco device (non-blocking)
      if (bridgeOnline && pin) {
        try {
          await fetch(`${BRIDGE}/api/users`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pin,
              name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
              cardno: form.cardno ? parseInt(form.cardno, 10) : 0,
            }),
          });
        } catch {
          // Non-blocking — account saved, device push failed
        }
      }

      onSuccess();
    } catch (err) {
      onError(err.message || "Failed to create staff account.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5 border-b border-border bg-surfaceLight/30 space-y-4 flex-shrink-0"
    >
      <p className="text-sm font-semibold text-blue-400 flex items-center gap-2">
        <UserCheck className="w-4 h-4" /> New Staff Account
      </p>

      {/* Staff ID + Device PIN */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Staff ID *</label>
          <input
            type="text"
            className="input-field border-blue-500/40"
            placeholder="e.g. S001"
            value={form.staffId}
            onChange={(e) => setForm((f) => ({ ...f, staffId: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="label flex items-center gap-1">
            <Fingerprint className="w-3.5 h-3.5 text-blue-400" /> Device PIN
            {!bridgeOnline && <span className="text-xs text-yellow-400 ml-1">(bridge offline)</span>}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="input-field flex-1"
              placeholder={loadingPin ? "Fetching..." : "Auto-assigned"}
              value={form.devicePin}
              onChange={(e) => setForm((f) => ({ ...f, devicePin: e.target.value }))}
            />
            {loadingPin && <RefreshCw className="w-4 h-4 animate-spin text-text-muted flex-shrink-0" />}
            {!loadingPin && nextPin && form.devicePin === String(nextPin) && (
              <span className="text-blue-400 text-xs flex-shrink-0">Auto</span>
            )}
          </div>
        </div>
      </div>

      {/* Name fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">First Name *</label>
          <input
            type="text"
            className="input-field"
            placeholder="Jane"
            value={form.firstName}
            onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="label">Last Name</label>
          <input
            type="text"
            className="input-field"
            placeholder="Doe"
            value={form.lastName}
            onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
          />
        </div>
      </div>

      {/* Phone + RFID */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Phone</label>
          <input
            type="tel"
            className="input-field"
            placeholder="01XXXXXXXXX"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>
        <div>
          <label className="label flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5 text-blue-400" /> RFID Card No
          </label>
          <input
            type="number"
            className="input-field"
            placeholder="Optional card number"
            value={form.cardno}
            onChange={(e) => setForm((f) => ({ ...f, cardno: e.target.value }))}
          />
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg px-4 py-2 text-xs text-blue-300">
        🔒 Staff accounts have <strong>no expiry date</strong>. They remain active until you block them from this panel.
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-2 px-4 rounded-xl font-semibold text-sm bg-blue-600 text-white hover:bg-blue-500 transition-all disabled:opacity-60"
        >
          {saving ? "Creating..." : "Create Staff Account"}
        </button>
      </div>
    </form>
  );
};

// Miniature stat card component
const StatCard = ({ title, value, change, trend, icon }) => (
  <div className="card p-5 border-border/40 hover:border-border transition-colors">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-text-muted">{title}</p>
        <h4 className="mt-2 text-2xl font-bold text-text-main">{value}</h4>
      </div>
      <div className="p-2 bg-surfaceLight rounded-lg">{icon}</div>
    </div>
    {change && (
      <div
        className={`mt-4 text-xs font-medium flex items-center gap-1 ${trend === "up" ? "text-accent" : "text-primary"}`}
      >
        <span>{change}</span>
        <span className="text-text-muted font-normal">vs last week</span>
      </div>
    )}
  </div>
);

export default AdminDashboard;
