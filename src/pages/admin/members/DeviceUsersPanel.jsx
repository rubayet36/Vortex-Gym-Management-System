import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  RefreshCw,
  Fingerprint,
  WifiOff,
  Ban,
} from "lucide-react";
import { BRIDGE } from "./membersUtils";
import { useToast } from "./useToast";

const DeviceUsersPanel = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bridgeOnline, setBridgeOnline] = useState(false);
  const [search, setSearch] = useState("");
  const [blockingPin, setBlockingPin] = useState(null);
  const { show: showToast, ToastEl } = useToast();

  const checkBridge = useCallback(async () => {
    try {
      const res = await fetch(`${BRIDGE}/api/status`);
      if (res.ok) setBridgeOnline(true);
    } catch {
      setBridgeOnline(false);
    }
  }, []);

  const fetchDeviceUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BRIDGE}/api/device-users`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
        showToast(`Loaded ${data.users.length} users from F22 device.`);
      } else {
        showToast("Failed to fetch users: " + data.error, "error");
      }
    } catch {
      showToast("Bridge offline. Start the bridge server first.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkBridge();
  }, [checkBridge]);

  const handleBlockAccess = async (user) => {
    if (
      !window.confirm(
        `Block access for "${user.name}" (PIN: ${user.userId})?\n\nThis will DELETE them from the F22 device.`
      )
    )
      return;

    setBlockingPin(user.userId);
    try {
      const res = await fetch(`${BRIDGE}/api/enforce-expiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, pin: user.userId }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers((prev) => prev.filter((u) => u.userId !== user.userId));
        showToast(`✅ "${user.name}" blocked — removed from device.`);
      } else {
        showToast("Block failed: " + data.error, "error");
      }
    } catch {
      showToast("Error: Is the bridge running?", "error");
    } finally {
      setBlockingPin(null);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.userId.includes(search)
  );

  return (
    <div className="space-y-4">
      {ToastEl}

      {!bridgeOnline && (
        <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-4 py-3 rounded-xl text-sm">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          Bridge is offline. Run{" "}
          <code className="bg-yellow-500/20 px-1.5 py-0.5 rounded text-xs">npm start</code>{" "}
          in the <strong>zkteco-bridge</strong> folder.
        </div>
      )}

      <div className="card border-border/50">
        <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div>
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-accent" />
              ZKTeco F22 — Raw Device Users
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {users.length > 0
                ? `${users.length} users on device · ${filtered.length} shown`
                : "Click 'Load from Device' to fetch users"}
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search name or PIN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-9 bg-background h-10 w-52"
              />
            </div>
            <button
              onClick={fetchDeviceUsers}
              disabled={loading || !bridgeOnline}
              className="btn-primary flex items-center gap-2 px-4 h-10 whitespace-nowrap"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Loading..." : "Load from Device"}
            </button>
          </div>
        </div>

        {users.length === 0 ? (
          <div className="p-16 text-center">
            <Fingerprint className="w-12 h-12 text-text-muted/30 mx-auto mb-4" />
            <p className="text-text-muted font-medium">No users loaded yet</p>
            <p className="text-text-muted/60 text-sm mt-1">
              Click "Load from Device" to read all users from the F22
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-surfaceLight/50 text-text-muted text-xs border-b border-border/50 uppercase tracking-wider">
                  <th className="px-6 py-3 font-medium">#</th>
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">PIN / User ID</th>
                  <th className="px-6 py-3 font-medium">Card No</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium text-right text-red-400">
                    Door Access
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((user, idx) => (
                  <tr
                    key={user.userId}
                    className="hover:bg-surfaceLight/30 transition-colors group"
                  >
                    <td className="px-6 py-4 text-text-muted text-sm">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-white font-medium text-sm">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm bg-surfaceLight px-2 py-1 rounded text-accent">
                        {user.userId}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-muted">
                      {user.cardno > 0 ? user.cardno : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs px-2 py-1 rounded bg-surfaceLight text-text-muted capitalize">
                        {user.role === 14 ? "Admin" : "Member"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleBlockAccess(user)}
                        disabled={blockingPin === user.userId}
                        className="flex items-center gap-1.5 ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all border border-primary/30 hover:border-primary disabled:opacity-50"
                      >
                        {blockingPin === user.userId ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Ban className="w-3 h-3" />
                        )}
                        {blockingPin === user.userId ? "Blocking..." : "Block Access"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceUsersPanel;
