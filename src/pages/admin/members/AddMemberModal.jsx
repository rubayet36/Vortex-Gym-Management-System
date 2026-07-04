import React, { useState, useEffect } from "react";
import {
  Plus,
  X,
  RefreshCw,
  Fingerprint,
  Calendar,
  Package,
  AlertCircle,
  Zap,
} from "lucide-react";
import { api } from "../../../lib/api";
import { BRIDGE, PACKAGE_OPTIONS, getLocalDateString } from "./membersUtils";

// --- Separate Sub-Modal for Selecting a Package ---
const PackageSelectModal = ({
  packages,
  selectedPkgId,
  customPkgName,
  customPkgPrice,
  customPkgDuration,
  onSelect,
  onClose,
}) => {
  const [localPkgId, setLocalPkgId] = useState(selectedPkgId);
  const [localCustomName, setLocalCustomName] = useState(customPkgName || "");
  const [localCustomPrice, setLocalCustomPrice] = useState(customPkgPrice || "");
  const [localCustomDuration, setLocalCustomDuration] = useState(customPkgDuration || "");

  const handleConfirm = () => {
    if (localPkgId === "custom" && !localCustomName.trim()) {
      alert("Please enter a custom package name.");
      return;
    }
    onSelect({
      packageId: localPkgId,
      customPkgName: localCustomName,
      customPkgPrice: localCustomPrice,
      customPkgDuration: localCustomDuration,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-accent" />
            <h3 className="text-white font-bold text-lg">Select Package</h3>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 gap-2">
            {packages.map((pkg) => (
              <button
                key={pkg.id}
                type="button"
                onClick={() => setLocalPkgId(pkg.id)}
                className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                  localPkgId === pkg.id
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-surfaceLight text-text-muted hover:border-accent/50 hover:text-white"
                }`}
              >
                <div>
                  <p className="font-semibold text-sm text-white">{pkg.name}</p>
                  <p className="text-xs opacity-75 mt-0.5">{pkg.duration_days} Days</p>
                </div>
                <span className="font-bold text-sm text-white">{pkg.price || 0} BDT</span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => setLocalPkgId("custom")}
              className={`p-4 rounded-xl border text-left transition-all flex flex-col gap-2 ${
                localPkgId === "custom"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-surfaceLight text-text-muted hover:border-accent/50 hover:text-white"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-semibold text-sm text-white">Custom Package</span>
                <span className="text-xs opacity-75">Define on the fly</span>
              </div>
            </button>
          </div>

          {localPkgId === "custom" && (
            <div className="grid grid-cols-3 gap-3 bg-accent/5 border border-accent/20 p-4 rounded-xl mt-2 fade-in">
              <div className="col-span-3">
                <label className="label text-xs">Package Name</label>
                <input
                  type="text"
                  className="input-field h-9 text-sm"
                  value={localCustomName}
                  onChange={(e) => setLocalCustomName(e.target.value)}
                  placeholder="e.g. 15 Days Special"
                  required
                />
              </div>
              <div>
                <label className="label text-xs">Price (BDT)</label>
                <input
                  type="number"
                  className="input-field h-9 text-sm"
                  value={localCustomPrice}
                  onChange={(e) => setLocalCustomPrice(e.target.value)}
                  placeholder="0"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="label text-xs">Duration (Days)</label>
                <input
                  type="number"
                  className="input-field h-9 text-sm"
                  value={localCustomDuration}
                  onChange={(e) => setLocalCustomDuration(e.target.value)}
                  placeholder="15"
                  min="1"
                  required
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-border flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="button" onClick={handleConfirm} className="btn-primary flex-1">
            Confirm Selection
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main AddMemberModal Component ---
const AddMemberModal = ({ bridgeOnline, members = [], onClose, onSuccess, onError }) => {
  const [form, setForm] = useState({
    memberId: "",
    firstName: "",
    lastName: "",
    phone: "",
    cardno: "",
    gender: "",
    bloodGroup: "",
    packageId: "",
    customPkgName: "",
    customPkgPrice: "",
    customPkgDuration: "",
    startDate: getLocalDateString(),
    paymentDate: getLocalDateString(),
    discount: 0,
    paidAmount: "",
    paymentMethod: "CASH",
    address: "",
    dob: "",
    occupation: "",
    height: "",
    weight: "",
  });
  const [nextPin, setNextPin] = useState(null);
  const [loadingPin, setLoadingPin] = useState(true);
  const [saving, setSaving] = useState(false);
  const [packages, setPackages] = useState([]);
  const [showPkgSelectModal, setShowPkgSelectModal] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Duplicate detection
  const dupUserId = form.memberId.trim()
    ? members.find((m) => String(m.member_id || "").toLowerCase() === form.memberId.trim().toLowerCase())
    : null;
  const dupPhone = form.phone.trim()
    ? members.find((m) => (m.phone_number || "").replace(/\s/g, "") === form.phone.trim().replace(/\s/g, ""))
    : null;
  const dupPin = form.customPin && form.customPin.trim()
    ? members.find((m) => String(m.pin || "") === form.customPin.trim())
    : null;
  const hasDuplicates = !!(dupUserId || dupPhone || dupPin);

  useEffect(() => {
    // Fetch packages from DB
    api.packages.list().then((res) => {
      const data = res?.data || [];
      if (data.length > 0) {
        setPackages(data);
        if (!form.packageId) setForm(f => ({ ...f, packageId: data[0].id }));
      } else {
        const pkgs = PACKAGE_OPTIONS.map((p, i) => ({ id: String(i + 1), name: p.label, duration_days: p.days, price: 0 }));
        setPackages(pkgs);
        if (!form.packageId) setForm(f => ({ ...f, packageId: pkgs[0].id }));
      }
    }).catch(() => {
      const pkgs = PACKAGE_OPTIONS.map((p, i) => ({ id: String(i + 1), name: p.label, duration_days: p.days, price: 0 }));
      setPackages(pkgs);
      if (!form.packageId) setForm(f => ({ ...f, packageId: pkgs[0].id }));
    });

    // Fetch next PIN from bridge
    if (bridgeOnline) {
      fetch(`${BRIDGE}/api/latest-pin`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.nextPin) {
            setNextPin(d.nextPin);
            setForm((f) => ({ ...f, customPin: String(d.nextPin) }));
          }
        })
        .catch(() => setNextPin(null))
        .finally(() => setLoadingPin(false));
    } else {
      setLoadingPin(false);
    }
  }, [bridgeOnline]);

  const selectedPackage = form.packageId === 'custom'
    ? { id: 'custom', name: form.customPkgName || 'Custom Package', duration_days: Number(form.customPkgDuration) || 0, price: Number(form.customPkgPrice) || 0 }
    : packages.find((p) => p.id === form.packageId) || packages[0];

  const expiryDate = selectedPackage
    ? (() => {
        const d = new Date(form.startDate);
        d.setDate(d.getDate() + selectedPackage.duration_days);
        return getLocalDateString(d);
      })()
    : "—";

  const totalCost = selectedPackage ? Math.max(0, (selectedPackage.price || 0) - (Number(form.discount) || 0)) : 0;
  const addMemberDue = Math.max(0, totalCost - (form.paidAmount !== "" ? Number(form.paidAmount) : totalCost));

  const handleSelectPackage = (pkgData) => {
    setForm((f) => ({
      ...f,
      packageId: pkgData.packageId,
      customPkgName: pkgData.customPkgName,
      customPkgPrice: pkgData.customPkgPrice,
      customPkgDuration: pkgData.customPkgDuration,
      paidAmount: "", // Reset paid amount so it defaults to new price
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim()) return onError('First name is required.');
    if (!form.phone.trim()) return onError('Phone Number is required.');
    if (!selectedPackage) return onError('Please select a package.');
    if (hasDuplicates) return onError('Please resolve duplicate fields before saving.');

    setSaving(true);
    try {
      const pin = form.customPin ? String(form.customPin) : null;
      const memberId = form.memberId ? String(form.memberId).trim() : null;
      if (!memberId) throw new Error("User ID is required.");

      const fullEmail = `user_${memberId}@gym.local`;
      const password = `GymPass!${memberId || Date.now()}`;

      // 1. Create profile via PHP API
      const profileRes = await api.profiles.create({
        email: fullEmail,
        password,
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        phone_number: form.phone.trim() || null,
        member_id: memberId,
        pin: pin || null,
        cardno: form.cardno ? parseInt(form.cardno, 10) : 0,
        gender: form.gender || null,
        blood_group: form.bloodGroup || null,
        role: 'member',
        address: form.address.trim() || null,
        dob: form.dob || null,
        occupation: form.occupation.trim() || null,
        height: form.height.trim() || null,
        weight: form.weight.trim() || null,
      });
      if (!profileRes?.data?.id) throw new Error('Profile creation failed');
      const userId = profileRes.data.id;

      // Upload photo if selected
      if (photoFile) {
        try {
          await api.upload.photo(userId, photoFile);
        } catch (uploadErr) {
          console.warn('Photo upload warning:', uploadErr.message);
        }
      }

      // 1.5 Handle custom package creation (user-specific - not global)
      let finalPackageId = selectedPackage.id;
      if (finalPackageId === 'custom') {
        const customRes = await api.packages.create({
          name: form.customPkgName || `Custom (${form.firstName.trim()})`,
          price: Number(form.customPkgPrice) || 0,
          duration_days: Number(form.customPkgDuration) || 0,
          is_custom: true,
          created_for_user_id: userId,
        });
        if (!customRes?.data?.id) throw new Error('Failed to create custom package');
        finalPackageId = customRes.data.id;
      }

      // 2. Create subscription
      const effectivePaid = form.paidAmount !== "" ? Number(form.paidAmount) : totalCost;
      const dueToPay = Math.max(0, totalCost - effectivePaid);
      // Build payment_date as a full datetime string using the chosen date + current time
      const now = new Date();
      const paymentDateStr = `${form.paymentDate} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

      const subRes = await api.subscriptions.create({
        user_id: userId,
        package_id: finalPackageId,
        start_date: form.startDate,
        discount: Number(form.discount) || 0,
        paymentMethod: form.paymentMethod,
        paid_amount_override: effectivePaid,
        due_amount_override: dueToPay,
        payment_date: paymentDateStr,
      });
      if (!subRes?.data?.id) throw new Error('Subscription creation failed');

      // 3. Push to ZKTeco device (with skip flag if member has outstanding dues)
      if (bridgeOnline && pin) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const res = await fetch(`${BRIDGE}/api/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pin,
              memberId,
              name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
              cardno: form.cardno ? parseInt(form.cardno, 10) : 0,
              phone: form.phone.trim(),
              packageName: selectedPackage?.name || "",
              duration: selectedPackage?.duration_days || 0,
              dueAmount: dueToPay,
              skipDevicePush: dueToPay > 0,
            }),
            signal: controller.signal,
          });
          clearTimeout(timeout);
          const devData = await res.json().catch(() => ({}));
          if (!devData.success) {
            console.warn('Device sync warning:', devData.error);
          }
        } catch (deviceErr) {
          console.warn('Device sync skipped:', deviceErr.message);
        }
      }

      // Always close on success (device failures are warnings only)
      onSuccess();
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-surface border border-border rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/20 text-accent rounded-lg">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">Add New Member</h2>
                <p className="text-text-muted text-xs mt-0.5">Register member profile and assign membership details</p>
              </div>
            </div>
            <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 custom-scrollbar flex flex-col justify-between min-h-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              
              {/* Left Column: Personal Profile & Metrics */}
              <div className="space-y-4">
                {/* Duplicate Warnings Banner inside Left Column */}
                {hasDuplicates && (
                  <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/8 p-3 space-y-1">
                    {dupUserId && (
                      <p className="flex items-center gap-2 text-xs font-medium text-yellow-400">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        User ID <span className="font-bold">{form.memberId}</span> is already used by{" "}
                        <span className="font-bold">{dupUserId.first_name} {dupUserId.last_name}</span>.
                      </p>
                    )}
                    {dupPhone && (
                      <p className="flex items-center gap-2 text-xs font-medium text-yellow-400">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        Phone <span className="font-bold">{form.phone}</span> is already used by{" "}
                        <span className="font-bold">{dupPhone.first_name} {dupPhone.last_name}</span>.
                      </p>
                    )}
                    {dupPin && (
                      <p className="flex items-center gap-2 text-xs font-medium text-yellow-400">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        Device PIN <span className="font-bold">{form.customPin}</span> is already used by{" "}
                        <span className="font-bold">{dupPin.first_name} {dupPin.last_name}</span>.
                      </p>
                    )}
                  </div>
                )}

                {/* Profile Photo Uploader */}
                <div className="flex flex-col items-center gap-3 bg-surfaceLight/30 border border-border/50 rounded-2xl p-4">
                  <div className="relative">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-20 h-20 rounded-full object-cover ring-2 ring-accent/30"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-2xl">
                        {form.firstName ? form.firstName.charAt(0).toUpperCase() : "?"}
                      </div>
                    )}
                    <label className="absolute bottom-0 right-0 bg-surface border border-border p-1.5 rounded-full cursor-pointer hover:bg-surfaceLight transition-colors">
                      <Plus className="w-3.5 h-3.5 text-text-muted" />
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
                  <p className="text-xs text-text-muted">Upload Member Photo</p>
                </div>

                {/* Section 1: Member Profile */}
                <div className="bg-surfaceLight/30 border border-border/50 rounded-2xl p-4 space-y-3">
                  <h3 className="text-white font-bold text-xs uppercase tracking-wider text-accent border-b border-border/30 pb-1.5">1. Member Profile</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">First Name *</label>
                      <input
                        type="text"
                        className="input-field h-9 text-sm"
                        value={form.firstName}
                        onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                        placeholder="First Name"
                        required
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Last Name</label>
                      <input
                        type="text"
                        className="input-field h-9 text-sm"
                        value={form.lastName}
                        onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                        placeholder="Last Name"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="label text-xs">Phone Number *</label>
                      <input
                        type="tel"
                        className={`input-field h-9 text-sm ${dupPhone ? "border-yellow-500/70 bg-yellow-500/5" : ""}`}
                        placeholder="e.g. 01711234567"
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                        maxLength={11}
                        required
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Date of Birth</label>
                      <input
                        type="date"
                        className="input-field h-9 text-sm text-white bg-background"
                        value={form.dob}
                        onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Occupation</label>
                      <input
                        type="text"
                        placeholder="e.g. Student, Banker"
                        className="input-field h-9 text-sm"
                        value={form.occupation}
                        onChange={(e) => setForm((f) => ({ ...f, occupation: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Gender</label>
                      <select
                        className="input-field h-9 text-sm text-text-main"
                        value={form.gender}
                        onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
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
                        onChange={(e) => setForm((f) => ({ ...f, bloodGroup: e.target.value }))}
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
                        placeholder="Enter full address..."
                        value={form.address}
                        onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Physical Metrics */}
                <div className="bg-surfaceLight/30 border border-border/50 rounded-2xl p-4 space-y-3">
                  <h3 className="text-white font-bold text-xs uppercase tracking-wider text-accent border-b border-border/30 pb-1.5">2. Physical Metrics</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">Height</label>
                      <input
                        type="text"
                        placeholder="e.g. 5ft 8in or 173cm"
                        className="input-field h-9 text-sm"
                        value={form.height}
                        onChange={(e) => setForm((f) => ({ ...f, height: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Weight</label>
                      <input
                        type="text"
                        placeholder="e.g. 72 kg"
                        className="input-field h-9 text-sm"
                        value={form.weight}
                        onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Access, Package & Finance */}
              <div className="space-y-4">
                
                {/* Section 3: Access Credentials */}
                <div className="bg-surfaceLight/30 border border-border/50 rounded-2xl p-4 space-y-3">
                  <h3 className="text-white font-bold text-xs uppercase tracking-wider text-accent border-b border-border/30 pb-1.5">3. Access Credentials</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">User ID (Serial No) *</label>
                      <input
                        type="text"
                        className={`input-field h-9 text-sm ${dupUserId ? "border-yellow-500/70 bg-yellow-500/5" : "border-accent/40"}`}
                        value={form.memberId}
                        onChange={(e) => setForm((f) => ({ ...f, memberId: e.target.value }))}
                        placeholder="e.g. 1001"
                        required
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Device PIN (ZKTeco)</label>
                      <input
                        type="number"
                        placeholder={loadingPin ? "Fetching..." : "Optional PIN"}
                        value={form.customPin || ""}
                        onChange={(e) => setForm((f) => ({ ...f, customPin: e.target.value }))}
                        className={`input-field h-9 text-sm ${dupPin ? "border-yellow-500/70 bg-yellow-500/5" : ""}`}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="label text-xs">RFID Card Number (Optional)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="input-field h-9 text-sm"
                        placeholder="0 = no card"
                        value={form.cardno}
                        onChange={(e) => setForm((f) => ({ ...f, cardno: e.target.value.replace(/\D/g, "") }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Package Assignment */}
                <div className="bg-surfaceLight/30 border border-border/50 rounded-2xl p-4 space-y-3">
                  <h3 className="text-white font-bold text-xs uppercase tracking-wider text-accent border-b border-border/30 pb-1.5">4. Package Assignment</h3>
                  <div>
                    <label className="label text-xs">Membership Package *</label>
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-surfaceLight/60 mt-1">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-accent/20 flex items-center justify-center text-accent">
                          <Package className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-white">{selectedPackage?.name}</p>
                          <p className="text-xs text-text-muted mt-0.5">
                            {selectedPackage?.duration_days} Days · {selectedPackage?.price} BDT
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPkgSelectModal(true)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-accent/30 text-accent hover:bg-accent/10 hover:text-white transition-all"
                      >
                        Select Package
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">Start Date</label>
                      <input
                        type="date"
                        lang="en-GB"
                        className="input-field h-9 text-sm"
                        value={form.startDate}
                        onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Expiry Date</label>
                      <div className="input-field h-9 text-sm flex items-center gap-2 text-text-muted bg-surfaceLight cursor-not-allowed">
                        <Calendar className="w-4 h-4 text-accent" />
                        <span className="text-white">{expiryDate !== "—" ? new Date(expiryDate + "T00:00:00").toLocaleDateString('en-GB') : "—"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 5: Financials */}
                <div className="bg-surfaceLight/30 border border-border/50 rounded-2xl p-4 space-y-3">
                  <h3 className="text-white font-bold text-xs uppercase tracking-wider text-accent border-b border-border/30 pb-1.5">5. Financial & Payment</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">Discount (BDT)</label>
                      <input
                        type="number"
                        className="input-field h-9 text-sm bg-background"
                        value={form.discount}
                        onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value, paidAmount: "" }))}
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Payment Method</label>
                      <select
                        className="input-field h-9 text-sm text-text-main"
                        value={form.paymentMethod}
                        onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                      >
                        <option value="CASH">Cash</option>
                        <option value="CARD">Card</option>
                        <option value="BKASH">bKash</option>
                        <option value="NAGAD">Nagad</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="ROCKET">Rocket</option>
                      </select>
                    </div>
                    <div>
                      <label className="label text-xs">Total After Discount</label>
                      <div className="input-field h-9 text-sm flex items-center text-accent font-bold bg-surfaceLight cursor-default">
                        {totalCost} BDT
                      </div>
                    </div>
                    <div>
                      <label className="label text-xs">Amount Paid Now</label>
                      <input
                        type="number"
                        className="input-field h-9 text-sm bg-background"
                        value={form.paidAmount}
                        onChange={(e) => setForm((f) => ({ ...f, paidAmount: e.target.value }))}
                        placeholder={`${totalCost} (full)`}
                        min="0"
                        max={totalCost}
                      />
                    </div>
                    {addMemberDue > 0 && (
                      <div className="col-span-2 flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                        <span className="text-red-400 text-sm font-medium">Due Amount</span>
                        <span className="text-red-400 font-bold">{addMemberDue} BDT</span>
                      </div>
                    )}
                    {addMemberDue > 0 && (
                      <div className="col-span-2 flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                        <AlertCircle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                        <span className="text-yellow-400 text-xs">Member will NOT be added to the device until due is cleared.</span>
                      </div>
                    )}
                  </div>

                  {/* Payment Date */}
                  <div className="pt-2">
                    <label className="label text-xs">Payment Date (Backdating)</label>
                    <input
                      type="date"
                      lang="en-GB"
                      className="input-field h-9 text-sm"
                      value={form.paymentDate}
                      onChange={(e) => setForm((f) => ({ ...f, paymentDate: e.target.value }))}
                    />
                    {form.paymentDate !== getLocalDateString() && (
                      <p className="mt-1 text-[11px] text-yellow-400">
                        ⚠️ Recorded on {new Date(form.paymentDate + "T00:00:00").toLocaleDateString('en-GB')} (backdated)
                      </p>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-4 border-t border-border mt-5 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1 h-10 text-sm font-semibold"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary flex-1 h-10 text-sm font-semibold flex items-center justify-center gap-2"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {saving ? "Saving..." : "Add Member"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Package Selection Modal */}
      {showPkgSelectModal && (
        <PackageSelectModal
          packages={packages}
          selectedPkgId={form.packageId}
          customPkgName={form.customPkgName}
          customPkgPrice={form.customPkgPrice}
          customPkgDuration={form.customPkgDuration}
          onSelect={handleSelectPackage}
          onClose={() => setShowPkgSelectModal(false)}
        />
      )}
    </>
  );
};

export default AddMemberModal;
