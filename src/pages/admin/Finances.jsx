import React, { useState, useEffect, useMemo } from "react";
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Mail,
  RefreshCw,
  Plus,
  X,
  CheckCircle2,
  Calendar,
  Filter,
  Pencil,
  Trash2,
  Download,
} from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const Finances = () => {
  const { profile } = useAuth();
  const isOwner = profile?.role === "owner";
  const [activeTab, setActiveTab] = useState("packages");
  const [packages, setPackages] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({
    total_collections: 0,
    total_dues: 0,
    total_expenses: 0,
  });
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);

  const [dateFilter, setDateFilter] = useState("daily");
  const [customDates, setCustomDates] = useState({ start: "", end: "" });

  const [txnDateFilter, setTxnDateFilter] = useState("daily");
  const [txnCustomDates, setTxnCustomDates] = useState({ start: "", end: "" });
  const [txnMethodFilter, setTxnMethodFilter] = useState("ALL");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("ALL");

  const [hasInitializedProfile, setHasInitializedProfile] = useState(false);

  // Set defaults once profile is loaded
  useEffect(() => {
    if (profile && !hasInitializedProfile) {
      if (profile.role === "owner") {
        setDateFilter("monthly");
        setTxnDateFilter("monthly");
      } else {
        setDateFilter("daily");
        setTxnDateFilter("daily");
      }
      setHasInitializedProfile(true);
    }
  }, [profile, hasInitializedProfile]);

  const METHODS = [
    "ALL",
    "CASH",
    "CARD",
    "BKASH",
    "NAGAD",
    "BANK_TRANSFER",
    "ROCKET",
  ];

  const METHOD_COLORS = {
    CASH: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "border-emerald-500/30",
      dot: "bg-emerald-400",
    },
    CARD: {
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      border: "border-blue-500/30",
      dot: "bg-blue-400",
    },
    BKASH: {
      bg: "bg-pink-500/10",
      text: "text-pink-400",
      border: "border-pink-500/30",
      dot: "bg-pink-400",
    },
    NAGAD: {
      bg: "bg-orange-500/10",
      text: "text-orange-400",
      border: "border-orange-500/30",
      dot: "bg-orange-400",
    },
    BANK_TRANSFER: {
      bg: "bg-violet-500/10",
      text: "text-violet-400",
      border: "border-violet-500/30",
      dot: "bg-violet-400",
    },
    ROCKET: {
      bg: "bg-purple-500/10",
      text: "text-purple-400",
      border: "border-purple-500/30",
      dot: "bg-purple-400",
    },
    ALL: {
      bg: "bg-accent/10",
      text: "text-accent",
      border: "border-accent/30",
      dot: "bg-accent",
    },
  };

  // Filter payments for the Transactions panel
  const filteredTxns = useMemo(() => {
    const toLocalDate = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    const today = toLocalDate(new Date());
    const monthStart = (() => {
      const d = new Date();
      d.setDate(1);
      return toLocalDate(d);
    })();
    const yearStart = (() => {
      const d = new Date();
      d.setMonth(0, 1);
      return toLocalDate(d);
    })();

    let filtered = payments.filter((p) => {
      const d = p.payment_date ? p.payment_date.slice(0, 10) : "";
      if (txnDateFilter === "daily") return d === today;
      if (txnDateFilter === "monthly") return d >= monthStart && d <= today;
      if (txnDateFilter === "yearly") return d >= yearStart && d <= today;
      if (
        txnDateFilter === "custom" &&
        txnCustomDates.start &&
        txnCustomDates.end
      )
        return d >= txnCustomDates.start && d <= txnCustomDates.end;
      return true;
    });

    if (txnMethodFilter !== "ALL") {
      filtered = filtered.filter(
        (p) => (p.payment_method || "").toUpperCase() === txnMethodFilter,
      );
    }
    return filtered;
  }, [payments, txnDateFilter, txnCustomDates, txnMethodFilter]);

  const methodTotals = useMemo(() => {
    const totals = {
      CASH: 0,
      CARD: 0,
      BKASH: 0,
      NAGAD: 0,
      BANK_TRANSFER: 0,
      ROCKET: 0,
    };
    const base = payments.filter((p) => {
      const toLocalDate = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      };
      const today = toLocalDate(new Date());
      const monthStart = (() => {
        const d = new Date();
        d.setDate(1);
        return toLocalDate(d);
      })();
      const yearStart = (() => {
        const d = new Date();
        d.setMonth(0, 1);
        return toLocalDate(d);
      })();
      const d = p.payment_date ? p.payment_date.slice(0, 10) : "";
      if (txnDateFilter === "daily") return d === today;
      if (txnDateFilter === "monthly") return d >= monthStart && d <= today;
      if (txnDateFilter === "yearly") return d >= yearStart && d <= today;
      if (
        txnDateFilter === "custom" &&
        txnCustomDates.start &&
        txnCustomDates.end
      )
        return d >= txnCustomDates.start && d <= txnCustomDates.end;
      return true;
    });
    base.forEach((p) => {
      const m = (p.payment_method || "").toUpperCase();
      if (totals[m] !== undefined) totals[m] += Number(p.paid_amount || 0);
    });
    return totals;
  }, [payments, txnDateFilter, txnCustomDates]);

  useEffect(() => {
    if (!hasInitializedProfile) return; // wait for profile default

    // Create an abort controller for the fetch request sequence
    const controller = new AbortController();
    fetchData(controller.signal);

    return () => controller.abort();
  }, [dateFilter, hasInitializedProfile]);

  const fetchData = async (signal) => {
    if (signal?.aborted) return;
    setLoading(true);
    try {
      const pkgRes = await api.packages.list();
      setPackages(pkgRes?.data || []);

      // Format date using LOCAL timezone (not UTC) to avoid off-by-one day errors
      const toLocalDateStr = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      };

      let params = {};
      if (dateFilter !== "all" && dateFilter !== "custom") {
        const today = new Date();
        const start = new Date();
        if (dateFilter === "daily") {
          // start already = today, no change needed
        } else if (dateFilter === "monthly") {
          start.setDate(1);
        } else if (dateFilter === "yearly") {
          start.setMonth(0, 1);
        }
        params.start_date = toLocalDateStr(start);
        params.end_date = toLocalDateStr(today);
      } else if (
        dateFilter === "custom" &&
        customDates.start &&
        customDates.end
      ) {
        params.start_date = customDates.start;
        params.end_date = customDates.end;
      }

      const payData = await api.payments.list(params);
      const expData = await api.expenses.list(params);

      let newSummary = {
        total_collections: 0,
        total_dues: 0,
        total_expenses: 0,
      };

      if (payData) {
        setPayments(payData?.data || []);
        if (payData?.summary) {
          newSummary.total_collections = payData.summary.total_collections;
          newSummary.total_dues = payData.summary.total_dues;
        }
      }
      if (expData) {
        setExpenses(expData?.data || []);
        if (expData?.summary) {
          newSummary.total_expenses = expData.summary.total_expenses;
        }
      }
      setSummary(newSummary);

      // Fetch the monthly summary
      const mSummary = await api.monthlySummary.get();
      if (mSummary?.data && (!signal || !signal.aborted)) {
        setMonthlySummary(mSummary.data);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error(err);
      }
    }
    if (!signal || !signal.aborted) {
      setLoading(false);
    }
  };

  const exportTransactionsPDF = () => {
    const doc = new jsPDF();
    const title = `Transactions Report (${txnDateFilter.toUpperCase()})`;
    doc.text(title, 14, 15);

    const tableColumn = [
      "Date",
      "Member",
      "Payment Method",
      "Package",
      "Total",
      "Discount",
      "Paid",
      "Due",
    ];
    const tableRows = [];

    // Use filteredTxns (the currently visible data) so export matches what user sees
    filteredTxns.forEach((pay) => {
      // Extract date portion directly from string to avoid JS Date() timezone shift
      const s = String(pay.payment_date || "").slice(0, 10);
      const [py, pm, pd] = s.split("-");
      const fmtDate = py && pm && pd ? `${pd}/${pm}/${py}` : s;
      const rowData = [
        fmtDate,
        `${pay.first_name} ${pay.last_name}${pay.member_id ? `\n(ID: ${pay.member_id})` : ""}`,
        pay.payment_method || "Cash",
        pay.package_name || "-",
        pay.total_amount,
        pay.discount_amount || 0,
        pay.paid_amount,
        pay.due_amount,
      ];
      tableRows.push(rowData);
    });

    const sumTotal = filteredTxns.reduce(
      (acc, curr) => acc + Number(curr.total_amount || 0),
      0,
    );
    const sumDiscount = filteredTxns.reduce(
      (acc, curr) => acc + Number(curr.discount_amount || 0),
      0,
    );
    const sumPaid = filteredTxns.reduce(
      (acc, curr) => acc + Number(curr.paid_amount || 0),
      0,
    );
    const isDueRepayment = (p) => {
      const pt = p.payment_type || "";
      return (
        pt === "DUE_PAYMENT" ||
        pt.toLowerCase().startsWith("due clear") ||
        pt.toLowerCase().startsWith("partial due")
      );
    };
    const sumDue = Math.max(
      0,
      filteredTxns
        .filter((p) => !isDueRepayment(p))
        .reduce((acc, curr) => acc + Number(curr.due_amount || 0), 0) -
        filteredTxns
          .filter((p) => isDueRepayment(p))
          .reduce((acc, curr) => acc + Number(curr.paid_amount || 0), 0),
    );

    tableRows.push([
      {
        content: "Totals for viewed period:",
        colSpan: 4,
        styles: { halign: "right", fontStyle: "bold" },
      },
      { content: sumTotal.toString(), styles: { fontStyle: "bold" } },
      {
        content: sumDiscount.toString(),
        styles: { fontStyle: "bold", textColor: [200, 150, 50] },
      },
      {
        content: sumPaid.toString(),
        styles: { fontStyle: "bold", textColor: [20, 184, 166] },
      },
      {
        content: sumDue.toString(),
        styles: { fontStyle: "bold", textColor: [244, 63, 94] },
      },
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59] },
      didParseCell: function (data) {
        if (data.row.index === tableRows.length - 1) {
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    doc.save(`Transactions_Report_${new Date().getTime()}.pdf`);
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense?"))
      return;
    try {
      await api.expenses.delete(id);
      await fetchData(); // Refresh list and summaries
    } catch (err) {
      alert("Failed to delete expense: " + err.message);
    }
  };

  const exportExpensesPDF = () => {
    const doc = new jsPDF();
    const title = `Expenses Report (${dateFilter.toUpperCase()})`;
    doc.text(title, 14, 15);

    const tableColumn = [
      "Date",
      "Category",
      "Description",
      "Logged By",
      "Amount",
    ];
    const tableRows = [];

    const visibleExpenses =
      expenseCategoryFilter === "ALL"
        ? expenses
        : expenses.filter((e) => e.category === expenseCategoryFilter);

    visibleExpenses.forEach((exp) => {
      const rowData = [
        new Date(exp.date).toLocaleDateString("en-GB"),
        exp.category,
        exp.description || "-",
        exp.first_name || "Admin",
        `${exp.amount} BDT`,
      ];
      tableRows.push(rowData);
    });

    const sumTotal = visibleExpenses
      .reduce((acc, curr) => acc + Number(curr.amount), 0)
      .toFixed(2);

    tableRows.push([
      {
        content: "Total Expenses for viewed period:",
        colSpan: 4,
        styles: { halign: "right", fontStyle: "bold" },
      },
      {
        content: `${sumTotal} BDT`,
        styles: { fontStyle: "bold", textColor: [244, 63, 94] },
      },
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59] },
      didParseCell: function (data) {
        if (data.row.index === tableRows.length - 1) {
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    doc.save(`Expenses_Report_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-5 md:px-8 md:py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-main tracking-tight">
            Finances & Packages
          </h1>
          <p className="text-text-muted mt-1">
            Manage subscription tiers and track revenue.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="btn-secondary px-3 h-10 flex items-center justify-center"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Top row: opening balance + transactions panel */}
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* Opening balance card - owner only */}
        {monthlySummary && isOwner && (
          <div className="card p-6 bg-surfaceLight border-border border xl:min-w-[340px] w-full xl:w-auto">
            <div className="space-y-4 font-medium text-text-muted">
              <div className="flex justify-between items-center">
                <span>This month opening balance: </span>
                <span className="text-emerald-400 font-semibold">
                  {Math.round(monthlySummary.opening_balance).toLocaleString(
                    "en-IN",
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center text-secondary">
                <span>This month total income</span>
                <span>
                  {Math.round(monthlySummary.monthly_income).toLocaleString(
                    "en-IN",
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center text-primary">
                <span>This month total expense</span>
                <span>
                  {Math.round(monthlySummary.monthly_expense).toLocaleString(
                    "en-IN",
                  )}
                </span>
              </div>
              <div className="border-t border-border pt-4 flex justify-between items-center">
                <span className="font-bold text-text-main">Total cash</span>
                <span className="font-bold text-text-main text-lg">
                  {Math.round(monthlySummary.total_cash).toLocaleString(
                    "en-IN",
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Transactions by payment method panel */}
        <div className="card border-border/50 flex-1 min-w-0">
          {/* Panel header with date filters */}
          <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-bold text-text-main">
                Transactions by Method
              </h2>
            </div>
            {/* Date filter tabs — manager is locked to daily */}
            <div className="flex items-center flex-wrap gap-1.5">
              {(isOwner
                ? ["daily", "monthly", "yearly", "custom"]
                : ["daily"]
              ).map((f) => (
                <button
                  key={f}
                  onClick={() => isOwner && setTxnDateFilter(f)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all border ${
                    txnDateFilter === f
                      ? "bg-accent text-white border-accent"
                      : "bg-surfaceLight text-text-muted border-border hover:text-white"
                  } ${!isOwner ? "cursor-default" : ""}`}
                >
                  {isOwner ? f : "Today"}
                </button>
              ))}
            </div>
          </div>

          {/* Custom date inputs - owner only */}
          {isOwner && txnDateFilter === "custom" && (
            <div className="px-4 py-2 border-b border-border/50 flex flex-wrap items-center gap-2">
              <Calendar className="w-4 h-4 text-accent" />
              <input
                type="date"
                lang="en-GB"
                className="input-field py-1 px-2 h-auto text-xs bg-surfaceLight border border-border"
                value={txnCustomDates.start}
                onChange={(e) =>
                  setTxnCustomDates((prev) => ({
                    ...prev,
                    start: e.target.value,
                  }))
                }
              />
              <span className="text-text-muted text-xs">to</span>
              <input
                type="date"
                lang="en-GB"
                className="input-field py-1 px-2 h-auto text-xs bg-surfaceLight border border-border"
                value={txnCustomDates.end}
                onChange={(e) =>
                  setTxnCustomDates((prev) => ({
                    ...prev,
                    end: e.target.value,
                  }))
                }
              />
            </div>
          )}

          {/* Method summary chips */}
          <div className="px-4 py-3 border-b border-border/50 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(methodTotals).map(([method, total]) => {
              const c = METHOD_COLORS[method];
              const isSelected =
                txnMethodFilter === "ALL" || txnMethodFilter === method;
              return (
                <button
                  key={method}
                  onClick={() =>
                    setTxnMethodFilter(
                      txnMethodFilter === method ? "ALL" : method,
                    )
                  }
                  className={`flex flex-col gap-0.5 p-2.5 rounded-lg border transition-all text-left group ${
                    isSelected
                      ? `${c.bg} ${c.border}`
                      : `bg-surfaceLight/20 border-border/50 hover:bg-surfaceLight/50`
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${isSelected ? c.dot : "bg-text-muted/40 group-hover:bg-text-muted"}`}
                      />
                      <span
                        className={`text-xs font-bold ${isSelected ? c.text : "text-text-muted group-hover:text-text-main"}`}
                      >
                        {method}
                      </span>
                    </div>
                    {txnMethodFilter === method && (
                      <span className="text-[10px] text-white/50 bg-black/20 px-1.5 py-0.5 rounded">
                        Selected
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span
                      className={`text-base sm:text-lg font-bold ${isSelected ? "text-text-main" : "text-text-muted group-hover:text-text-main"}`}
                    >
                      {total.toFixed(0)}
                    </span>
                    <span
                      className={`text-[10px] ${isSelected ? "text-white/60" : "text-text-muted/60"}`}
                    >
                      BDT
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Transaction list */}
          <div className="overflow-y-auto max-h-[340px]">
            {loading ? (
              <div className="p-8 text-center text-text-muted text-sm">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-accent" />
                Loading...
              </div>
            ) : filteredTxns.length === 0 ? (
              <div className="p-8 text-center text-text-muted text-sm">
                <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-20" />
                No transactions found for this period.
              </div>
            ) : (
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="sticky top-0 bg-surface z-10">
                  <tr className="text-text-muted text-xs uppercase tracking-wider border-b border-border/50 bg-surfaceLight/50">
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium">Member</th>
                    <th className="px-4 py-2 font-medium">Method</th>
                    <th className="px-4 py-2 font-medium text-right text-secondary">
                      Paid (BDT)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredTxns.map((pay) => {
                    const m = (pay.payment_method || "CASH").toUpperCase();
                    const c = METHOD_COLORS[m] || METHOD_COLORS.CASH;
                    return (
                      <tr
                        key={pay.id}
                        className="hover:bg-surfaceLight/30 transition-colors"
                      >
                        <td className="px-4 py-2.5 text-xs text-text-muted">
                          {pay.payment_date
                            ? (() => {
                                const [y, m, d] = String(pay.payment_date)
                                  .slice(0, 10)
                                  .split("-");
                                return `${d}/${m}/${y}`;
                              })()
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-text-main font-medium max-w-[140px] truncate">
                          {pay.first_name} {pay.last_name}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${c.bg} ${c.text} ${c.border}`}
                          >
                            {m}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-sm font-bold text-secondary">
                          {Number(pay.paid_amount).toFixed(0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="sticky bottom-0 bg-surfaceLight border-t border-border">
                  <tr>
                    <td
                      colSpan="3"
                      className="px-4 py-2 text-xs font-bold text-text-main"
                    >
                      Total ({filteredTxns.length} txn)
                    </td>
                    <td className="px-4 py-2 text-right text-sm font-bold text-secondary">
                      {filteredTxns
                        .reduce((a, p) => a + Number(p.paid_amount || 0), 0)
                        .toFixed(0)}{" "}
                      BDT
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 border-l-4 border-l-secondary">
          <p className="text-sm font-medium text-text-muted">
            Total Collections
          </p>
          <h3 className="text-3xl font-bold text-text-main mt-2">
            {summary.total_collections} BDT
          </h3>
        </div>
        <div className="card p-6 border-l-4 border-l-primary">
          <p className="text-sm font-medium text-text-muted">Total Dues</p>
          <h3 className="text-3xl font-bold text-text-main mt-2">
            {summary.total_dues} BDT
          </h3>
        </div>
        <div className="card p-6 border-l-4 border-l-blue-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <DollarSign className="w-16 h-16" />
          </div>
          <p className="text-sm font-medium text-text-muted">
            Total Cash on Hand
          </p>
          <h3 className="text-3xl font-bold text-blue-400 mt-2">
            {(summary.total_collections - summary.total_expenses).toFixed(2)}{" "}
            BDT
          </h3>
          <p className="text-xs text-text-muted mt-1">
            ({summary.total_expenses.toFixed(2)} expenses today)
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-1 gap-2 rounded-[24px] border border-border/70 bg-surface/70 p-2 sm:grid-cols-3">
        <button
          onClick={() => setActiveTab("packages")}
          className={`rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
            activeTab === "packages"
              ? "bg-primary text-white shadow-lg shadow-primary/20"
              : "bg-surfaceLight/55 text-text-muted hover:text-text-main"
          }`}
        >
          Subscription Packages
        </button>
        <button
          onClick={() => setActiveTab("transactions")}
          className={`rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
            activeTab === "transactions"
              ? "bg-primary text-white shadow-lg shadow-primary/20"
              : "bg-surfaceLight/55 text-text-muted hover:text-text-main"
          }`}
        >
          Transactions &amp; Dues
        </button>
        {isOwner && (
          <button
            onClick={() => setActiveTab("expenses")}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
              activeTab === "expenses"
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "bg-surfaceLight/55 text-text-muted hover:text-text-main"
            }`}
          >
            Business Expenses
          </button>
        )}
      </div>

      {activeTab === "packages" && (
        <div className="card border-border/50">
          <div className="p-6 border-b border-border/50 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-secondary" />
              <h2 className="text-lg font-bold text-white">
                Subscription Packages
              </h2>
            </div>
            {isOwner && (
              <button
                onClick={() => setShowPackageModal(true)}
                className="btn-primary flex items-center gap-2 py-1.5 px-4 text-sm"
              >
                <Plus className="w-4 h-4" /> Create Package
              </button>
            )}
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-surfaceLight border border-border rounded-xl p-5 hover:border-secondary transition-all relative group"
              >
                {isOwner && (
                  <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingPackage(pkg)}
                      className="p-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                      title="Edit Package"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={async () => {
                        if (
                          !window.confirm(
                            `Delete "${pkg.name}"? This cannot be undone.`,
                          )
                        )
                          return;
                        try {
                          await api.packages.delete(pkg.id);
                          fetchData();
                        } catch (err) {
                          alert("Failed to delete package: " + err.message);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                      title="Delete Package"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <h3 className="text-xl font-bold text-white pr-16">
                  {pkg.name}
                </h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-secondary">
                    {pkg.price} BDT
                  </span>
                  <span className="text-text-muted text-sm">
                    / {pkg.duration_days} days
                  </span>
                </div>
              </div>
            ))}
            {packages.length === 0 && (
              <div className="col-span-3 text-text-muted text-center p-4">
                No packages found in DB.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "transactions" && (
        <div className="card border-border/50">
          <div className="p-4 border-b border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 whitespace-nowrap">
              <DollarSign className="w-5 h-5 text-accent" />
              Payment History
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={exportTransactionsPDF}
                className="btn-secondary flex items-center gap-2 py-1.5 px-3 text-sm whitespace-nowrap"
              >
                <Download className="w-4 h-4" /> Export PDF
              </button>
              {isOwner ? (
                <>
                  <select
                    className="input-field py-1.5 px-3 h-auto text-sm bg-surfaceLight border border-border min-w-[120px]"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  >
                    <option value="all">All Transactions</option>
                    <option value="daily">Daily (Today)</option>
                    <option value="monthly">Monthly (This Month)</option>
                    <option value="yearly">Yearly (This Year)</option>
                    <option value="custom">Custom Date Range</option>
                  </select>

                  {dateFilter === "custom" && (
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        lang="en-GB"
                        className="input-field py-1.5 px-3 h-auto text-sm bg-surfaceLight border border-border"
                        value={customDates.start}
                        onChange={(e) =>
                          setCustomDates((prev) => ({
                            ...prev,
                            start: e.target.value,
                          }))
                        }
                      />
                      <span className="text-text-muted">to</span>
                      <input
                        type="date"
                        lang="en-GB"
                        className="input-field py-1.5 px-3 h-auto text-sm bg-surfaceLight border border-border"
                        value={customDates.end}
                        onChange={(e) =>
                          setCustomDates((prev) => ({
                            ...prev,
                            end: e.target.value,
                          }))
                        }
                      />
                      <button
                        onClick={fetchData}
                        className="btn-primary py-1.5 px-4 text-sm"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent/10 text-accent border border-accent/30">
                  Today
                </span>
              )}
            </div>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse whitespace-nowrap relative">
              <thead className="sticky top-0 bg-surface z-10 shadow-sm">
                <tr className="bg-surfaceLight/50 text-text-muted text-xs uppercase tracking-wider border-b border-border/50">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Member</th>
                  <th className="px-6 py-3 font-medium">Payment Type</th>
                  <th className="px-6 py-3 font-medium">Package</th>
                  <th className="px-6 py-3 font-medium">Total</th>
                  <th className="px-6 py-3 font-medium">Discount</th>
                  <th className="px-6 py-3 font-medium text-secondary">Paid</th>
                  <th className="px-6 py-3 font-medium text-primary">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredTxns.map((pay) => (
                  <tr
                    key={pay.id}
                    className="hover:bg-surfaceLight/30 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-text-muted">
                      {(() => {
                        const s = String(pay.payment_date || "").slice(0, 10);
                        const [y, m, d] = s.split("-");
                        return y && m && d ? `${d}/${m}/${y}` : "—";
                      })()}
                    </td>
                    <td className="px-6 py-4 text-sm text-white font-medium">
                      {pay.first_name} {pay.last_name}
                      <p className="text-xs text-text-muted font-normal">
                        {pay.member_id ? `ID: ${pay.member_id}` : ""}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-muted">
                      {pay.payment_method || "Cash"}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-muted">
                      {pay.package_name || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-white">
                      {pay.total_amount}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-yellow-500/80">
                      {pay.discount_amount || 0}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-secondary">
                      {pay.paid_amount}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-primary">
                      {pay.due_amount}
                    </td>
                  </tr>
                ))}
                {filteredTxns.length === 0 && (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-6 py-8 text-center text-text-muted"
                    >
                      No transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="sticky bottom-0 bg-surfaceLight border-t border-border shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <tr>
                  <td
                    colSpan="4"
                    className="px-6 py-4 text-right font-bold text-white"
                  >
                    Totals for viewed period:
                  </td>
                  <td className="px-6 py-4 font-bold text-white">
                    {filteredTxns.reduce(
                      (acc, curr) => acc + Number(curr.total_amount || 0),
                      0,
                    )}
                  </td>
                  <td className="px-6 py-4 font-bold text-yellow-500/80">
                    {filteredTxns.reduce(
                      (acc, curr) => acc + Number(curr.discount_amount || 0),
                      0,
                    )}
                  </td>
                  <td className="px-6 py-4 font-bold text-secondary">
                    {filteredTxns.reduce(
                      (acc, curr) => acc + Number(curr.paid_amount || 0),
                      0,
                    )}
                  </td>
                  <td className="px-6 py-4 font-bold text-primary">
                    {Math.max(
                      0,
                      filteredTxns
                        .filter((p) => {
                          const pt = p.payment_type || "";
                          return (
                            pt !== "DUE_PAYMENT" &&
                            !pt.toLowerCase().startsWith("due clear") &&
                            !pt.toLowerCase().startsWith("partial due")
                          );
                        })
                        .reduce(
                          (acc, curr) => acc + Number(curr.due_amount || 0),
                          0,
                        ) -
                        filteredTxns
                          .filter((p) => {
                            const pt = p.payment_type || "";
                            return (
                              pt === "DUE_PAYMENT" ||
                              pt.toLowerCase().startsWith("due clear") ||
                              pt.toLowerCase().startsWith("partial due")
                            );
                          })
                          .reduce(
                            (acc, curr) => acc + Number(curr.paid_amount || 0),
                            0,
                          ),
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {activeTab === "expenses" && (
        <div className="card border-border/50">
          <div className="p-4 border-b border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 whitespace-nowrap">
              <TrendingDown className="w-5 h-5 text-primary" />
              Expenses Log
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={exportExpensesPDF}
                className="btn-secondary flex items-center gap-2 py-1.5 px-3 text-sm whitespace-nowrap"
              >
                <Download className="w-4 h-4" /> Export PDF
              </button>

              <button
                onClick={() => setShowExpenseModal(true)}
                className="btn-primary flex items-center gap-2 py-1.5 px-4 text-sm whitespace-nowrap mr-2"
              >
                <Plus className="w-4 h-4" /> Add Expense
              </button>

              <select
                className="input-field py-1.5 px-3 h-auto text-sm bg-surfaceLight border border-border min-w-[120px]"
                value={expenseCategoryFilter}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
              >
                <option value="ALL">All Categories</option>
                {[...new Set(expenses.map((e) => e.category))]
                  .sort()
                  .map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
              </select>

              <select
                className="input-field py-1.5 px-3 h-auto text-sm bg-surfaceLight border border-border min-w-[120px]"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="all">All Expenses</option>
                <option value="daily">Daily (Today)</option>
                <option value="monthly">Monthly (This Month)</option>
                <option value="yearly">Yearly (This Year)</option>
                <option value="custom">Custom Date Range</option>
              </select>

              {dateFilter === "custom" && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    lang="en-GB"
                    className="input-field py-1.5 px-3 h-auto text-sm bg-surfaceLight border border-border"
                    value={customDates.start}
                    onChange={(e) =>
                      setCustomDates((prev) => ({
                        ...prev,
                        start: e.target.value,
                      }))
                    }
                  />
                  <span className="text-text-muted">to</span>
                  <input
                    type="date"
                    lang="en-GB"
                    className="input-field py-1.5 px-3 h-auto text-sm bg-surfaceLight border border-border"
                    value={customDates.end}
                    onChange={(e) =>
                      setCustomDates((prev) => ({
                        ...prev,
                        end: e.target.value,
                      }))
                    }
                  />
                  <button
                    onClick={fetchData}
                    className="btn-primary py-1.5 px-4 text-sm"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse whitespace-nowrap relative">
              <thead className="sticky top-0 bg-surface z-10 shadow-sm">
                <tr className="bg-surfaceLight/50 text-text-muted text-xs uppercase tracking-wider border-b border-border/50">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Category</th>
                  <th className="px-6 py-3 font-medium">Description</th>
                  <th className="px-6 py-3 font-medium">Logged By</th>
                  <th className="px-6 py-3 font-medium text-primary">Amount</th>
                  <th className="px-6 py-3 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {(expenseCategoryFilter === "ALL"
                  ? expenses
                  : expenses.filter((e) => e.category === expenseCategoryFilter)
                ).map((exp) => (
                  <tr
                    key={exp.id}
                    className="hover:bg-surfaceLight/30 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-text-muted">
                      {new Date(exp.date).toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-6 py-4 text-sm text-white font-medium">
                      <span className="px-2 py-1 bg-surfaceLight border border-border rounded-md text-xs">
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-muted max-w-[200px]">
                      {exp.description ? (
                        <button
                          onClick={() => setSelectedExpense(exp)}
                          className="text-left w-full truncate hover:text-white transition-colors underline decoration-border underline-offset-4"
                          title="Click to view full description"
                        >
                          {exp.description}
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-muted">
                      {exp.first_name
                        ? `${exp.first_name} ${exp.last_name || ""}`
                        : "System Admin"}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-primary">
                      {exp.amount}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                        title="Delete Expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-8 text-center text-text-muted"
                    >
                      No expenses found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="sticky bottom-0 bg-surfaceLight border-t border-border shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <tr>
                  <td
                    colSpan="4"
                    className="px-6 py-4 text-right font-bold text-white"
                  >
                    Total Expenses for viewed period:
                  </td>
                  <td className="px-6 py-4 font-bold text-primary" colSpan="2">
                    {(expenseCategoryFilter === "ALL"
                      ? expenses
                      : expenses.filter(
                          (e) => e.category === expenseCategoryFilter,
                        )
                    )
                      .reduce((acc, curr) => acc + Number(curr.amount), 0)
                      .toFixed(2)}{" "}
                    BDT
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {showExpenseModal && (
        <AddExpenseModal
          onClose={() => setShowExpenseModal(false)}
          onSuccess={() => {
            setShowExpenseModal(false);
            fetchData();
          }}
        />
      )}

      {showPackageModal && (
        <AddPackageModal
          onClose={() => setShowPackageModal(false)}
          onSuccess={() => {
            setShowPackageModal(false);
            fetchData();
          }}
        />
      )}

      {editingPackage && (
        <EditPackageModal
          pkg={editingPackage}
          onClose={() => setEditingPackage(null)}
          onSuccess={() => {
            setEditingPackage(null);
            fetchData();
          }}
        />
      )}

      {selectedExpense && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border rounded-2xl w-[95%] max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-white font-bold flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-primary" />
                Expense Details
              </h2>
              <button
                onClick={() => setSelectedExpense(null)}
                className="text-text-muted hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1 font-semibold">Date</p>
                  <p className="text-sm text-white font-medium">{new Date(selectedExpense.date).toLocaleDateString("en-GB")}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1 font-semibold">Category</p>
                  <span className="px-2 py-0.5 bg-surfaceLight border border-border rounded text-xs text-white font-medium">
                    {selectedExpense.category}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1 font-semibold">Amount</p>
                  <p className="text-lg text-primary font-bold">{selectedExpense.amount} BDT</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1 font-semibold">Logged By</p>
                  <p className="text-sm text-white font-medium">
                    {selectedExpense.first_name ? `${selectedExpense.first_name} ${selectedExpense.last_name || ""}` : "System Admin"}
                  </p>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2 font-semibold">Description</p>
                <div className="text-sm text-white bg-surfaceLight/50 p-4 rounded-xl border border-border/50 whitespace-pre-wrap max-h-[250px] overflow-y-auto leading-relaxed">
                  {selectedExpense.description || "No description provided."}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AddExpenseModal = ({ onClose, onSuccess }) => {
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [form, setForm] = useState({
    category: "SUPPLEMENTS",
    amount: "",
    description: "",
    date: (() => {
      // Use local date string instead of UTC-shifted JS Date
      const d = new Date();
      // Adjust to UTC+6 (Dhaka time) manually to prevent previous day selection
      const localTime =
        d.getTime() + d.getTimezoneOffset() * 60000 + 6 * 3600000;
      const tzDate = new Date(localTime);
      return `${tzDate.getFullYear()}-${String(tzDate.getMonth() + 1).padStart(2, "0")}-${String(tzDate.getDate()).padStart(2, "0")}`;
    })(),
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.expenses.create({
        category: form.category,
        amount: parseFloat(form.amount) || 0,
        description: form.description.trim(),
        date: form.date,
      });
      onSuccess();
    } catch (err) {
      alert("Failed to log expense: " + err.message);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface border border-border rounded-2xl w-[95%] max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-surfaceLight text-text-muted rounded-lg">
              <TrendingDown className="w-5 h-5" />
            </div>
            <h2 className="text-white font-bold">Log New Expense</h2>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="label mb-0">Category</label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomCategory(!isCustomCategory);
                    setForm({ ...form, category: !isCustomCategory ? "" : "SUPPLEMENTS" });
                  }}
                  className="text-[10px] font-bold text-accent hover:text-white transition-colors"
                >
                  {isCustomCategory ? "Select Existing" : "+ Add Custom"}
                </button>
              </div>
              {isCustomCategory ? (
                <input
                  type="text"
                  className="input-field uppercase"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value.toUpperCase() })}
                  placeholder="NEW CATEGORY"
                  required
                />
              ) : (
                <select
                  className="input-field"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  required
                >
                  <option value="SUPPLEMENTS">Supplements</option>
                  <option value="EQUIPMENT">Equipment</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="UTILITIES">Utilities</option>
                  <option value="EMPLOYEE_SALARY">Employee Salary</option>
                  <option value="SHOP_RENT">Shop Rent</option>
                  <option value="MARKETING">Marketing</option>
                  <option value="FOOD">Food</option>
                  <option value="TRANSPORTATION">Transportation</option>
                  <option value="OWNERS_WITHDRAWAL">Owners Withdrawl</option>
                  <option value="OTHER">Other</option>
                </select>
              )}
            </div>
            <div>
              <label className="label">Amount (BDT)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-field bg-primary/10 border-primary/30 text-white font-bold focus:border-primary focus:ring-primary/20"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="label">Date</label>
            <input
              type="date"
              lang="en-GB"
              className="input-field"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">Description / Note</label>
            <textarea
              className="input-field min-h-[80px] resize-none"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="What was this expense for?"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 flex items-center justify-center gap-2"
              disabled={saving}
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {saving ? "Saving..." : "Log Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddPackageModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name: "",
    price: "",
    duration_days: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.packages.create({
        name: form.name.trim(),
        price: parseFloat(form.price) || 0,
        duration_days: parseInt(form.duration_days, 10) || 0,
      });
      onSuccess();
    } catch (err) {
      alert("Failed to create package: " + err.message);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface border border-border rounded-2xl w-[95%] max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary/20 text-secondary rounded-lg">
              <Package className="w-5 h-5" />
            </div>
            <h2 className="text-white font-bold">Create Package</h2>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Package Name</label>
            <input
              type="text"
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="e.g. 1 Year VIP"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Price (BDT)</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
                placeholder="0"
              />
            </div>
            <div>
              <label className="label">Duration (Days)</label>
              <input
                type="number"
                min="1"
                className="input-field"
                value={form.duration_days}
                onChange={(e) =>
                  setForm({ ...form, duration_days: e.target.value })
                }
                required
                placeholder="365"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 flex items-center justify-center gap-2"
              disabled={saving}
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {saving ? "Saving..." : "Create Package"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditPackageModal = ({ pkg, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name: pkg.name || "",
    price: pkg.price || "",
    duration_days: pkg.duration_days || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.packages.update(pkg.id, {
        name: form.name.trim(),
        price: parseFloat(form.price) || 0,
        duration_days: parseInt(form.duration_days, 10) || 0,
      });
      onSuccess();
    } catch (err) {
      alert("Failed to update package: " + err.message);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface border border-border rounded-2xl w-[95%] max-w-md shadow-2xl fade-in overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/20 text-accent rounded-lg">
              <Pencil className="w-5 h-5" />
            </div>
            <h2 className="text-white font-bold">Edit Package</h2>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Package Name</label>
            <input
              type="text"
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="e.g. 1 Year VIP"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Price (BDT)</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
                placeholder="0"
              />
            </div>
            <div>
              <label className="label">Duration (Days)</label>
              <input
                type="number"
                min="1"
                className="input-field"
                value={form.duration_days}
                onChange={(e) =>
                  setForm({ ...form, duration_days: e.target.value })
                }
                required
                placeholder="365"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 flex items-center justify-center gap-2"
              disabled={saving}
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Finances;
