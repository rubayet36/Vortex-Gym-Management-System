import React, { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { api } from "../../lib/api";
import { Users, DollarSign, Activity, ArrowRight, Wallet, CheckCircle2, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const toLocalDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const BusinessOverview = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { profile } = useAuth();
  const isOwner = profile?.role === "owner";
  const [attendanceData, setAttendanceData] = useState(
    DAYS.map((d) => ({ name: d, members: 0 }))
  );
  const [revenueData, setRevenueData] = useState([]);
  const [revenuePeriod, setRevenuePeriod] = useState("7days");
  const [revLoading, setRevLoading] = useState(false);
  const [financialData, setFinancialData] = useState({ collections: 0, dues: 0 });
  const [payments, setPayments] = useState([]);
  const [markingPaidId, setMarkingPaidId] = useState(null);

  // ── Compute net due per user (mirrors backend summary logic) ──────────────
  // A DUE_PAYMENT / "Due Clear" / "Partial Due" record repays an earlier due.
  // Only show users whose (originalDues - repayments) > 0.
  const dueMembers = React.useMemo(() => {
    const byUser = {};
    payments.forEach((p) => {
      const uid = p.user_id;
      if (!byUser[uid]) {
        // Keep the most-recent payment row as the display record
        byUser[uid] = { ...p, _netDue: 0 };
      }
      const ptype = (p.payment_type ?? "").toLowerCase();
      const isRepayment =
        ptype === "due_payment" ||
        ptype.startsWith("due clear") ||
        ptype.startsWith("partial due");

      if (isRepayment) {
        byUser[uid]._netDue -= Number(p.paid_amount || 0);
      } else {
        byUser[uid]._netDue += Number(p.due_amount || 0);
      }
    });
    return Object.values(byUser)
      .filter((u) => u._netDue > 0)
      .map((u) => ({ ...u, due_amount: u._netDue }));
  }, [payments]);

  // Mark a user's dues as fully paid: zero out every due row for that user
  const handleMarkPaid = useCallback(async (member) => {
    setMarkingPaidId(member.user_id);
    try {
      // Update every payment row for this user that still has a due
      const rowsToUpdate = payments.filter(
        (p) => p.user_id === member.user_id && Number(p.due_amount) > 0
      );
      await Promise.all(
        rowsToUpdate.map((p) => api.payments.update(p.id, { due_amount: 0 }))
      );
      // Optimistically zero out dues for this user
      setPayments((prev) =>
        prev.map((p) =>
          p.user_id === member.user_id ? { ...p, due_amount: 0 } : p
        )
      );
      // Update the financial summary card
      setFinancialData((prev) => ({
        ...prev,
        dues: Math.max(0, prev.dues - Number(member._netDue ?? member.due_amount)),
      }));
    } catch (e) {
      console.error("Mark paid error:", e);
      alert("Failed to mark as paid. Please try again.");
    } finally {
      setMarkingPaidId(null);
    }
  }, [payments]);

  const chartPalette =
    theme === "light"
      ? {
          grid: "rgb(203 214 227 / 0.8)",
          tick: "rgb(92 109 138)",
          tooltipBg: "rgb(255 255 255 / 0.96)",
          tooltipBorder: "rgb(203 214 227 / 0.9)",
          tooltipText: "rgb(24 34 54)",
        }
      : {
          grid: "rgb(65 86 122 / 0.55)",
          tick: "rgb(154 169 194)",
          tooltipBg: "rgb(19 29 49 / 0.96)",
          tooltipBorder: "rgb(65 86 122 / 0.9)",
          tooltipText: "rgb(245 247 255)",
        };

  useEffect(() => {
    const fetchAttendance = async () => {
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6);
      const fromDate = toLocalDateStr(sevenDaysAgo);

      try {
        const res = await api.attendance.list({ date: fromDate });
        const data = res?.data || [];
        const countsByDate = {};

        data.forEach((row) => {
          const dateKey = row.date ? row.date.slice(0, 10) : null;
          if (dateKey) countsByDate[dateKey] = (countsByDate[dateKey] || 0) + 1;
        });

        const result = [];
        for (let i = 6; i >= 0; i -= 1) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const label = DAYS[d.getDay()];
          const key = toLocalDateStr(d);
          result.push({ name: label, members: countsByDate[key] || 0 });
        }

        setAttendanceData(result);
      } catch (e) {
        console.error("Attendance fetch error:", e);
      }
    };

    const fetchFinancials = async () => {
      try {
        // Only fetch summary + payments for dues table.
        // The revenue chart is handled separately by the revenuePeriod useEffect.
        const result = await api.payments.list();
        if (result?.summary) {
          setFinancialData({
            collections: result.summary.total_collections || 0,
            dues: result.summary.total_dues || 0,
          });
          setPayments(result.data || []);
        }
      } catch (e) {
        console.error("Financial fetch error:", e);
      }
    };

    fetchAttendance();
    fetchFinancials();
  }, []);

  useEffect(() => {
    const loadRevenue = async () => {
      setRevLoading(true);
      try {
        const today = new Date();
        let startDate;
        const endDate = toLocalDateStr(today);
        let chartData = [];

        if (revenuePeriod === "7days") {
          const start = new Date(today);
          start.setDate(today.getDate() - 6);
          startDate = toLocalDateStr(start);

          const res = await api.payments.list({ start_date: startDate, end_date: endDate });
          const pArr = res?.data || [];
          const map = {};
          pArr.forEach((p) => {
            const key = toLocalDateStr(new Date(p.payment_date));
            map[key] = (map[key] || 0) + Number(p.paid_amount || 0);
          });
          for (let i = 6; i >= 0; i -= 1) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            chartData.push({ name: DAYS[d.getDay()], revenue: map[toLocalDateStr(d)] || 0 });
          }
        } else if (revenuePeriod === "month") {
          const start = new Date(today.getFullYear(), today.getMonth(), 1);
          startDate = toLocalDateStr(start);

          const res = await api.payments.list({ start_date: startDate, end_date: endDate });
          const pArr = res?.data || [];
          const weekMap = { "Week 1": 0, "Week 2": 0, "Week 3": 0, "Week 4": 0, "Week 5": 0 };
          pArr.forEach((p) => {
            const day = new Date(p.payment_date).getDate();
            const weekKey = `Week ${Math.ceil(day / 7)}`;
            if (weekMap[weekKey] !== undefined) {
              weekMap[weekKey] += Number(p.paid_amount || 0);
            }
          });
          chartData = Object.entries(weekMap)
            .filter(([, revenue]) => revenue > 0)
            .map(([name, revenue]) => ({ name, revenue }));
        } else if (revenuePeriod === "year") {
          const start = new Date(today.getFullYear(), 0, 1);
          startDate = toLocalDateStr(start);

          const res = await api.payments.list({ start_date: startDate, end_date: endDate });
          const pArr = res?.data || [];
          const monthMap = {};
          MONTHS.forEach((m) => {
            monthMap[m] = 0;
          });
          pArr.forEach((p) => {
            const monthLabel = MONTHS[new Date(p.payment_date).getMonth()];
            monthMap[monthLabel] = (monthMap[monthLabel] || 0) + Number(p.paid_amount || 0);
          });
          chartData = Object.entries(monthMap).map(([name, revenue]) => ({ name, revenue }));
        } else if (revenuePeriod === "all_time") {
          startDate = "2000-01-01";

          const res = await api.payments.list({ start_date: startDate, end_date: endDate });
          const pArr = res?.data || [];
          const yearMap = {};

          pArr.forEach((p) => {
            const yearStr = new Date(p.payment_date).getFullYear().toString();
            yearMap[yearStr] = (yearMap[yearStr] || 0) + Number(p.paid_amount || 0);
          });

          chartData = Object.keys(yearMap)
            .sort()
            .map((year) => ({ name: year, revenue: yearMap[year] }));
        }

        setRevenueData(chartData);
      } catch (e) {
        console.error("Revenue chart fetch error:", e);
      }
      setRevLoading(false);
    };

    loadRevenue();
  }, [revenuePeriod]);

  return (
    <div className="space-y-6">
      {isOwner && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SummaryCard
            title="Total Collections"
            value={`${financialData.collections.toLocaleString()} BDT`}
            description="All recorded collections across the business."
            icon={<DollarSign className="h-5 w-5" />}
            tone="accent"
          />
          <SummaryCard
            title="Outstanding Dues"
            value={`${financialData.dues.toLocaleString()} BDT`}
            description="Pending balances that still need follow-up."
            icon={<Wallet className="h-5 w-5" />}
            tone="primary"
          />
          <SummaryCard
            title="Members With Dues"
            value={dueMembers.length.toLocaleString()}
            description="Members currently carrying an unpaid balance."
            icon={<Users className="h-5 w-5" />}
            tone="secondary"
          />
        </div>
      )}

      {isOwner && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card p-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
                Revenue
              </p>
              <h3 className="mt-2 text-2xl font-bold text-text-main">
                Revenue performance
              </h3>
            </div>
            <select
              value={revenuePeriod}
              onChange={(e) => setRevenuePeriod(e.target.value)}
              className="input-field max-w-[220px] cursor-pointer py-2"
            >
              <option value="7days">Last 7 Days</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="all_time">All Time</option>
            </select>
          </div>

          <div className="h-72" style={{ minWidth: 0, minHeight: 288 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart data={revenueData} margin={{ top: 10, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartPalette.grid} vertical={false} />
                <XAxis dataKey="name" stroke={chartPalette.tick} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke={chartPalette.tick}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value.toLocaleString()}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartPalette.tooltipBg,
                    borderColor: chartPalette.tooltipBorder,
                    borderRadius: "18px",
                    color: chartPalette.tooltipText,
                  }}
                  formatter={(value) => [`${Number(value).toLocaleString()} BDT`, "Revenue"]}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="rgb(245 90 74)"
                  strokeWidth={3}
                  dot={{ fill: "rgb(245 90 74)", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: "rgb(245 90 74)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="mt-4 text-sm text-text-muted">
            {revLoading ? "Refreshing revenue data..." : "This chart reflects the currently selected revenue period."}
          </p>
        </div>

        <div className="card p-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
                Attendance
              </p>
              <h3 className="mt-2 text-2xl font-bold text-text-main">
                Last 7 days of attendance
              </h3>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate("/admin/attendance")}
            >
              View detailed log
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="h-72" style={{ minWidth: 0, minHeight: 288 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={attendanceData} margin={{ top: 10, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartPalette.grid} vertical={false} />
                <XAxis dataKey="name" stroke={chartPalette.tick} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={chartPalette.tick} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartPalette.tooltipBg,
                    borderColor: chartPalette.tooltipBorder,
                    borderRadius: "18px",
                    color: chartPalette.tooltipText,
                  }}
                  cursor={{ fill: "rgb(30 43 67 / 0.08)" }}
                />
                <Bar dataKey="members" fill="rgb(39 201 146)" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          </div>
        </div>
      )}

      <div className="card p-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
              Dues queue
            </p>
            <h3 className="mt-2 text-2xl font-bold text-text-main">
              Members with outstanding dues
            </h3>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate("/admin/members")}
          >
            View all members
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border/60 text-xs uppercase tracking-[0.18em] text-text-muted">
                <th className="px-4 py-3 font-semibold">Member</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">PIN</th>
                <th className="px-4 py-3 font-semibold">Due Amount</th>
                <th className="px-4 py-3 font-semibold">Payment Date</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {dueMembers.map((member) => (
                <tr key={member.id} className="border-b border-border/20 transition-colors hover:bg-surfaceLight/30">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-text-main">
                      {member.first_name} {member.last_name}
                    </div>
                    <div className="text-xs text-text-muted">{member.payment_type}</div>
                  </td>
                  <td className="px-4 py-4 text-sm text-text-main">{member.phone_number}</td>
                  <td className="px-4 py-4 text-sm text-text-main">{member.pin || "-"}</td>
                  <td className="px-4 py-4 text-sm font-semibold text-error">
                    {Number(member.due_amount).toLocaleString()} BDT
                  </td>
                  <td className="px-4 py-4 text-sm text-text-muted">
                    {(() => {
                      const s = String(member.payment_date || "").slice(0, 10);
                      const [y, m, d] = s.split("-");
                      return y && m && d ? `${d}/${m}/${y}` : "—";
                    })()}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      disabled={markingPaidId === member.user_id}
                      className="btn-secondary flex items-center gap-1.5 disabled:opacity-60"
                      onClick={() => handleMarkPaid(member)}
                    >
                      {markingPaidId === member.user_id ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Mark paid
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}

              {dueMembers.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-10 text-center text-sm text-text-muted">
                    No members currently have dues.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ title, value, description, icon, tone }) => {
  const toneClass =
    tone === "accent"
      ? "bg-accent/10 text-accent"
      : tone === "primary"
      ? "bg-primary/10 text-primary"
      : "bg-secondary/10 text-secondary";

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-text-muted">{title}</p>
          <h3 className="mt-3 text-3xl font-bold text-text-main">{value}</h3>
          <p className="mt-3 text-sm leading-6 text-text-muted">{description}</p>
        </div>
        <div className={`rounded-2xl p-3 ${toneClass}`}>{icon}</div>
      </div>
    </div>
  );
};

export default BusinessOverview;
