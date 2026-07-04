import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, LogIn, LogOut, Clock, CalendarDays, RefreshCw,
  DoorOpen, ArrowLeft, WifiOff, List, AlignLeft,
} from "lucide-react";

const BRIDGE_URL = "/api/zk_proxy.php?endpoint=";
const DHAKA_TZ   = "Asia/Dhaka";

// ─── Dhaka time helpers ───────────────────────────────────────────────────────
// parseDhaka: treat bare "YYYY-MM-DD HH:MM:SS" string as Dhaka wall-clock time
function parseDhaka(dt) {
  if (!dt) return null;
  return new Date(String(dt).replace(" ", "T") + "+06:00");
}

function fmtTime(dt) {
  if (!dt) return "—";
  const d = parseDhaka(dt);
  if (!d || isNaN(d)) return "—";
  return d.toLocaleTimeString("en-GB", { timeZone: DHAKA_TZ, hour: "2-digit", minute: "2-digit", hour12: true });
}

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00+06:00");
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-GB", { timeZone: DHAKA_TZ, day: "2-digit", month: "short", year: "numeric" });
}

function fmtDuration(inTime, outTime) {
  if (!inTime || !outTime) return null;
  const ms = parseDhaka(outTime) - parseDhaka(inTime);
  if (ms <= 0) return null;
  const mins = Math.floor(ms / 60000);
  const hrs  = Math.floor(mins / 60);
  return hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
}

function todayStr() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: DHAKA_TZ }).format(new Date());
}

