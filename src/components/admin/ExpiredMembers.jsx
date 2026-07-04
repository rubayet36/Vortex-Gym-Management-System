import React, { useState, useEffect } from "react";
import { AlertTriangle, Clock, RefreshCw, X, MessageCircle } from "lucide-react";
import { api } from "../../lib/api";

const ExpiredMembers = () => {
  const [expired, setExpired] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllModal, setShowAllModal] = useState(false);

  useEffect(() => {
    const fetchExpired = async () => {
      try {
        const res = await api.subscriptions.list({ status: "expired" });
        const data = res?.data || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const mapped = data.map((sub) => {
          const endDate = new Date(sub.end_date);
          endDate.setHours(0, 0, 0, 0);

          const diffMs = today - endDate;
          const daysExpired = Math.floor(diffMs / (1000 * 60 * 60 * 24));

          return {
            id: sub.id,
            name: `${sub.first_name || ""} ${sub.last_name || ""}`.trim() || "Unknown",
            phone: sub.phone_number || "—",
            daysExpired,
          };
        });

        mapped.sort((a, b) => a.daysExpired - b.daysExpired);
        setExpired(mapped);
      } catch (e) {
        console.error("Expired members fetch error:", e);
      }
      setLoading(false);
    };

    fetchExpired();
  }, []);

  const handleSendWhatsApp = (member) => {
    const name = member.name !== "Unknown" ? `*${member.name}*` : "Valued Member";
    const message =
      `Hello ${name},\n\n` +
      `This is a friendly reminder from *Vortex Fitness Club* that your gym membership package expired *${member.daysExpired} days ago*.\n\n` +
      `Please renew your package at your earliest convenience to continue your fitness journey with us without interruption. For any queries or to confirm your renewal, feel free to reply to this message or contact us at *01771681633*.\n\n` +
      `Stay fit,\n*Team Vortex* 🏋️\u200D\u2642\uFE0F`;

    let phone = member.phone.replace(/\D/g, "");

    if (phone && phone.length === 11 && phone.startsWith("01")) {
      phone = `88${phone}`;
    }

    if (!phone || phone.length < 11) {
      alert("No valid phone number found for this member.");
      return;
    }

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  if (loading) {
    return (
      <div className="card flex items-center justify-center gap-3 p-6 text-sm text-text-muted">
        <RefreshCw className="h-5 w-5 animate-spin text-accent" />
        Loading expired memberships...
      </div>
    );
  }

  if (expired.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] bg-accent/10 text-accent">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-xl font-bold text-text-main">No expired memberships</h3>
        <p className="mt-2 text-sm text-text-muted">
          Everyone is currently covered by an active subscription.
        </p>
      </div>
    );
  }

  const displayedExpired = expired.slice(0, 6);

  return (
    <>
      <div className="card relative overflow-hidden p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,90,74,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(242,157,74,0.12),transparent_24%)]" />
        <div className="relative flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-primary/10 text-primary">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
                  Renewal attention
                </p>
                <h2 className="mt-2 text-2xl font-bold text-text-main">
                  Expired membership follow-up queue
                </h2>
                <p className="mt-2 text-sm leading-6 text-text-muted">
                  {expired.length} member{expired.length !== 1 ? "s" : ""} need outreach. The newest expiries appear first so your team can respond quickly.
                </p>
              </div>
            </div>

            <button type="button" onClick={() => setShowAllModal(true)} className="btn-secondary">
              View all expired members
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {displayedExpired.map((member) => (
              <article
                key={member.id}
                className="rounded-[24px] border border-border/70 bg-background/35 p-5 transition-all hover:border-primary/35 hover:bg-background/55"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-sm font-bold text-primary">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-text-main">{member.name}</h3>
                      <p className="truncate text-sm text-text-muted">{member.phone}</p>
                    </div>
                  </div>
                  <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {member.daysExpired > 0 ? `${member.daysExpired}d` : "Today"}
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 rounded-2xl border border-border/70 bg-surfaceLight/55 px-4 py-3 text-sm text-text-muted">
                  <Clock className="h-4 w-4 text-secondary" />
                  Expired {member.daysExpired > 0 ? `${member.daysExpired} day${member.daysExpired === 1 ? "" : "s"} ago` : "today"}
                </div>

                <button
                  type="button"
                  onClick={() => handleSendWhatsApp(member)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366]/10 px-4 py-3 text-sm font-semibold text-[#25D366] transition-all hover:bg-[#25D366] hover:text-white"
                >
                  <MessageCircle className="h-4 w-4" />
                  Send WhatsApp reminder
                </button>
              </article>
            ))}
          </div>
        </div>
      </div>

      {showAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="card max-h-[88vh] w-full max-w-6xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/60 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-text-main">All expired memberships</h2>
                  <p className="text-sm text-text-muted">
                    {expired.length} members sorted by the most recent expiry first
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAllModal(false)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-surfaceLight/65 text-text-main transition-all hover:bg-surfaceLight"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[72vh] overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {expired.map((member) => (
                  <article
                    key={member.id}
                    className="rounded-[24px] border border-border/70 bg-surfaceLight/35 p-5 transition-all hover:border-primary/30"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-sm font-bold text-primary">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-bold text-text-main">{member.name}</h3>
                          <p className="truncate text-sm text-text-muted">{member.phone}</p>
                        </div>
                      </div>
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {member.daysExpired > 0 ? `${member.daysExpired}d` : "Today"}
                      </span>
                    </div>

                    <div className="mt-5 flex items-center gap-2 rounded-2xl border border-border/70 bg-background/35 px-4 py-3 text-sm text-text-muted">
                      <Clock className="h-4 w-4 text-secondary" />
                      Expired {member.daysExpired > 0 ? `${member.daysExpired} day${member.daysExpired === 1 ? "" : "s"} ago` : "today"}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSendWhatsApp(member)}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366]/10 px-4 py-3 text-sm font-semibold text-[#25D366] transition-all hover:bg-[#25D366] hover:text-white"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Send WhatsApp reminder
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExpiredMembers;
