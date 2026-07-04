import React, { useState } from "react";
import MembersTable from "./members/MembersTable";
import DeviceUsersPanel from "./members/DeviceUsersPanel";
import ZKTecoBridgeConfig from "./members/ZKTecoBridgeConfig";

// ─── Main Page ─────────────────────────────────────────────────────────────────
const MembersManager = () => {
  const [activeTab, setActiveTab] = useState("members");

  const tabs = [
    { id: "members", label: "👥 Members & Packages" },
    { id: "device", label: "📟 F22 Device Users" },
    { id: "bridge", label: "⚙️ Bridge Config" },
  ];

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-5 md:px-6 md:py-8 xl:px-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Member Management
          </h1>
          <p className="text-text-muted mt-1">
            Manage members, packages, and ZKTeco device access.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-1 gap-2 rounded-[24px] border border-border/70 bg-surface/70 p-2 sm:grid-cols-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "bg-surfaceLight/55 text-text-muted hover:text-text-main"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "members" && <MembersTable />}
      {activeTab === "device" && <DeviceUsersPanel />}
      {activeTab === "bridge" && <ZKTecoBridgeConfig />}
    </div>
  );
};

export default MembersManager;
