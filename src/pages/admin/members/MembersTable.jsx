import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Plus,
  RefreshCw,
  Edit2,
  Ban,
  User,
  WifiOff,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Package,
  RotateCcw,
  Clock,
  MessageCircle,
  PauseCircle,
  PlayCircle,
  DollarSign,
  MoreVertical,
  X,
} from "lucide-react";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { BRIDGE, daysLeft } from "./membersUtils";
import { useToast } from "./useToast";
import AddMemberModal from "./AddMemberModal";
import EditMemberModal from "./EditMemberModal";
import RenewPackageModal from "./RenewPackageModal";
import PauseMemberModal from "./PauseMemberModal";
import ClearDueModal from "./ClearDueModal";
import MemberHistoryModal from "./MemberHistoryModal";

const MembersTable = () => {
  const { profile } = useAuth();
  const isOwner = profile?.role === "owner";
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [searchUserId, setSearchUserId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [bloodGroupFilter, setBloodGroupFilter] = useState("all");
  const [bridgeOnline, setBridgeOnline] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [renewTarget, setRenewTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [pauseTarget, setPauseTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [blockingMemberId, setBlockingMemberId] = useState(null);
  const [clearDueTarget, setClearDueTarget] = useState(null);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const { show: showToast, ToastEl } = useToast();

  const checkBridge = useCallback(async () => {
    try {
      const res = await fetch(`${BRIDGE}/api/status`);
      if (res.ok) setBridgeOnline(true);
    } catch {
      setBridgeOnline(false);
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.profiles.list({ role: 'member' });
      setMembers(res?.data || []);
    } catch (e) {
      console.error('fetchMembers error:', e);
    }
    setLoading(false);
  }, []);

  // Handle manual block: remove member from F22 device
  const handleBlockMember = async (member) => {
    const pin = member.pin || member.phone_number;
    const fullName = `${member.first_name} ${member.last_name}`.trim();
    if (!pin) {
      showToast(`${fullName} has no PIN — cannot block from device.`, 'error');
      return;
    }
    if (!window.confirm(`Block device access for "${fullName}" (PIN: ${pin})?\n\nThis removes them from the F22 door device. They stay in the database and can be re-added when their package is renewed.`))
      return;

    setBlockingMemberId(member.id);
    try {
      const res = await fetch(`${BRIDGE}/api/enforce-expiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: String(pin) }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`🚫 "${fullName}" blocked — removed from F22 device.`);
        fetchMembers();
      } else {
        showToast(`Block failed: ${data.error}`, 'error');
      }
    } catch {
      showToast('Bridge offline. Start the bridge first.', 'error');
    } finally {
      setBlockingMemberId(null);
    }
  };

  useEffect(() => {
    fetchMembers();
    checkBridge();
  }, [fetchMembers, checkBridge]);

  // Get the most relevant subscription for display
  const getActiveSub = (member) => {
    // API returns flat sub data. Support both nested and flat.
    const subs = member.user_subscriptions || [];
    if (subs.length > 0) {
      const active = subs.find((s) => s.status === 'active');
      if (active) return active;
      return subs.sort((a, b) => new Date(b.end_date) - new Date(a.end_date))[0] || null;
    }
    // flat response from profiles.php join
    if (member.sub_status) {
      return {
        status: member.sub_status,
        end_date: member.end_date,
        packages: { name: member.package_name, duration_days: member.duration_days },
      };
    }
    return null;
  };

  const getStatusBadge = (member) => {
    if (member.is_paused)
      return { label: "Paused", color: "bg-gray-500/10 text-gray-400 border border-gray-500/30", icon: <PauseCircle className="w-3 h-3" /> };

    const sub = getActiveSub(member);
    if (!sub) return { label: "No Package", color: "bg-surfaceLight text-text-muted", icon: <Package className="w-3 h-3" /> };

    const days = daysLeft(sub.end_date);
    if (sub.status === "expired" || days < 0)
      return { label: "Expired", color: "bg-primary/10 text-primary border border-primary/30", icon: <Ban className="w-3 h-3" /> };
    if (days <= 7)
      return { label: `Expires in ${days}d`, color: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20", icon: <Clock className="w-3 h-3" /> };
    // Show Has Due badge if member has outstanding payments
    if (Number(member.total_due) > 0)
      return { label: "Has Due", color: "bg-orange-500/10 text-orange-400 border border-orange-500/30", icon: <AlertCircle className="w-3 h-3" /> };
    return { label: "Active", color: "bg-accent/10 text-accent border border-accent/20", icon: <CheckCircle2 className="w-3 h-3" /> };
  };

  const filtered = useMemo(() => members.filter((m) => {
    const fullName = `${m.first_name} ${m.last_name}`.toLowerCase();
    const matchName = !searchName || fullName.includes(searchName.toLowerCase());
    const matchPhone = !searchPhone || (m.phone_number || "").includes(searchPhone);
    const matchUserId = !searchUserId || (m.member_id || "").toLowerCase().includes(searchUserId.toLowerCase()) || String(m.pin || "").includes(searchUserId);
    const matchGender = genderFilter === "all" || (m.gender || "").toLowerCase() === genderFilter;
    const matchBlood = bloodGroupFilter === "all" || (m.blood_group || "") === bloodGroupFilter;
    if (!matchName || !matchPhone || !matchUserId || !matchGender || !matchBlood) return false;
    if (statusFilter === "active") {
      const sub = getActiveSub(m);
      return sub && sub.status === "active" && daysLeft(sub.end_date) >= 0;
    }
    if (statusFilter === "expired") {
      const sub = getActiveSub(m);
      return sub && (sub.status === "expired" || daysLeft(sub.end_date) < 0);
    }
    if (statusFilter === "no-package") {
      const sub = getActiveSub(m);
      return !sub;
    }
    if (statusFilter === "has-dues") {
      return Number(m.total_due) > 0;
    }
    return true;
  }).sort((a, b) => {
    const pinA = a.member_id ? parseInt(a.member_id, 10) : NaN;
    const pinB = b.member_id ? parseInt(b.member_id, 10) : NaN;
    if (!isNaN(pinA) && !isNaN(pinB)) return pinB - pinA;
    if (!isNaN(pinA)) return -1;
    if (!isNaN(pinB)) return 1;
    return String(b.member_id || '').localeCompare(String(a.member_id || ''));
  }), [members, searchName, searchPhone, searchUserId, statusFilter, genderFilter, bloodGroupFilter]);

  return (
    <div className="space-y-4">
      {ToastEl}

      {/* Bridge offline warning */}
      {!bridgeOnline && (
        <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-4 py-3 rounded-xl text-sm">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          Bridge is offline — run <code className="bg-yellow-500/20 px-1.5 py-0.5 rounded text-xs">npm start</code> in the{" "}
          <strong>zkteco-bridge</strong> folder. Device operations will be unavailable.
        </div>
      )}

      <div className="card border-border/50">
        {/* Header */}
        <div className="border-b border-border/50 px-5 py-5 md:px-6 md:py-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <h2 className="flex items-center gap-3 text-xl font-bold text-text-main md:text-2xl">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                    <User className="w-5 h-5" />
                  </span>
                  Members &amp; Package Status
                </h2>
                <p className="mt-2 text-sm leading-6 text-text-muted">
                  Manage memberships, check package health, and take action from one place.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-border/70 bg-surfaceLight/60 px-3 py-1 text-xs font-semibold text-text-main">
                    {loading ? "Loading members..." : `${filtered.length} shown`}
                  </span>
                  <span className="rounded-full border border-border/70 bg-surfaceLight/35 px-3 py-1 text-xs font-medium capitalize text-text-muted">
                    Filter: {[statusFilter, genderFilter, bloodGroupFilter].filter(f => f !== "all").join(" · ") || "all members"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                <button
                  onClick={fetchMembers}
                  className="btn-secondary h-11 px-4"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn-primary h-11 whitespace-nowrap px-5"
                >
                  <Plus className="w-4 h-4" />
                  Add Member
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
              <div className="rounded-[24px] border border-border/60 bg-surfaceLight/25 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  Search Members
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="text"
                      placeholder="Name..."
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      className="input-field h-11 w-full bg-background pl-11"
                    />
                  </div>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="text"
                      placeholder="Phone..."
                      value={searchPhone}
                      onChange={(e) => setSearchPhone(e.target.value)}
                      className="input-field h-11 w-full bg-background pl-11"
                    />
                  </div>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="text"
                      placeholder="User ID..."
                      value={searchUserId}
                      onChange={(e) => setSearchUserId(e.target.value)}
                      className="input-field h-11 w-full bg-background pl-11"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-[24px] border border-border/60 bg-surfaceLight/25 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    Filter by Gender
                  </p>
                  <select
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value)}
                    className="input-field h-11 w-full bg-background px-3"
                  >
                    <option value="all">All Genders</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="rounded-[24px] border border-border/60 bg-surfaceLight/25 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    Filter by Blood Group
                  </p>
                  <select
                    value={bloodGroupFilter}
                    onChange={(e) => setBloodGroupFilter(e.target.value)}
                    className="input-field h-11 w-full bg-background px-3"
                  >
                    <option value="all">All Blood Groups</option>
                    <option value="A+">A+</option>
                    <option value="A-">A−</option>
                    <option value="B+">B+</option>
                    <option value="B-">B−</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB−</option>
                    <option value="O+">O+</option>
                    <option value="O-">O−</option>
                  </select>
                </div>

                <div className="rounded-[24px] border border-border/60 bg-surfaceLight/25 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    Filter by Status
                  </p>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="input-field h-11 w-full bg-background px-3"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="has-dues">Has Dues</option>
                    <option value="expired">Expired</option>
                    <option value="no-package">No Package</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-12 text-center text-text-muted">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-accent" />
            Loading members...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-text-muted">
            <User className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-medium">No members found</p>
            <p className="text-sm text-text-muted/60 mt-1">
              Add a new member or run a device sync.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[760px] overflow-y-auto pb-20">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="sticky top-0 bg-surface z-10">
                <tr className="bg-surfaceLight/50 text-text-muted text-xs uppercase tracking-wider border-b border-border/50">
                  <th className="px-4 py-3.5 font-medium">Member</th>
                  <th className="px-3 py-3.5 font-medium">Phone</th>
                  <th className="px-3 py-3.5 font-medium">Package</th>
                  <th className="px-3 py-3.5 font-medium">Status</th>
                  <th className="px-4 py-3.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((member) => {
                  const sub = getActiveSub(member);
                  const badge = getStatusBadge(member);
                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-surfaceLight/30 transition-colors group cursor-pointer"
                      onClick={() => setHistoryTarget(member)}
                      title="Click to view payment history"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {member.avatar_url ? (
                            <img
                              src={`${member.avatar_url}`}
                              alt={member.first_name}
                              className="h-10 w-10 rounded-full object-cover flex-shrink-0 ring-1 ring-border cursor-zoom-in hover:opacity-85 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewImage({ src: member.avatar_url, title: `${member.first_name} ${member.last_name}` });
                              }}
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-accent font-bold text-sm flex-shrink-0">
                              {(member.first_name || "?").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-white font-medium text-[15px] max-w-[150px] sm:max-w-[200px] truncate" title={`${member.first_name} ${member.last_name}`}>
                              {member.first_name} {member.last_name}
                            </p>
                            <p className="mt-0.5 text-text-muted text-xs">
                              ID: {member.member_id || "—"} • PIN: {member.pin || "Not Assigned"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {member.phone_number ? (
                          <span className="text-sm text-white">{member.phone_number}</span>
                        ) : (
                          <span className="text-text-muted text-sm">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {sub?.packages?.name ? (
                          <div>
                            <span className="flex items-center gap-1.5 text-sm text-white max-w-[160px] sm:max-w-[200px] truncate" title={sub.packages.name}>
                              <Package className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                              {sub.packages.name}
                            </span>
                            {sub?.end_date && (
                              <span className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3 h-3 flex-shrink-0" />
                                Expires {new Date(sub.end_date).toLocaleDateString('en-GB')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-text-muted text-sm">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 w-max ${badge.color}`}
                        >
                          {badge.icon}
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {/* Clear Due */}
                          {Number(member.total_due) > 0 && (
                            <button
                              onClick={() => setClearDueTarget(member)}
                              title="Clear Due"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white transition-all border border-orange-500/30 hover:border-orange-500"
                            >
                              <DollarSign className="w-3 h-3" />
                              <span className="hidden md:inline">Clear Due</span>
                            </button>
                          )}
                          
                          {/* Assign / Renew Package */}
                          <button
                            onClick={() => setRenewTarget(member)}
                            title="Assign / Renew Package"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent/10 text-accent hover:bg-accent hover:text-white transition-all border border-accent/30 hover:border-accent"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span className="hidden md:inline">{sub ? "Renew" : "Assign"}</span>
                          </button>

                          {/* More Actions Dropdown */}
                          <div className="relative inline-block text-left">
                            <button
                              onClick={() => setActiveDropdownId(activeDropdownId === member.id ? null : member.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surfaceLight text-text-muted hover:bg-surface hover:text-white transition-all"
                              title="More Actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            
                            {activeDropdownId === member.id && (
                              <>
                                {/* Backdrop to close dropdown */}
                                <div 
                                  className="fixed inset-0 z-20" 
                                  onClick={() => setActiveDropdownId(null)}
                                />
                                <div 
                                  className="absolute right-0 mt-2 w-48 origin-top-right rounded-xl border border-border bg-surface shadow-xl ring-1 ring-black ring-opacity-5 z-30 overflow-hidden text-left"
                                >
                                  <div className="py-1 bg-surface">
                                    {/* Edit */}
                                    <button
                                      onClick={() => {
                                        setActiveDropdownId(null);
                                        setEditTarget(member);
                                      }}
                                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-text-muted hover:bg-surfaceLight hover:text-white transition-colors"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                      Edit Profile
                                    </button>

                                    {/* WhatsApp */}
                                    {member.phone_number && (
                                      <a
                                        href={`https://wa.me/${member.phone_number.replace(/\D/g, "").replace(/^01/, "8801")}?text=${encodeURIComponent(
                                          `Hello ${member.first_name},\n\nYour account has been created/updated at Vortex Gym. Your User ID is ${member.pin || member.phone_number}.`
                                        )}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => setActiveDropdownId(null)}
                                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-green-400 hover:bg-surfaceLight hover:text-green-300 transition-colors"
                                      >
                                        <MessageCircle className="w-4 h-4" />
                                        WhatsApp
                                      </a>
                                    )}

                                    {/* Pause */}
                                    {isOwner && (
                                      <button
                                        onClick={() => {
                                          setActiveDropdownId(null);
                                          setPauseTarget(member);
                                        }}
                                        className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-surfaceLight transition-colors ${
                                          member.is_paused ? "text-blue-400 hover:text-blue-300" : "text-text-muted hover:text-white"
                                        }`}
                                      >
                                        {member.is_paused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                                        {member.is_paused ? "Unpause" : "Pause"}
                                      </button>
                                    )}

                                    {/* Block */}
                                    {bridgeOnline && isOwner && (
                                      <button
                                        onClick={() => {
                                          setActiveDropdownId(null);
                                          handleBlockMember(member);
                                        }}
                                        disabled={blockingMemberId === member.id}
                                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-400 hover:bg-surfaceLight hover:text-red-300 transition-colors disabled:opacity-50"
                                      >
                                        {blockingMemberId === member.id ? (
                                          <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <Ban className="w-4 h-4" />
                                        )}
                                        Block Device
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && (
          <div className="px-6 py-3 border-t border-border/50 text-xs text-text-muted">
            Showing {filtered.length} of {members.length} members
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <AddMemberModal
          bridgeOnline={bridgeOnline}
          members={members}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchMembers();
            showToast("✅ Member added and pushed to device!");
          }}
          onError={(msg) => showToast(msg, "error")}
        />
      )}

      {/* Renew / Assign Package Modal */}
      {renewTarget && (
        <RenewPackageModal
          member={renewTarget}
          bridgeOnline={bridgeOnline}
          onClose={() => setRenewTarget(null)}
          onSuccess={() => {
            setRenewTarget(null);
            fetchMembers();
            showToast("✅ Package assigned and device updated!");
          }}
          onError={(msg) => showToast(msg, "error")}
        />
      )}

      {/* Pause Member Modal */}
      {pauseTarget && (
        <PauseMemberModal
          member={pauseTarget}
          onClose={() => setPauseTarget(null)}
          onSuccess={() => { setPauseTarget(null); fetchMembers(); showToast(`✅ Member ${pauseTarget.is_paused ? "unpaused" : "paused"} successfully`); }}
        />
      )}

      {/* Edit Member Modal */}
      {editTarget && (
        <EditMemberModal
          member={editTarget}
          bridgeOnline={bridgeOnline}
          onClose={() => setEditTarget(null)}
          onSuccess={() => {
            setEditTarget(null);
            fetchMembers();
            showToast("✅ Member updated successfully!");
          }}
          onError={(msg) => showToast(msg, "error")}
        />
      )}

      {/* Member Payment History Modal */}
      {historyTarget && (
        <MemberHistoryModal
          member={historyTarget}
          showToast={showToast}
          onClose={() => setHistoryTarget(null)}
        />
      )}

      {/* Clear Due Modal */}
      {clearDueTarget && (
        <ClearDueModal
          member={clearDueTarget}
          bridgeOnline={bridgeOnline}
          onClose={() => setClearDueTarget(null)}
          onSuccess={() => {
            setClearDueTarget(null);
            fetchMembers();
            showToast("✅ Due cleared! Member is now active.");
          }}
          onError={(msg) => showToast(msg, "error")}
        />
      )}

      {/* Image Full-screen Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 cursor-zoom-out"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setPreviewImage(null)} 
              className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={previewImage.src} 
              alt={previewImage.title} 
              className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-2xl border border-white/10"
            />
            {previewImage.title && (
              <p className="text-white text-sm font-semibold mt-4 bg-black/40 px-4 py-2 rounded-full border border-white/5">
                {previewImage.title}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MembersTable;
