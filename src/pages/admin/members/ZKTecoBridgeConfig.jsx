import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Fingerprint,
  CheckCircle2,
  AlertCircle,
  Search,
  Ban,
  Zap,
} from "lucide-react";
import { BRIDGE } from "./membersUtils";

const ZKTecoBridgeConfig = () => {
  const [status, setStatus] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [deviceIp, setDeviceIp] = useState("192.168.68.100");
  const [isUpdatingIp, setIsUpdatingIp] = useState(false);
  const [ghostUsers, setGhostUsers] = useState([]);
  const [ghostLoading, setGhostLoading] = useState(false);
  const [ghostError, setGhostError] = useState(null);
  const [blockingPin, setBlockingPin] = useState(null);
  const [totalOnDevice, setTotalOnDevice] = useState(null);

  const checkStatus = async () => {
    try {
      const res = await fetch(`${BRIDGE}/api/status`);
      const data = await res.json();
      setStatus(data);
      if (data?.ip) setDeviceIp((prev) => (prev !== data.ip ? data.ip : prev));
    } catch {
      setStatus(null);
    }
  };

  const fetchGhostUsers = async () => {
    setGhostLoading(true);
    setGhostError(null);
    try {
      const res = await fetch(`${BRIDGE}/api/ghost-users`);
      if (!res.ok) throw new Error(`Bridge error: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setGhostUsers(data.ghostUsers || []);
        setTotalOnDevice(data.totalOnDevice ?? null);
      } else {
        setGhostError(data.error || "Failed to fetch ghost users.");
      }
    } catch (e) {
      setGhostError("Could not reach bridge or device. Make sure bridge is running and device is online.");
    } finally {
      setGhostLoading(false);
    }
  };

  const handleBlockGhost = async (user) => {
    if (!window.confirm(`Block and remove PIN ${user.userId} (${user.name}) from the device?\n\nThey are not in your database.`)) return;
    setBlockingPin(user.userId);
    try {
      const res = await fetch(`${BRIDGE}/api/users/${user.userId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setGhostUsers((prev) => prev.filter((u) => u.userId !== user.userId));
        setTotalOnDevice((prev) => (prev !== null ? prev - 1 : prev));
      } else {
        alert(`Failed to block: ${data.error}`);
      }
    } catch {
      alert("Bridge unreachable.");
    } finally {
      setBlockingPin(null);
    }
  };

  useEffect(() => {
    let delay = 5000;       // start at 5s
    const MAX_DELAY = 60000; // cap at 60s when offline
    let timer;

    const poll = async () => {
      try {
        const res = await fetch(`${BRIDGE}/api/status`);
        const data = await res.json();
        setStatus(data);
        if (data?.ip) setDeviceIp((prev) => (prev !== data.ip ? data.ip : prev));
        delay = 5000; // reset to fast polling when online
      } catch {
        setStatus(null);
        delay = Math.min(delay * 2, MAX_DELAY); // backoff when offline
      }
      timer = setTimeout(poll, delay);
    };

    poll();
    return () => clearTimeout(timer);
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch(`${BRIDGE}/api/sync`, { method: "POST" });
      const data = await res.json();
      setSyncResult(data);
    } catch (err) {
      setSyncResult({ error: "Bridge unreachable: " + err.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateIp = async () => {
    setIsUpdatingIp(true);
    try {
      const res = await fetch(`${BRIDGE}/api/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: deviceIp }),
      });
      const data = await res.json();
      if (data.success) setSyncResult({ ip: `IP updated to ${deviceIp}` });
    } catch {
      setSyncResult({ error: "Bridge offline." });
    } finally {
      setIsUpdatingIp(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card p-6 border-border/50">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-accent/20 text-accent rounded-xl">
            <Fingerprint className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Bridge Configuration</h2>
            <p className="text-sm text-text-muted">
              Configure connection and trigger manual sync.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="label">Device IP Address</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input-field"
                  value={deviceIp}
                  onChange={(e) => setDeviceIp(e.target.value)}
                />
                <button
                  onClick={handleUpdateIp}
                  disabled={isUpdatingIp || !status}
                  className="btn-secondary px-4 whitespace-nowrap"
                >
                  Save IP
                </button>
              </div>
            </div>

            {/* Auto-sync info */}
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-accent" />
                <span className="text-white font-medium text-sm">Auto-Sync Active</span>
              </div>
              <p className="text-text-muted text-xs">
                The bridge automatically syncs every <strong className="text-white">5 minutes</strong> when running.
                It will collect attendance, import new device users, and{" "}
                <strong className="text-white">block expired members</strong> automatically.
              </p>
            </div>
          </div>

          <div className="bg-surfaceLight rounded-xl p-5 border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium">Bridge Status</h3>
              <span
                className={`flex items-center gap-2 text-sm px-2 py-1 rounded-lg ${
                  status ? "text-accent bg-accent/10" : "text-primary bg-primary/10"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    status ? "bg-accent animate-pulse" : "bg-primary"
                  }`}
                />
                {status ? "Online" : "Offline"}
              </span>
            </div>

            <p className="text-sm text-text-muted">
              {status
                ? `Running at localhost:3001 · Device: ${status.ip} · Auto-sync: ${status.autoSyncInterval}`
                : "Not detected. Run `npm start` in zkteco-bridge folder."}
            </p>

            <button
              onClick={handleSync}
              disabled={!status || isSyncing}
              className={`w-full text-base font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition-all ${
                !status || isSyncing
                  ? "bg-surface border border-border text-text-muted"
                  : "bg-accent/20 hover:bg-accent/30 text-accent"
              }`}
            >
              <RefreshCw className={`w-5 h-5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync Now (Manual)"}
            </button>

            {/* Sync result */}
            {syncResult && (
              <div
                className={`rounded-xl p-4 text-sm border ${
                  syncResult.error
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-accent/10 border-accent/30 text-accent"
                }`}
              >
                {syncResult.error ? (
                  <p>{syncResult.error}</p>
                ) : syncResult.ip ? (
                  <p>✅ {syncResult.ip}</p>
                ) : (
                  <div className="space-y-1">
                    <p>✅ Sync complete!</p>
                    <p className="text-text-muted">
                      Pushed to device: <strong className="text-white">{syncResult.pushedToDevice}</strong>
                    </p>
                    <p className="text-text-muted">
                      Attendance synced: <strong className="text-white">{syncResult.syncedCheckins}</strong>
                    </p>
                    <p className="text-text-muted">
                      Expired blocked: <strong className="text-white">{syncResult.expiredBlocked}</strong>
                    </p>
                    {syncResult.connected === false && (
                      <p className="text-yellow-400 text-xs mt-1">
                        ⚠️ Could not connect to device.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Ghost Users Section ─────────────────────────────────────────────── */}
      <div className="card border-border/50">
        <div className="px-6 py-5 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/15 text-yellow-400 rounded-xl">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-white font-bold">Unknown Device Users</h2>
              <p className="text-text-muted text-xs mt-0.5">
                Active on the ZKTeco device but <strong className="text-yellow-400">not found in your database</strong>. You can block them.
              </p>
            </div>
            {totalOnDevice !== null && (
              <span className="ml-2 hidden sm:flex items-center gap-1.5 text-xs text-text-muted bg-surfaceLight border border-border px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
                {totalOnDevice} total on device
              </span>
            )}
          </div>
          <button
            onClick={fetchGhostUsers}
            disabled={ghostLoading || !status}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20 transition-all font-semibold text-sm disabled:opacity-50 whitespace-nowrap"
          >
            <Search className={`w-4 h-4 ${ghostLoading ? "animate-spin" : ""}`} />
            {ghostLoading ? "Scanning..." : "Scan Device"}
          </button>
        </div>

        <div className="p-6">
          {/* Not yet scanned */}
          {!ghostLoading && ghostUsers.length === 0 && !ghostError && totalOnDevice === null && (
            <div className="text-center py-10">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-yellow-400/60" />
              </div>
              <p className="text-text-muted font-medium">No scan yet</p>
              <p className="text-text-muted/60 text-sm mt-1">
                Click <strong className="text-yellow-400">Scan Device</strong> to find users on the device that are not in your database.
              </p>
              {!status && (
                <p className="mt-3 text-xs text-primary bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 inline-block">
                  ⚠️ Bridge is offline — start the bridge first.
                </p>
              )}
            </div>
          )}

          {/* Loading */}
          {ghostLoading && (
            <div className="text-center py-10">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-yellow-400" />
              <p className="text-text-muted text-sm">Connecting to device and scanning...</p>
            </div>
          )}

          {/* Error */}
          {ghostError && !ghostLoading && (
            <div className="flex items-start gap-3 bg-primary/10 border border-primary/30 text-primary rounded-xl p-4 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{ghostError}</p>
            </div>
          )}

          {/* All clean */}
          {!ghostLoading && !ghostError && totalOnDevice !== null && ghostUsers.length === 0 && (
            <div className="text-center py-10">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-accent/10 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-accent" />
              </div>
              <p className="text-white font-semibold">All device users are in your database</p>
              <p className="text-text-muted text-sm mt-1">
                {totalOnDevice} users on device — all matched.
              </p>
            </div>
          )}

          {/* Ghost users table */}
          {!ghostLoading && ghostUsers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2.5 py-1 bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 text-xs font-bold rounded-full">
                  {ghostUsers.length} unknown {ghostUsers.length === 1 ? "user" : "users"} found
                </span>
                <span className="text-text-muted text-xs">out of {totalOnDevice} on device</span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-border/60">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-surfaceLight/60 text-text-muted text-xs uppercase tracking-wider border-b border-border/50">
                      <th className="px-5 py-3 font-medium">Device PIN</th>
                      <th className="px-5 py-3 font-medium">Name on Device</th>
                      <th className="px-5 py-3 font-medium">Card No</th>
                      <th className="px-5 py-3 font-medium">UID</th>
                      <th className="px-5 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {ghostUsers.map((user) => (
                      <tr key={user.userId} className="hover:bg-surfaceLight/30 transition-colors">
                        <td className="px-5 py-4">
                          <span className="font-bold text-yellow-400 text-sm bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-lg">
                            {user.userId}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center text-yellow-400 font-bold text-xs flex-shrink-0">
                              {(user.name || "?").charAt(0).toUpperCase()}
                            </div>
                            <span className="text-white text-sm">{user.name || "—"}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-text-muted text-sm">
                            {user.cardno ? user.cardno : <span className="opacity-40">—</span>}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-text-muted text-xs font-mono">{user.uid}</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => handleBlockGhost(user)}
                            disabled={blockingPin === user.userId}
                            className="flex items-center gap-1.5 ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all border border-primary/30 hover:border-primary disabled:opacity-50"
                          >
                            {blockingPin === user.userId ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Ban className="w-3 h-3" />
                            )}
                            {blockingPin === user.userId ? "Blocking..." : "Block & Remove"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ZKTecoBridgeConfig;
