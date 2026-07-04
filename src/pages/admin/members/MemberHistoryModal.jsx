import React, { useState, useEffect } from "react";
import {
  X,
  RefreshCw,
  DollarSign,
  MessageCircle,
  Trash2,
  Calendar,
  User,
  Activity,
  MapPin,
  Briefcase,
} from "lucide-react";
import { api } from "../../../lib/api";
import { fmtPayDate } from "./membersUtils";

const MemberHistoryModal = ({ member, onClose, showToast }) => {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({ total_collections: 0, total_dues: 0 });
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await api.payments.list({ user_id: member.id });
        setPayments(res?.data || []);
        if (res?.summary) setSummary(res.summary);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchHistory();
  }, [member.id]);

  const handleDeletePayment = async (payId) => {
    if (!window.confirm('Are you sure you want to delete this transaction? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/payments.php?id=${payId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }
      // Refetch to update both the list AND the summary totals
      const updated = await api.payments.list({ user_id: member.id });
      setPayments(updated?.data || []);
      if (updated?.summary) setSummary(updated.summary);
      showToast('Transaction deleted successfully');
    } catch (e) {
      console.error('Failed to delete payment', e);
      showToast('Failed to delete transaction: ' + e.message, 'error');
    }
  };

  const handleWhatsApp = (pay) => {
    let phone = member.phone_number;
    if (!phone) { alert("Member has no phone number"); return; }

    const pkgName = pay.package_name || "Custom/Unknown Package";
    const date = fmtPayDate(pay.payment_date);
    const msg = `Hello ${member.first_name},\n\nYour payment of ${Number(pay.paid_amount)} BDT for ${pkgName} was successful on ${date}.\n\nThank you for choosing Vortex Gym!`;

    // format phone with country code (no plus sign for wa.me)
    phone = phone.replace(/\D/g, "");
    if (phone.length === 11 && phone.startsWith("01")) {
      phone = "88" + phone;
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {member.avatar_url ? (
              <img
                src={`${member.avatar_url}`}
                alt={member.first_name}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-accent/30 cursor-zoom-in hover:opacity-85 transition-opacity"
                onClick={() => setPreviewImage({ src: member.avatar_url, title: `${member.first_name} ${member.last_name}` })}
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-lg">
                {(member.first_name || "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-white font-bold text-lg">{member.first_name} {member.last_name}</h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  Number(member.total_due) > 0 ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" : "bg-accent/20 text-accent border border-accent/30"
                }`}>
                  {Number(member.total_due) > 0 ? "HAS DUE" : "ACTIVE"}
                </span>
              </div>
              <p className="text-text-muted text-xs mt-0.5">
                {member.phone_number || "No Phone"} • Member ID: {member.member_id || "—"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body with Left column (Profile) and Right column (Payments) */}
        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row gap-5 p-5 custom-scrollbar min-h-0">
          
          {/* Left Column: Member Profile Card */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
            
            {/* Personal Info Box */}
            <div className="bg-surfaceLight/40 border border-border rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                <User className="w-4 h-4 text-accent" />
                <h3 className="text-white font-bold text-sm">Profile Details</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-text-muted">User ID (Serial No)</p>
                  <p className="text-white font-semibold mt-0.5">{member.member_id || "—"}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-text-muted">Device PIN</p>
                    <p className="text-white font-semibold mt-0.5">{member.pin || "Not Assigned"}</p>
                  </div>
                  <div>
                    <p className="text-text-muted">RFID Card</p>
                    <p className="text-white font-semibold mt-0.5">{member.cardno && member.cardno !== "0" ? member.cardno : "No Card"}</p>
                  </div>
                </div>
                <div className="border-t border-border/20 pt-2.5" />
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-text-muted">Gender</p>
                    <p className="text-white capitalize mt-0.5">{member.gender || "—"}</p>
                  </div>
                  <div>
                    <p className="text-text-muted">Blood Group</p>
                    <p className="text-white mt-0.5">{member.blood_group || "—"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-text-muted">Date of Birth</p>
                  <p className="text-white font-semibold mt-0.5">
                    {member.dob ? new Date(member.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : "—"}
                  </p>
                </div>

                <div>
                  <p className="text-text-muted">Occupation</p>
                  <p className="text-white font-semibold mt-0.5">{member.occupation || "—"}</p>
                </div>
              </div>
            </div>

            {/* Physical Metrics Box */}
            <div className="bg-surfaceLight/40 border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                <Activity className="w-4 h-4 text-accent" />
                <h3 className="text-white font-bold text-sm">Physical Health</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-text-muted">Height</p>
                  <p className="text-white font-semibold mt-0.5">{member.height || "—"}</p>
                </div>
                <div>
                  <p className="text-text-muted">Weight</p>
                  <p className="text-white font-semibold mt-0.5">{member.weight || "—"}</p>
                </div>
              </div>
            </div>

            {/* Address Box */}
            <div className="bg-surfaceLight/40 border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                <MapPin className="w-4 h-4 text-accent" />
                <h3 className="text-white font-bold text-sm">Address</h3>
              </div>
              <p className="text-xs text-white leading-relaxed whitespace-pre-wrap">
                {member.address || "No address recorded."}
              </p>
            </div>
          </div>

          {/* Right Column: Financial Summary & Payments */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {/* Financial Summary Cards */}
            <div className="grid grid-cols-3 gap-3 flex-shrink-0">
              <div className="bg-surfaceLight rounded-xl p-3 border border-border">
                <p className="text-text-muted text-[10px] uppercase tracking-wider font-semibold">Total Paid</p>
                <p className="text-lg font-bold text-secondary mt-1">{summary.total_collections} BDT</p>
              </div>
              <div className="bg-surfaceLight rounded-xl p-3 border border-border">
                <p className="text-text-muted text-[10px] uppercase tracking-wider font-semibold">Outstanding Due</p>
                <p className="text-lg font-bold text-primary mt-1">{summary.total_dues} BDT</p>
              </div>
              <div className="bg-surfaceLight rounded-xl p-3 border border-border">
                <p className="text-text-muted text-[10px] uppercase tracking-wider font-semibold">Transactions</p>
                <p className="text-lg font-bold text-white mt-1">{payments.length}</p>
              </div>
            </div>

            {/* Payments Table */}
            <div className="flex-1 bg-surfaceLight/20 border border-border rounded-xl overflow-hidden flex flex-col min-h-[300px]">
              <div className="p-3.5 border-b border-border bg-surfaceLight/30 flex items-center justify-between">
                <span className="text-white font-bold text-xs uppercase tracking-wider">Payments & Subscriptions History</span>
              </div>
              
              <div className="flex-1 overflow-auto custom-scrollbar">
                {loading ? (
                  <div className="p-12 text-center text-text-muted">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-accent" />
                    Loading history...
                  </div>
                ) : payments.length === 0 ? (
                  <div className="p-12 text-center text-text-muted">
                    <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p>No payment records found for this member.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead className="sticky top-0 bg-surfaceLight/90 backdrop-blur border-b border-border text-text-muted text-xs uppercase tracking-wider z-10">
                      <tr>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Type / Package</th>
                        <th className="px-4 py-3 font-medium text-right">Total</th>
                        <th className="px-4 py-3 font-medium text-right">Discount</th>
                        <th className="px-4 py-3 font-medium text-right text-secondary">Paid</th>
                        <th className="px-4 py-3 font-medium text-right text-primary">Due</th>
                        <th className="px-4 py-3 font-medium text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {payments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-surfaceLight/10 transition-colors">
                          <td className="px-4 py-3.5 text-xs text-text-muted">
                            {fmtPayDate(pay.payment_date)}
                          </td>
                          <td className="px-4 py-3.5 flex flex-col min-w-[150px]">
                            <span className="text-xs text-white font-medium">{pay.payment_type}</span>
                            {pay.package_name && <span className="text-[10px] text-accent font-medium mt-0.5">{pay.package_name}</span>}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-white font-medium text-right">{Number(pay.total_amount).toFixed(0)}</td>
                          <td className="px-4 py-3.5 text-xs font-medium text-yellow-500/80 text-right">{Number(pay.discount_amount || 0).toFixed(0)}</td>
                          <td className="px-4 py-3.5 text-xs font-bold text-secondary text-right">{Number(pay.paid_amount).toFixed(0)}</td>
                          <td className="px-4 py-3.5 text-xs font-bold text-primary text-right">{Number(pay.due_amount).toFixed(0)}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex justify-center items-center gap-1.5">
                              <button
                                onClick={() => handleWhatsApp(pay)}
                                className="bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white p-1.5 rounded-lg transition-colors"
                                title="Send WhatsApp Receipt"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeletePayment(pay.id)}
                                className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white p-1.5 rounded-lg transition-colors"
                                title="Delete Transaction"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
      </div>

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
  </div>
);
};

export default MemberHistoryModal;