// ─── Main Component ────────────────────────────────────────────────────────────
const POS = () => {
  const [logs, setLogs]           = useState([]);
  const [date, setDate]           = useState(todayStr());
  const [search, setSearch]       = useState("");
  const [searchQ, setSearchQ]     = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [dataSource, setDataSource] = useState("device");
  const [hudMode, setHudMode]     = useState(false);

  // Loading states
  const [phaseOne, setPhaseOne]   = useState(false); // initial skeleton
  const [syncing, setSyncing]     = useState(false);  // background device fetch progress bar
  const [deviceError, setDeviceError] = useState(null);

  // View toggle: "grouped" | "timeline"
  const [viewMode, setViewMode]   = useState("grouped");
  const [timelineLogs, setTimelineLogs] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError]     = useState(null);

  const abortRef = useRef(null); // abort controller for background fetch

  // Cancel any pending background fetch on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchQ(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Polling for live HUD mode
  useEffect(() => {
    if (!hudMode) return;

    const poll = async () => {
      try {
        const today = todayStr();
        const dbUrl = `${BRIDGE_URL}api/attendance-from-db?date=${encodeURIComponent(today)}`;
        const res = await fetch(dbUrl);
        const json = await res.json();
        if (json.success && json.data) {
          setLogs(json.data);
        }
      } catch (e) {
        console.error("HUD polling error:", e.message);
      }
    };

    poll();
    const interval = setInterval(poll, 4000); // Poll database every 4 seconds
    return () => clearInterval(interval);
  }, [hudMode]);

  const isToday = date === todayStr();

  // ── Filtered logs (grouped view) ────────────────────────────────────────────
  const filteredLogs = searchQ.trim() && !selectedMember
    ? logs.filter((log) => {
        const q    = searchQ.toLowerCase();
        const name = `${log.first_name || ""} ${log.last_name || ""}`.toLowerCase();
        return name.includes(q) || (log.phone_number || "").toLowerCase().includes(q);
      })
    : logs;

  // ── 2-Phase fetch logic ─────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    // Cancel any running background fetch
    if (abortRef.current) abortRef.current.abort();

    setDeviceError(null);
    setPhaseOne(true);

    const today = todayStr();

    // ── Phase 1: instant DB load ────────────────────────────────────────────
    try {
      let dbUrl = `${BRIDGE_URL}/api/attendance-from-db`;
      const params = [];
      if (selectedMember) params.push(`user_id=${encodeURIComponent(selectedMember.id)}`);
      else if (date)      params.push(`date=${encodeURIComponent(date)}`);
      if (params.length)  dbUrl += `?${params.join("&")}`;

      const res  = await fetch(dbUrl);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data || []);
        setDataSource("database");
      }
    } catch (_) {
      // DB unavailable — show empty until device fetch
    } finally {
      setPhaseOne(false);
    }

    // ── Phase 2: background device sync (today only, not member drill-down) ──
    if (!selectedMember && (isToday || !date)) {
      const ac = new AbortController();
      abortRef.current = ac;
      setSyncing(true);
      setDeviceError(null);
      try {
        let liveUrl = `${BRIDGE_URL}/api/live-attendance`;
        if (date) liveUrl += `?date=${encodeURIComponent(date)}`;
        const res  = await fetch(liveUrl, { signal: ac.signal });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "Bridge error");
        setLogs(json.data || []);
        setDataSource("device");
      } catch (e) {
        if (e.name !== "AbortError") {
          console.error("Live fetch error:", e.message);
          setDeviceError(e.message);
        }
      } finally {
        setSyncing(false);
      }
    }
  }, [date, selectedMember, isToday]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // ── Timeline fetch ──────────────────────────────────────────────────────────
  const fetchTimeline = useCallback(async () => {
    setTimelineLoading(true);
    setTimelineError(null);
    try {
      let url = `${BRIDGE_URL}/api/raw-punches`;
      if (date) url += `?date=${encodeURIComponent(date)}`;
      const res  = await fetch(url);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Bridge error");
      setTimelineLogs(json.data || []);
    } catch (e) {
      setTimelineError(e.message);
      setTimelineLogs([]);
    } finally {
      setTimelineLoading(false);
    }
  }, [date]);

  useEffect(() => {
    if (viewMode === "timeline") fetchTimeline();
  }, [viewMode, fetchTimeline]);

  const clearDate   = () => setDate("");
  const handleBack  = () => { setSelectedMember(null); setDate(todayStr()); };

  const handleMemberClick = (log) => {
    const name = `${log.first_name || ""} ${log.last_name || ""}`.trim();
    setSelectedMember({ id: log.user_id, name });
    setSearch("");
  };

  const totalIn      = filteredLogs.length;
  const totalOut     = filteredLogs.filter((l) => l.check_out_time).length;
  const stillInside  = totalIn - totalOut;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-8 w-full mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        {selectedMember && (
          <button onClick={handleBack}
            className="p-2 rounded-lg hover:bg-surfaceLight text-text-muted hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {selectedMember ? `Attendance — ${selectedMember.name}` : "Attendance"}
          </h1>
          <p className="text-text-muted mt-1 flex items-center gap-2 text-sm">
            {deviceError ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-400">Bridge offline — {deviceError}</span>
              </>
            ) : syncing ? (
              <>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Syncing device…
                </span>
                <span className="text-xs text-text-muted">Showing cached data while device syncs.</span>
              </>
            ) : dataSource === "database" ? (
              <>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Database cache
                </span>
                <span className="text-xs">{selectedMember ? "Loaded from saved records." : "Past date — instant."}</span>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-accent/15 text-accent border border-accent/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" /> Live device
                </span>
                <span className="text-xs">Today's data — fetched from F22.</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total Check-ins",  value: totalIn,     icon: <LogIn  className="w-5 h-5" />, color: "accent"  },
          { label: "Checked Out",      value: totalOut,    icon: <LogOut className="w-5 h-5" />, color: "primary" },
          { label: "Still Inside",     value: stillInside, icon: <DoorOpen className="w-5 h-5" />, color: "yellow-400" },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="card p-4 border-border/50 flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-${color}/10 text-${color}`}>{icon}</div>
            <div>
              <p className="text-xs text-text-muted">{label}</p>
              <p className="text-2xl font-bold text-text-main">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="card border-border/50 overflow-hidden">

        {/* Slim progress bar — visible while background device fetch runs */}
        <div className={`h-0.5 w-full transition-all duration-500 ${syncing ? "bg-accent/40" : "bg-transparent"}`}>
          {syncing && (
            <div className="h-full bg-accent animate-[progress_2s_ease-in-out_infinite]"
              style={{ animation: "progressBar 1.8s ease-in-out infinite" }} />
          )}
        </div>

        {/* Card toolbar */}
        <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <div>
            <h2 className="text-text-main font-semibold flex items-center gap-2">
              <DoorOpen className="w-5 h-5 text-accent" />
              {selectedMember ? `${selectedMember.name}'s Records` : "Access Log"}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {phaseOne ? "Loading…" :
                viewMode === "timeline"
                  ? `${timelineLogs.length} punch event${timelineLogs.length !== 1 ? "s" : ""}${date ? ` on ${fmtDate(date)}` : ""}`
                  : `${filteredLogs.length} record${filteredLogs.length !== 1 ? "s" : ""}${!selectedMember && date ? ` on ${fmtDate(date)}` : " (all dates)"}`
              }
            </p>
          </div>

          <div className="flex gap-2 items-center flex-wrap">
            {/* Live HUD Mode Toggle */}
            {!selectedMember && (
              <button
                onClick={() => {
                  setHudMode(!hudMode);
                  if (!hudMode) setViewMode("grouped"); // force grouped view when HUD is active
                }}
                className={`h-10 px-4 rounded-lg text-sm font-semibold border transition-all flex items-center gap-1.5 ${
                  hudMode
                    ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                    : "border-border bg-surfaceLight/80 text-text-muted hover:text-white"
                }`}
              >
                <span className="relative flex h-2 w-2">
                  {hudMode && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${hudMode ? "bg-accent" : "bg-text-muted"}`}></span>
                </span>
                📺 Live HUD
              </button>
            )}

            {/* View mode toggle — only in non-member mode and NOT in HUD */}
            {!selectedMember && !hudMode && (
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setViewMode("grouped")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                    viewMode === "grouped" ? "bg-accent text-black" : "text-text-muted hover:text-white"
                  }`}>
                  <List className="w-3.5 h-3.5" /> Grouped
                </button>
                <button
                  onClick={() => setViewMode("timeline")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l border-border ${
                    viewMode === "timeline" ? "bg-accent text-black" : "text-text-muted hover:text-white"
                  }`}>
                  <AlignLeft className="w-3.5 h-3.5" /> Punch Timeline
                </button>
              </div>
            )}

            {!selectedMember && !hudMode && (
              <>
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input type="text" placeholder="Search name or PIN…" value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input-field pl-9 bg-background h-10 w-48" />
                </div>
                {/* Date */}
                <div className="relative flex items-center">
                  <CalendarDays className="absolute left-3 w-4 h-4 text-text-muted pointer-events-none" />
                  <input type="date" lang="en-GB" value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="input-field pl-9 bg-background h-10 w-44" />
                </div>
                {/* Today / All */}
                {date !== todayStr() ? (
                  <button onClick={() => setDate(todayStr())}
                    className="h-10 px-3 rounded-lg text-sm font-medium border border-border bg-surfaceLight text-text-muted hover:text-white transition-colors">
                    Today
                  </button>
                ) : (
                  <button onClick={clearDate}
                    className="h-10 px-3 rounded-lg text-sm font-medium border border-accent/40 bg-accent/20 text-accent transition-colors"
                    title="Show all dates">
                    Today ✕
                  </button>
                )}
              </>
            )}

            {/* Refresh */}
            <button
              onClick={() => { fetchLogs(); if (viewMode === "timeline") fetchTimeline(); }}
              disabled={phaseOne || syncing || timelineLoading}
              className="btn-secondary px-3 h-10 flex items-center justify-center"
              title="Refresh">
              <RefreshCw className={`w-4 h-4 ${(syncing || timelineLoading) ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── HUD VIEW ─────────────────────────────────────────────────────── */}
        {hudMode ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Left 2 Columns: Large display of the last checked-in member */}
            <div className="lg:col-span-2 card border-border/50 p-8 flex flex-col items-center justify-center min-h-[480px] text-center bg-gradient-to-br from-surface to-surfaceLight/30">
              {logs.length > 0 ? (
                (() => {
                  const last = logs[0];
                  const fullName = `${last.first_name || ""} ${last.last_name || ""}`.trim();
                  
                  // Calculate member status
                  let statusLabel = "Active";
                  let statusColor = "bg-accent/15 text-accent border-accent/20";
                  
                  if (last.is_paused) {
                    statusLabel = "Paused";
                    statusColor = "bg-gray-500/10 text-gray-400 border-gray-500/30";
                  } else if (last.sub_status === "expired" || (last.end_date && new Date(last.end_date) < new Date())) {
                    statusLabel = "Expired";
                    statusColor = "bg-primary/10 text-primary border-primary/30";
                  } else if (Number(last.total_due) > 0) {
                    statusLabel = "Has Due";
                    statusColor = "bg-orange-500/10 text-orange-400 border-orange-500/30";
                  } else if (!last.package_name) {
                    statusLabel = "No Package";
                    statusColor = "bg-surfaceLight text-text-muted";
                  }

                  return (
                    <div className="space-y-6 w-full max-w-md animate-[fadeIn_0.3s_ease-out]">
                      {/* Giant Avatar */}
                      <div className="flex justify-center">
                        <div className="w-32 h-32 rounded-full bg-accent/10 border-2 border-accent flex items-center justify-center text-accent text-5xl font-bold shadow-lg shadow-accent/10">
                          {(last.first_name || "?").charAt(0).toUpperCase()}
                        </div>
                      </div>

                      {/* Name & ID */}
                      <div>
                        <h2 className="text-3xl font-extrabold text-white tracking-tight">
                          {fullName}
                        </h2>
                        <p className="text-text-muted mt-1.5 text-sm font-semibold">
                          ID: {last.pin || "—"} • Checked in at {fmtTime(last.check_in_time)}
                        </p>
                      </div>

                      {/* Status & Package */}
                      <div className="flex flex-col items-center gap-3">
                        <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${statusColor}`}>
                          {statusLabel.toUpperCase()}
                        </span>
                        
                        {last.package_name && (
                          <p className="text-white text-base font-medium flex items-center gap-2">
                            Package: <span className="text-accent">{last.package_name}</span>
                          </p>
                        )}
                        
                        {last.end_date && (
                          <p className="text-xs text-text-muted">
                            Expires on {new Date(last.end_date).toLocaleDateString("en-GB")}
                          </p>
                        )}
                      </div>

                      {/* Dues Alert */}
                      {Number(last.total_due) > 0 && (
                        <div className="bg-red-500/15 border border-red-500/30 rounded-2xl p-4 flex flex-col items-center">
                          <p className="text-xs uppercase font-bold tracking-wider text-red-400">Outstanding Dues</p>
                          <p className="text-2xl font-black text-red-400 mt-1">{Number(last.total_due)} BDT</p>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="text-text-muted">
                  <DoorOpen className="w-16 h-16 opacity-25 mx-auto mb-4" />
                  <p className="text-lg font-medium">Waiting for check-in...</p>
                  <p className="text-sm opacity-65 mt-1">Scan fingerprint or card at the ZKTeco gate.</p>
                </div>
              )}
            </div>

            {/* Right 1 Column: Recent Check-ins list */}
            <div className="card border-border/50 p-4 flex flex-col bg-surface/50 h-[480px]">
              <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-3">
                Recent Check-ins
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1.5 custom-scrollbar">
                {logs.slice(1, 10).map((log) => {
                  const logName = `${log.first_name || ""} ${log.last_name || ""}`.trim();
                  const isLogDue = Number(log.total_due) > 0;
                  const isLogExpired = log.sub_status === "expired" || (log.end_date && new Date(log.end_date) < new Date());
                  
                  return (
                    <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-border/40 bg-surfaceLight/30 hover:bg-surfaceLight/50 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm shrink-0">
                        {(log.first_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm font-semibold truncate">{logName}</p>
                        <p className="text-xs text-text-muted font-mono">{fmtTime(log.check_in_time)}</p>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        {isLogExpired ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-bold">EXPIRED</span>
                        ) : isLogDue ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-bold">DUE</span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20 font-bold">OK</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {logs.length <= 1 && (
                  <p className="text-center text-text-muted text-xs py-12">No other check-ins today.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ── GROUPED VIEW ─────────────────────────────────────────────────── */}
            {viewMode === "grouped" && (
              phaseOne ? (
                <SkeletonRows />
              ) : filteredLogs.length === 0 ? (
                <EmptyState selectedMember={selectedMember} date={date} />
              ) : (
                <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead className="sticky top-0 bg-surface z-10">
                      <tr className="bg-surfaceLight/50 text-text-muted text-xs uppercase tracking-wider border-b border-border/50">
                        <th className="px-6 py-3 font-medium">Member</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium"><span className="flex items-center gap-1.5"><LogIn  className="w-3.5 h-3.5 text-accent"   /> Check In</span></th>
                        <th className="px-4 py-3 font-medium"><span className="flex items-center gap-1.5"><LogOut className="w-3.5 h-3.5 text-primary" /> Check Out</span></th>
                        <th className="px-4 py-3 font-medium">Duration</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {filteredLogs.map((log) => {
                        const duration = fmtDuration(log.check_in_time, log.check_out_time);
                        const inside   = !log.check_out_time;
                        const fullName = `${log.first_name || ""} ${log.last_name || ""}`.trim();
                        return (
                          <tr key={log.id} className="hover:bg-surfaceLight/30 transition-colors">
                            <td className="px-6 py-3.5">
                              <button className="flex items-center gap-3 text-left group"
                                onClick={() => handleMemberClick(log)}>
                                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm shrink-0 group-hover:bg-accent/40 transition-colors">
                                  {(log.first_name || "?").charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-white font-medium text-sm group-hover:text-accent transition-colors">{fullName}</p>
                                  <p className="text-text-muted text-xs">{log.phone_number || "—"}</p>
                                </div>
                              </button>
                            </td>
                            <td className="px-4 py-3.5 text-sm text-text-muted">{fmtDate(log.date)}</td>
                            <td className="px-4 py-3.5">
                              <span className="flex items-center gap-1.5 text-sm font-mono text-accent">
                                <Clock className="w-3.5 h-3.5 opacity-60" />{fmtTime(log.check_in_time)}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              {log.check_out_time
                                ? <span className="flex items-center gap-1.5 text-sm font-mono text-text-muted"><Clock className="w-3.5 h-3.5 opacity-60" />{fmtTime(log.check_out_time)}</span>
                                : <span className="text-sm text-text-muted/50">—</span>}
                            </td>
                            <td className="px-4 py-3.5">
                              {duration
                                ? <span className="text-xs px-2 py-1 rounded-md bg-surfaceLight text-text-muted">{duration}</span>
                                : <span className="text-text-muted/50 text-sm">—</span>}
                            </td>
                            <td className="px-4 py-3.5">
                              {inside
                                ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-accent/10 text-accent border border-accent/20"><span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"/>Inside</span>
                                : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-surfaceLight text-text-muted"><span className="w-1.5 h-1.5 rounded-full bg-text-muted"/>Left</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* ── PUNCH TIMELINE VIEW ───────────────────────────────────────────── */}
            {viewMode === "timeline" && (
              timelineLoading ? (
                <SkeletonRows />
              ) : timelineError ? (
                <div className="p-12 text-center">
                  <WifiOff className="w-10 h-10 text-red-400/40 mx-auto mb-3" />
                  <p className="text-red-400 text-sm">{timelineError}</p>
                </div>
              ) : timelineLogs.length === 0 ? (
                <div className="p-16 text-center">
                  <DoorOpen className="w-12 h-12 text-text-muted/20 mx-auto mb-4" />
                  <p className="text-text-muted font-medium">No punch events found</p>
                  <p className="text-text-muted/60 text-sm mt-1">
                    {date ? `No punches on ${fmtDate(date)}.` : "No punch data from device."}
                  </p>
                </div>
              ) : (
                <div className="p-6 max-h-[620px] overflow-y-auto">
                  {/* Filter timeline by search */}
                  {(() => {
                    const q = searchQ.trim().toLowerCase();
                    const visible = q
                      ? timelineLogs.filter((p) =>
                          `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
                          (p.phone_number || "").toLowerCase().includes(q))
                      : timelineLogs;

                    if (visible.length === 0) return (
                      <p className="text-center text-text-muted text-sm py-8">No results for "{searchQ}"</p>
                    );

                    // Group by date for section headers
                    const byDate = {};
                    for (const punch of visible) {
                      if (!byDate[punch.date]) byDate[punch.date] = [];
                      byDate[punch.date].push(punch);
                    }

                    return Object.entries(byDate)
                      .sort(([a], [b]) => b.localeCompare(a)) // latest date first
                      .map(([dateKey, punches]) => (
                        <div key={dateKey} className="mb-8">
                          {/* Date section header */}
                          <div className="flex items-center gap-3 mb-4">
                            <span className="text-xs font-bold uppercase tracking-widest text-text-muted">{fmtDate(dateKey)}</span>
                            <div className="flex-1 h-px bg-border/50" />
                            <span className="text-xs text-text-muted/60">{punches.length} punch{punches.length !== 1 ? "es" : ""}</span>
                          </div>

                          {/* Timeline rows */}
                          <div className="relative">
                            {/* Vertical line */}
                            <div className="absolute left-[23px] top-3 bottom-3 w-px bg-border/40" />

                            <div className="space-y-1">
                              {punches.map((punch, idx) => {
                                const isIn   = punch.type === "in";
                                const name   = `${punch.first_name || ""} ${punch.last_name || ""}`.trim();
                                const isLast = idx === punches.length - 1;
                                return (
                                  <div key={punch.id} className="flex items-start gap-4 group">
                                    {/* Dot */}
                                    <div className={`relative z-10 mt-2.5 w-[14px] h-[14px] rounded-full flex-shrink-0 ring-2 ring-surface ${isIn ? "bg-emerald-500" : "bg-red-500"}`} />

                                    {/* Content row */}
                                    <div className={`flex-1 flex items-center gap-4 py-2 px-4 rounded-xl transition-colors group-hover:bg-surfaceLight/30 ${isLast ? "" : ""}`}>
                                      {/* Time */}
                                      <span className="font-mono text-sm text-text-muted w-20 shrink-0">{fmtTime(punch.time)}</span>

                                      {/* Avatar */}
                                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isIn ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                                        {(punch.first_name || "?").charAt(0).toUpperCase()}
                                      </div>

                                      {/* Name */}
                                      <span className="text-white text-sm font-medium flex-1 truncate">{name}</span>

                                      {/* Badge */}
                                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold shrink-0 ${isIn
                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                        : "bg-red-500/10  text-red-400  border border-red-500/20"}`}>
                                        {isIn ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
                                        {isIn ? "Punch In" : "Punch Out"}
                                      </span>

                                      {/* Seq badge (e.g. "3rd punch") */}
                                      <span className="text-[10px] text-text-muted/50 shrink-0 hidden sm:block">
                                        #{punch.seq}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ));
                  })()}
                </div>
              )
            )}
          </>
        )}
      </div>

      {/* CSS for progress bar animation */}
      <style>{`
        @keyframes progressBar {
          0%   { width: 0%;   margin-left: 0; }
          50%  { width: 70%;  margin-left: 15%; }
          100% { width: 0%;   margin-left: 100%; }
        }
      `}</style>
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const SkeletonRows = () => (
  <div className="p-6 space-y-3 animate-pulse">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-full bg-surfaceLight" />
        <div className="flex-1 h-4 rounded bg-surfaceLight" style={{ width: `${60 + (i * 7) % 30}%` }} />
        <div className="w-20 h-4 rounded bg-surfaceLight" />
        <div className="w-16 h-4 rounded bg-surfaceLight" />
      </div>
    ))}
  </div>
);

const EmptyState = ({ selectedMember, date }) => (
  <div className="p-16 text-center">
    <DoorOpen className="w-12 h-12 text-text-muted/20 mx-auto mb-4" />
    <p className="text-text-muted font-medium">No door records found</p>
    <p className="text-text-muted/60 text-sm mt-1">
      {selectedMember
        ? "This member has no attendance records."
        : date
          ? 'Try clicking "Today ✕" to view all dates.'
          : "No attendance data yet."}
    </p>
  </div>
);

export default POS;
