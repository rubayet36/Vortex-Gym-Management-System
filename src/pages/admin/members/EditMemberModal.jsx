import React, { useState } from "react";
import {
  Edit2,
  X,
  RefreshCw,
  CheckCircle2,
  Trash2,
  Fingerprint,
  CreditCard,
} from "lucide-react";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { BRIDGE } from "./membersUtils";

const EditMemberModal = ({ member, bridgeOnline, onClose, onSuccess, onError }) => {
  const { profile } = useAuth();
  const isOwner = profile?.role === "owner";
  const [form, setForm] = useState({
    memberId: member.member_id || "",
    firstName: member.first_name || "",
    lastName: member.last_name || "",
    phone: member.phone_number || "",
    pin: member.pin || "",
    cardno: member.cardno ? String(member.cardno) : "",
    gender: member.gender || "",
    bloodGroup: member.blood_group || "",
    address: member.address || "",
    dob: member.dob ? member.dob.split("T")[0] : "",
    occupation: member.occupation || "",
    height: member.height || "",
    weight: member.weight || "",
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(member.avatar_url ? `${member.avatar_url}` : null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim()) return onError("First name is required.");
    if (!form.phone.trim()) return onError("Phone Number is required.");
    if (!form.memberId.trim()) return onError("User ID is required.");
    setSaving(true);

    try {
      // update profile in DB
      const res = await api.profiles.update(member.id, {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        phone_number: form.phone.trim() || null,
        member_id: form.memberId.trim() || null,
        pin: form.pin.trim() || null,
        cardno: form.cardno ? parseInt(form.cardno, 10) : 0,
        gender: form.gender || null,
        blood_group: form.bloodGroup || null,
        address: form.address.trim() || null,
        dob: form.dob || null,
        occupation: form.occupation.trim() || null,
        height: form.height.trim() || null,
        weight: form.weight.trim() || null,
      });

      if (!res?.data?.updated) throw new Error("Failed to update profile");

      // upload photo if selected
      if (photoFile) {
        await api.upload.photo(member.id, photoFile);
      }

      // push updated PIN/RFID to device if bridge is online and a PIN is available (non-blocking)
      const syncPin = form.pin.trim() || member.pin || "";
      if (bridgeOnline && syncPin) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const r = await fetch(`${BRIDGE}/api/users`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pin: syncPin,
              name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
              cardno: form.cardno ? parseInt(form.cardno, 10) : 0,
            }),
            signal: controller.signal,
          });
          clearTimeout(timeout);
          const d = await r.json().catch(() => ({}));
          if (!d.success) console.warn('Device sync warning:', d.error);
        } catch (deviceErr) {
          console.warn('Device sync skipped:', deviceErr.message);
        }
      }

      onSuccess();
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to completely delete this member? This action cannot be undone.")) return;
    setSaving(true);
    try {
      // Delete from DB first
      await api.profiles.delete(member.id);

      // Delete from Device if bridge is online (non-blocking)
      if (bridgeOnline && member.pin) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4000);
          await fetch(`${BRIDGE}/api/users/${member.pin}`, {
            method: "DELETE",
            signal: controller.signal,
          });
          clearTimeout(timeout);
        } catch (deviceErr) {
          console.warn('Device delete skipped:', deviceErr.message);
        }
      }
      // Always close modal after DB delete
      onSuccess();
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-surfaceLight text-text-muted rounded-lg">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Edit Member</h2>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          <div className="flex flex-col items-center gap-3 mb-2">
            <div className="relative">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-20 h-20 rounded-full object-cover ring-2 ring-accent/30"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-2xl">
                  {form.firstName.charAt(0).toUpperCase() || "?"}
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-surface border border-border p-1.5 rounded-full cursor-pointer hover:bg-surfaceLight transition-colors">
                <Edit2 className="w-3.5 h-3.5 text-text-muted" />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setPhotoFile(file);
                      setPhotoPreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </label>
            </div>
            <p className="text-xs text-text-muted">Profile Photo</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">First Name *</label>
              <input
                type="text"
                className="input-field h-9 text-sm"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label text-xs">Last Name</label>
              <input
                type="text"
                className="input-field h-9 text-sm"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label text-xs">Phone Number *</label>
            <input
              type="tel"
              className="input-field h-9 text-sm"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="e.g. 01711234567"
              maxLength={11}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">User ID (Serial No) *</label>
              <input
                type="text"
                className="input-field h-9 text-sm border-accent/40"
                value={form.memberId}
                onChange={(e) => setForm({ ...form, memberId: e.target.value })}
                placeholder="e.g. 1001"
                required
              />
            </div>
          </div>

          {/* New Profile Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Date of Birth</label>
              <input
                type="date"
                className="input-field h-9 text-sm text-white bg-background"
                value={form.dob}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
              />
            </div>
            <div>
              <label className="label text-xs">Occupation</label>
              <input
                type="text"
                className="input-field h-9 text-sm"
                placeholder="e.g. Banker, Student"
                value={form.occupation}
                onChange={(e) => setForm({ ...form, occupation: e.target.value })}
              />
            </div>
            <div>
              <label className="label text-xs">Gender</label>
              <select
                className="input-field h-9 text-sm text-text-main"
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label text-xs">Blood Group</label>
              <select
                className="input-field h-9 text-sm text-text-main"
                value={form.bloodGroup}
                onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
              >
                <option value="">Select Blood Group</option>
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
            <div className="col-span-2">
              <label className="label text-xs">Address</label>
              <textarea
                className="input-field min-h-[50px] text-sm py-2"
                placeholder="Enter Address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
          </div>

          {/* New Physical Metrics Fields */}
          <div className="grid grid-cols-2 gap-3 bg-surfaceLight/30 border border-border/50 rounded-xl p-3">
            <h4 className="col-span-2 text-white font-bold text-xs">Physical Metrics</h4>
            <div>
              <label className="label text-xs">Height</label>
              <input
                type="text"
                className="input-field h-9 text-sm"
                placeholder="e.g. 5ft 8in or 173cm"
                value={form.height}
                onChange={(e) => setForm({ ...form, height: e.target.value })}
              />
            </div>
            <div>
              <label className="label text-xs">Weight</label>
              <input
                type="text"
                className="input-field h-9 text-sm"
                placeholder="e.g. 70 kg"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
              />
            </div>
          </div>

          <div className="bg-surfaceLight/50 border border-border rounded-xl p-4">
            <label className="label flex items-center gap-2 text-xs">
              <Fingerprint className="w-4 h-4 text-text-muted" />
              Device PIN (ZKTeco)
            </label>
            <input
              type="number"
              className="input-field h-9 text-sm mt-1"
              value={form.pin}
              onChange={(e) => setForm({ ...form, pin: e.target.value })}
              placeholder="e.g. 751 (optional)"
            />

            <label className="label flex items-center gap-2 mt-4 text-xs">
              <CreditCard className="w-4 h-4 text-text-muted" />
              RFID Card Number (Optional)
            </label>
            <input
              type="number"
              className="input-field h-9 text-sm mt-1"
              value={form.cardno}
              onChange={(e) => setForm({ ...form, cardno: e.target.value })}
              placeholder="e.g. 3687677"
            />

            <p className="text-xs text-text-muted mt-2">
              Updating the PIN or Card Number will sync this member with the ZKTeco device.
            </p>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-border mt-auto flex-shrink-0">
            {isOwner ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 border border-red-500/30 text-red-500 rounded-xl hover:bg-red-500/10 font-medium transition-colors flex items-center justify-center mr-4"
                disabled={saving}
                title="Delete Member"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            ) : (
              <div />
            )}
            <div className="flex gap-3 flex-1">
              <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={saving}>
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMemberModal;
