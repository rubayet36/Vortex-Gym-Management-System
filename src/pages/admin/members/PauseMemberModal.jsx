import React, { useState } from "react";
import { X, RefreshCw } from "lucide-react";
import { api } from "../../../lib/api";

const PauseMemberModal = ({ member, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState(member?.pause_note || "");

  const handleTogglePause = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const isPausedNow = !member.is_paused;
      await api.profiles.update(member.id, {
        is_paused: isPausedNow ? 1 : 0,
        pause_note: isPausedNow ? note : null,
      });
      onSuccess();
    } catch (err) {
      alert("Failed to update member pause status.");
    }
    setLoading(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-lg">
            {member.is_paused ? "Unpause Member" : "Pause Member"}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleTogglePause} className="space-y-4">
          {!member.is_paused ? (
            <div>
              <label className="label text-sm uppercase tracking-wider mb-2 block">
                Reason for Pausing (Optional)
              </label>
              <textarea
                className="input-field min-h-[100px] mt-1 p-3 w-full bg-surfaceLight border border-border rounded-xl text-white outline-none focus:border-accent"
                placeholder="e.g. Traveling until next month..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          ) : (
            <p className="text-sm text-text-muted border border-border p-4 rounded-xl bg-surfaceLight/50">
              This member is currently paused with note:<br /><br />
              <strong className="text-white">"{member.pause_note || "No reason provided"}"</strong>
              <br /><br />
              Are you sure you want to unpause their account so they can use the gym again?
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 flex justify-center items-center gap-2 ${
                member.is_paused
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "btn-primary"
              } rounded-lg font-semibold transition-colors disabled:opacity-50 py-2.5`}
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              {member.is_paused ? "Confirm Unpause" : "Confirm Pause"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PauseMemberModal;
