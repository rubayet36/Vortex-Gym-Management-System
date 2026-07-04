import React, { useState, useEffect } from "react";
import {
  Package,
  Users,
  Activity,
  RefreshCw,
  TrendingUp,
  CheckCircle2,
  Clock,
  ChevronDown,
  X,
  User,
  CalendarDays,
} from "lucide-react";
import { api } from "../../lib/api";

// ─── Helper: days until expiry ────────────────────────────────────────────────
const daysLeft = (endDate) => {
  if (!endDate) return null;
  const diff = Math.ceil(
    (new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24)
  );
  return diff;
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const PackageHistory = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCustomModal, setShowCustomModal] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.packages.stats();
      setData(res?.data || null);
    } catch (e) {
      setError(e.message || "Failed to load package statistics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const main = data?.mainPackages || [];
  const customSummary = data?.customSummary || {};
  const customGrouped = data?.customGrouped || [];
  const totals = data?.totals || {};

  const topPackage = main.length
    ? [...main].sort(
        (a, b) =>
          Number(b.total_members_assigned_ever) -
          Number(a.total_members_assigned_ever)
      )[0]
    : null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-5 md:space-y-8 md:px-8 md:py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-text-main tracking-tight">
            Package History
          </h1>
          <p className="text-text-muted mt-1">
            Lifetime analytics for every membership package.
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          icon={<Package className="w-5 h-5 text-primary" />}
          label="Main Packages"
          value={loading ? "…" : totals.totalMainPackages ?? 0}
          bg="bg-primary/10"
        />
        <SummaryCard
          icon={<Users className="w-5 h-5 text-secondary" />}
          label="Custom Packages (Active)"
          value={loading ? "…" : Number(customSummary.currently_active ?? 0)}
          bg="bg-secondary/10"
          sub="click row below to view"
        />
        <SummaryCard
          icon={<Activity className="w-5 h-5 text-accent" />}
          label="Total Active Members"
          value={loading ? "…" : totals.totalActiveMembers ?? 0}
          bg="bg-accent/10"
        />
      </div>

      {/* Top Package Banner */}
      {!loading && topPackage && Number(topPackage.total_members_assigned_ever) > 0 && (
        <div className="card border-primary/20 p-5 flex items-center gap-4"
          style={{ background: "linear-gradient(to right, rgba(var(--color-primary-rgb,99,102,241),0.08), transparent)" }}>
          <div className="p-3 bg-primary/15 rounded-2xl flex-shrink-0">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-0.5">
              Best Performing Package
            </p>
            <p className="text-text-main font-bold text-lg">{topPackage.package_name}</p>
            <p className="text-text-muted text-sm">
              {topPackage.total_members_assigned_ever} member
              {Number(topPackage.total_members_assigned_ever) !== 1 ? "s" : ""} assigned total &middot;{" "}
              <span className="text-accent font-medium">
                {topPackage.currently_active_members} currently active
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="card border-border/40 overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Package className="w-4 h-4 text-primary" />
          </div>
          <h2 className="font-semibold text-text-main">All Packages</h2>
        </div>

        {loading ? (
          <div className="p-16 text-center text-text-muted">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-primary" />
            Loading package analytics…
          </div>
        ) : error ? (
          <div className="p-10 text-center text-red-400">
            <p className="font-semibold">{error}</p>
            <button onClick={fetchStats} className="mt-3 text-sm underline">Try again</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surfaceLight/40 text-text-muted text-xs uppercase tracking-wider border-b border-border/50">
                  <th className="px-5 py-3 font-medium">#</th>
                  <th className="px-5 py-3 font-medium">Package Name</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Total Assigned</th>
                  <th className="px-4 py-3 font-medium">Active Now</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {/* ── Main packages (hide unused) ── */}
                {main.filter(pkg =>
                  Number(pkg.total_members_assigned_ever) > 0 ||
                  Number(pkg.currently_active_members) > 0
                ).map((pkg, idx) => {
                  const ever   = Number(pkg.total_members_assigned_ever);
                  const active = Number(pkg.currently_active_members);
                  const isTop  = topPackage && pkg.id === topPackage.id && ever > 0;

                  return (
                    <tr key={pkg.id} className="hover:bg-surfaceLight/20 transition-colors">
                      <td className="px-5 py-4 text-text-muted text-sm">{idx + 1}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Package className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-text-main font-semibold text-sm">{pkg.package_name}</p>
                            {isTop && (
                              <span className="text-xs text-primary font-medium">★ Top package</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-text-main font-medium text-sm">
                        {Number(pkg.price).toLocaleString()} BDT
                      </td>
                      <td className="px-4 py-4 text-text-muted text-sm">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                          {pkg.duration_days} days
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-surfaceLight text-text-main">
                          <Users className="w-3 h-3" /> {ever.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          active > 0
                            ? "bg-accent/10 text-accent border border-accent/20"
                            : "bg-surfaceLight text-text-muted"
                        }`}>
                          <CheckCircle2 className="w-3 h-3" /> {active.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {active > 0 ? (
                          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-accent/10 text-accent border border-accent/20">Active</span>
                        ) : ever > 0 ? (
                          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Inactive</span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-surfaceLight text-text-muted">Unused</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* ── Custom packages collapsed row ── */}
                {Number(customSummary.total_custom_packages ?? 0) > 0 && (
                  <tr
                    className="cursor-pointer hover:bg-yellow-500/5 transition-colors border-t-2 border-border/60"
                    onClick={() => setShowCustomModal(true)}
                  >
                    <td className="px-5 py-4 text-text-muted text-sm">—</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                          <Package className="w-4 h-4 text-yellow-400" />
                        </div>
                        <div>
                          <p className="text-yellow-400 font-semibold text-sm flex items-center gap-1.5">
                            Custom Packages
                            <ChevronDown className="w-3.5 h-3.5" />
                          </p>
                          <p className="text-text-muted text-xs">
                            {customSummary.total_custom_packages} one-off packages · click to view active
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-text-muted text-sm">—</td>
                    <td className="px-4 py-4 text-text-muted text-sm">—</td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-surfaceLight text-text-main">
                        <Users className="w-3 h-3" /> {Number(customSummary.total_ever_assigned ?? 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                        <CheckCircle2 className="w-3 h-3" /> {Number(customSummary.currently_active ?? 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                        Custom
                      </span>
                    </td>
                  </tr>
                )}

                {main.length === 0 && Number(customSummary.total_custom_packages ?? 0) === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-text-muted">
                      <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p className="font-medium">No packages found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Custom Packages Modal */}
      {showCustomModal && (
        <CustomPackagesModal
          items={customGrouped}
          onClose={() => setShowCustomModal(false)}
        />
      )}
    </div>
  );
};

// ─── Custom Packages Modal ────────────────────────────────────────────────────
const CustomPackagesModal = ({ items, onClose }) => {
  const totalAssigned = items.reduce((s, i) => s + Number(i.total_assigned), 0);
  const totalActive   = items.reduce((s, i) => s + Number(i.active_count), 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-2xl w-[95%] max-w-lg shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Package className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-text-main font-bold">Custom Packages</h2>
              <p className="text-text-muted text-xs mt-0.5">
                {totalActive} active &middot; {totalAssigned} total assigned
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="py-10 text-center text-text-muted">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No custom packages found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((pkg, idx) => {
                const total  = Number(pkg.total_assigned);
                const active = Number(pkg.active_count);
                const pct    = total > 0 ? Math.round((active / total) * 100) : 0;
                const name   = (!pkg.package_name || pkg.package_name === "N/A")
                  ? "Custom Package"
                  : pkg.package_name;

                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-border/50 bg-surfaceLight/30 p-4 hover:border-yellow-500/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                          <Package className="w-3.5 h-3.5 text-yellow-400" />
                        </div>
                        <p className="text-text-main font-semibold text-sm truncate">{name}</p>
                      </div>
                      {active > 0 ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-accent/10 text-accent border border-accent/20 shrink-0">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-surfaceLight text-text-muted shrink-0">
                          Inactive
                        </span>
                      )}
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-lg font-bold text-text-main">{total}</p>
                        <p className="text-[11px] text-text-muted">Total</p>
                      </div>
                      <div className="flex-1 h-1.5 bg-border/40 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-center">
                        <p className={`text-lg font-bold ${active > 0 ? "text-accent" : "text-text-muted"}`}>
                          {active}
                        </p>
                        <p className="text-[11px] text-text-muted">Active</p>
                      </div>
                    </div>

                    {Number(pkg.duration_days) > 0 && (
                      <p className="mt-2 text-[11px] text-text-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {pkg.duration_days} days
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Summary Card ─────────────────────────────────────────────────────────────
const SummaryCard = ({ icon, label, value, bg, sub }) => (
  <div className="card p-5 border-border/40 hover:border-border transition-colors">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-text-muted">{label}</p>
        <h4 className="mt-2 text-2xl font-bold text-text-main">
          {typeof value === "number" ? value.toLocaleString() : value}
        </h4>
        {sub && <p className="text-xs text-text-muted/60 mt-1">{sub}</p>}
      </div>
      <div className={`p-2 ${bg} rounded-lg`}>{icon}</div>
    </div>
  </div>
);

export default PackageHistory;
