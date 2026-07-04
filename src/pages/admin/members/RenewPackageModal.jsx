import React, { useState, useEffect } from "react";
import {
  X,
  RefreshCw,
  CheckCircle2,
  RotateCcw,
  Calendar,
  Package,
  WifiOff,
} from "lucide-react";
import { api } from "../../../lib/api";
import { BRIDGE, PACKAGE_OPTIONS, getLocalDateString } from "./membersUtils";

const RenewPackageModal = ({ member, bridgeOnline, onClose, onSuccess, onError }) => {
  const [packages, setPackages] = useState([]);
  const [selectedPkgId, setSelectedPkgId] = useState(null);
  const [customPkgName, setCustomPkgName] = useState("");
  const [customPkgPrice, setCustomPkgPrice] = useState("");
  const [customPkgDuration, setCustomPkgDuration] = useState("");
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(getLocalDateString());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.packages.list().then((res) => {
      const pkgs = res?.data?.length
        ? res.data
        : PACKAGE_OPTIONS.map((p, i) => ({ id: String(i + 1), name: p.label, duration_days: p.days }));
      setPackages(pkgs);
      setSelectedPkgId(pkgs[0]?.id);
    }).catch(() => {
      const pkgs = PACKAGE_OPTIONS.map((p, i) => ({ id: String(i + 1), name: p.label, duration_days: p.days }));
      setPackages(pkgs);
      setSelectedPkgId(pkgs[0]?.id);
    });
  }, []);

  const selectedPkg = selectedPkgId === 'custom'
    ? { id: 'custom', name: customPkgName || 'Custom Package', duration_days: Number(customPkgDuration) || 0, price: Number(customPkgPrice) || 0 }
    : packages.find((p) => p.id === selectedPkgId);

  const expiryDate = selectedPkg
    ? (() => {
        // Parse startDate components to avoid UTC midnight off-by-one (BUG-9)
        const [sy, sm, sd] = startDate.split('-').map(Number);
        const d = new Date(sy, sm - 1, sd);
        d.setDate(d.getDate() + selectedPkg.duration_days);
        return getLocalDateString(d);
      })()
    : null;

  const totalAfterDiscount = selectedPkg ? Math.max(0, (selectedPkg.price || 0) - Number(discount || 0)) : 0;
  const due = Math.max(0, totalAfterDiscount - Number(paidAmount || totalAfterDiscount));

  const handleRenew = async () => {
    if (!selectedPkg) return onError('Please select a package.');
    setSaving(true);
    try {
      // 0.5 Handle custom package creation (user-specific)
      let finalPackageId = selectedPkg.id;
      if (finalPackageId === 'custom') {
        const customRes = await api.packages.create({
          name: customPkgName || `Custom (${member.first_name})`,
          price: Number(customPkgPrice) || 0,
          duration_days: Number(customPkgDuration) || 0,
          is_custom: true,
          created_for_user_id: member.id,
        });
        if (!customRes?.data?.id) throw new Error('Failed to create custom package');
        finalPackageId = customRes.data.id;
      }

      // 1. Create new subscription (API handles expiring old one)
      const effectivePaid = paidAmount !== "" ? Number(paidAmount) : totalAfterDiscount;
      // Build payment_date as a full datetime string using the chosen date + current time
      const now = new Date();
      const paymentDateStr = `${paymentDate} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
      const subRes = await api.subscriptions.create({
        user_id: member.id,
        package_id: finalPackageId,
        start_date: startDate,
        discount: Number(discount || 0),
        paymentMethod,
        paid_amount_override: effectivePaid,
        due_amount_override: Math.max(0, totalAfterDiscount - effectivePaid),
        payment_date: paymentDateStr,
      });
      if (!subRes?.data?.id) throw new Error('Subscription renewal failed');

      // 2. Push to device (non-blocking — 5s timeout, failure is just a warning)
      if (bridgeOnline && member.pin) {
        try {
          const controller = new AbortController();
          const t = setTimeout(() => controller.abort(), 5000);
          const r = await fetch(`${BRIDGE}/api/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pin: member.pin,
              memberId: member.member_id,
              name: `${member.first_name} ${member.last_name || ""}`.trim(),
              cardno: member.cardno || 0,
              phone: member.phone_number,
              packageName: selectedPkg?.name || "",
              duration: selectedPkg?.duration_days || 0,
              expiryDate: expiryDate,
              isRenewal: true,
              dueAmount: due,
              skipDevicePush: due > 0,
            }),
            signal: controller.signal,
          });
          clearTimeout(t);
          const d = await r.json().catch(() => ({}));
          if (!d.success) console.warn('Device push warning:', d.error);
        } catch (deviceErr) {
          console.warn('Device push skipped:', deviceErr.message);
        }
      }

      // Always close modal — device failures are warnings only
      onSuccess();
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const fullName = `${member.first_name || ""} ${member.last_name || ""}`.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl max-h-[92vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-surface z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/20 text-accent rounded-lg">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-white font-bold">Renew / Assign Package</h2>
              <p className="text-text-muted text-xs mt-0.5">{fullName} · ID: {member.member_id || member.pin || "—"}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="label">Select Package</label>
            <div className="grid grid-cols-2 gap-2">
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => { setSelectedPkgId(pkg.id); setPaidAmount(""); }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedPkgId === pkg.id
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-surfaceLight text-text-muted hover:border-accent/50 hover:text-white"
                  }`}
                >
                  <Package className="w-4 h-4 mb-1" />
                  <p className="font-semibold text-sm">{pkg.name}</p>
                  <p className="text-xs opacity-70 flex justify-between">
                    <span>{pkg.duration_days} days</span>
                    <span className="font-semibold">{pkg.price || 0} BDT</span>
                  </p>
                </button>
              ))}
              {/* Custom Package Option */}
              <button
                type="button"
                onClick={() => setSelectedPkgId('custom')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedPkgId === 'custom'
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-surfaceLight text-text-muted hover:border-accent/50 hover:text-white"
                }`}
              >
                <Package className="w-4 h-4 mb-1" />
                <p className="font-semibold text-sm">Custom Package</p>
                <p className="text-xs opacity-70 mt-1">Create on the fly</p>
              </button>
            </div>
          </div>

          {/* Custom Package Inputs */}
          {selectedPkgId === 'custom' && (
            <div className="grid grid-cols-3 gap-3 bg-accent/5 border border-accent/20 p-4 rounded-xl">
              <div className="col-span-3">
                <label className="label text-xs">Package Name</label>
                <input type="text" className="input-field h-9 text-sm" value={customPkgName}
                  onChange={(e) => setCustomPkgName(e.target.value)} placeholder="e.g. 15 Days Special" />
              </div>
              <div>
                <label className="label text-xs">Price (BDT)</label>
                <input type="number" className="input-field h-9 text-sm" value={customPkgPrice}
                  onChange={(e) => { setCustomPkgPrice(e.target.value); setPaidAmount(""); }} placeholder="0" min="0" />
              </div>
              <div>
                <label className="label text-xs">Duration (Days)</label>
                <input type="number" className="input-field h-9 text-sm" value={customPkgDuration}
                  onChange={(e) => setCustomPkgDuration(e.target.value)} placeholder="15" min="1" />
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input type="date" lang="en-GB" className="input-field" value={startDate}
                onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="label">New Expiry</label>
              <div className="input-field flex items-center gap-2 bg-surfaceLight cursor-not-allowed">
                <Calendar className="w-4 h-4 text-accent" />
                <span className="text-white">{expiryDate ? new Date(expiryDate + "T00:00:00").toLocaleDateString('en-GB') : "—"}</span>
              </div>
            </div>
          </div>

          {/* Payment Date (backdating support) */}
          <div className="rounded-xl border border-border/60 bg-surfaceLight/25 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Payment Date
            </p>
            <input
              type="date"
              lang="en-GB"
              className="input-field w-full bg-background"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
            {paymentDate !== getLocalDateString() && (
              <p className="mt-1.5 text-xs text-yellow-400">
                ⚠️ Payment will be recorded on{" "}
                {new Date(paymentDate + "T00:00:00").toLocaleDateString('en-GB')} (backdated)
              </p>
            )}
          </div>

          {/* Payment Section */}
          <div className="bg-surfaceLight/50 border border-border rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-white">Payment Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Discount (BDT)</label>
                <input type="number" className="input-field h-9" value={discount}
                  onChange={(e) => { setDiscount(e.target.value); setPaidAmount(""); }}
                  placeholder="0" min="0" />
              </div>
              <div>
                <label className="label text-xs">Payment Method</label>
                <select className="input-field h-9 text-sm text-text-main" value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="BKASH">bKash</option>
                  <option value="NAGAD">Nagad</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="ROCKET">Rocket</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Total After Discount</label>
                <div className="input-field h-9 flex items-center text-white font-bold bg-surfaceLight cursor-default">
                  {totalAfterDiscount} BDT
                </div>
              </div>
              <div>
                <label className="label text-xs">Amount Paid Now</label>
                <input type="number" className="input-field h-9"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder={`${totalAfterDiscount} (full)`}
                  min="0" max={totalAfterDiscount} />
              </div>
            </div>
            {due > 0 && (
              <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <span className="text-red-400 text-sm font-medium">Due Amount</span>
                <span className="text-red-400 font-bold">{due} BDT</span>
              </div>
            )}
          </div>

          {!bridgeOnline && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs rounded-lg px-3 py-2 flex items-center gap-2">
              <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
              Bridge offline. Package will be saved to DB. Device access restored on next sync.
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1" disabled={saving}>
              Cancel
            </button>
            <button
              onClick={handleRenew}
              disabled={saving || !selectedPkg}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {saving ? "Saving..." : "Confirm Renewal"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RenewPackageModal;
