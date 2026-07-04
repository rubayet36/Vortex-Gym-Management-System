import React, { useState } from "react";
import {
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  DollarSign,
} from "lucide-react";
import { api } from "../../../lib/api";
import { BRIDGE, getLocalDateTimeString } from "./membersUtils";

const ClearDueModal = ({ member, bridgeOnline, onClose, onSuccess, onError }) => {
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [clearing, setClearing] = useState(false);
  const totalDue = Number(member.total_due) || 0;
  const packageName = member.package_name || "Package";
  const [payAmount, setPayAmount] = useState(String(totalDue));

  const payAmountNum = Math.min(Math.max(0, Number(payAmount) || 0), totalDue);
  const remainingDue = totalDue - payAmountNum;
  const isPartial = remainingDue > 0;

  const handleClearDue = async () => {
    if (totalDue <= 0) return onError("No due amount to clear.");
    if (payAmountNum <= 0) return onError("Pay amount must be greater than 0.");
    setClearing(true);
    try {
      // Create a payment transaction record for the amount being paid now
      await api.payments.create({
        user_id: member.id,
        payment_type: isPartial ? `Partial Due (${packageName})` : `Due Clear (${packageName})`,
        package_name: packageName,
        total_amount: payAmountNum,
        paid_amount: payAmountNum,
        due_amount: 0,
        discount_amount: 0,
        payment_method: paymentMethod,
        payment_date: getLocalDateTimeString(),
      });

      // Push to device only if due is fully cleared
      if (!isPartial) {
        const pin = member.pin || member.phone_number;
        if (bridgeOnline && pin) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            await fetch(`${BRIDGE}/api/users`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                pin: String(pin),
                name: `${member.first_name} ${member.last_name || ""}`.trim(),
                cardno: member.cardno || 0,
              }),
              signal: controller.signal,
            });
            clearTimeout(timeout);
          } catch (deviceErr) {
            console.warn("Device push skipped:", deviceErr.message);
          }
        }
      }

      onSuccess();
    } catch (err) {
      onError(err.message);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 text-orange-400 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-white font-bold">Clear Due</h2>
              <p className="text-text-muted text-xs mt-0.5">
                {member.first_name} {member.last_name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Due summary */}
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 text-center">
            <p className="text-text-muted text-sm">Outstanding Due</p>
            <p className="text-3xl font-bold text-orange-400 mt-1">{totalDue} BDT</p>
            <p className="text-text-muted text-xs mt-1">{packageName}</p>
          </div>

          {/* Pay Amount Input */}
          <div>
            <label className="label">Pay Amount (BDT)</label>
            <input
              type="number"
              min="1"
              max={totalDue}
              className="input-field mt-1"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder={`Max ${totalDue}`}
            />
            {/* Remaining due preview */}
            {payAmountNum > 0 && payAmountNum < totalDue && (
              <p className="text-xs mt-1.5 text-orange-400 font-medium">
                Remaining due after this payment: <span className="font-bold">{remainingDue} BDT</span>
              </p>
            )}
            {payAmountNum >= totalDue && (
              <p className="text-xs mt-1.5 text-accent font-medium">✓ Full due will be cleared</p>
            )}
          </div>

          {/* Transaction preview */}
          <div className="bg-surfaceLight/50 border border-border rounded-xl p-3">
            <p className="text-text-muted text-xs mb-1">Transaction will be recorded as:</p>
            <p className="text-white text-sm font-semibold">
              {isPartial ? `Partial Due (${packageName})` : `Due Clear (${packageName})`}
            </p>
          </div>

          {/* Payment method */}
          <div>
            <label className="label">Payment Method</label>
            <select
              className="input-field mt-1 text-text-main"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="BKASH">bKash</option>
              <option value="NAGAD">Nagad</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="ROCKET">Rocket</option>
            </select>
          </div>

          {/* Device activation note — only show if this will fully clear the due */}
          {bridgeOnline && !isPartial && (
            <div className="flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent flex-shrink-0" />
              <span className="text-accent text-xs">Member will be activated on the ZKTeco device after clearing.</span>
            </div>
          )}
          {isPartial && payAmountNum > 0 && (
            <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
              <span className="text-yellow-400 text-xs">Partial payment — {remainingDue} BDT due will remain.</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1" disabled={clearing}>
              Cancel
            </button>
            <button
              onClick={handleClearDue}
              disabled={clearing || payAmountNum <= 0 || totalDue <= 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {clearing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {clearing ? "Processing..." : isPartial ? "Confirm Partial Payment" : "Confirm Clear Due"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClearDueModal;
