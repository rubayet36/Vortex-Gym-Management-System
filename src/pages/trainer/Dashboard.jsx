import React from "react";
import { Users, Activity, Target, Dumbbell, Clock4, ArrowRight } from "lucide-react";

const trainerStats = [
  {
    title: "Active Clients",
    value: "24",
    description: "Clients currently assigned to your active roster.",
    tone: "secondary",
    icon: <Users className="h-5 w-5" />,
  },
  {
    title: "Sessions Today",
    value: "6",
    description: "Booked sessions scheduled across the day.",
    tone: "accent",
    icon: <Activity className="h-5 w-5" />,
  },
  {
    title: "Plans Updated",
    value: "18",
    description: "Workout or diet plans refreshed this week.",
    tone: "primary",
    icon: <Dumbbell className="h-5 w-5" />,
  },
  {
    title: "Client Progress",
    value: "92%",
    description: "Average progress score from your current client base.",
    tone: "default",
    icon: <Target className="h-5 w-5" />,
  },
];

const sessions = [
  { time: "10:00 AM", client: "David Lee", note: "Upper body strength block" },
  { time: "11:00 AM", client: "Emma Watson", note: "Mobility and recovery check-in" },
  { time: "02:00 PM", client: "Chris Evans", note: "Hypertrophy progression review" },
];

const TrainerDashboard = () => {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-5 md:space-y-8 md:px-8 md:py-8">
      <section className="card relative overflow-hidden p-6 md:p-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(39,201,146,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(242,157,74,0.1),transparent_26%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
              Trainer studio
            </p>
            <h1 className="mt-3 text-3xl font-bold text-text-main md:text-4xl">
              Coach your clients from a dashboard that stays focused.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-text-muted md:text-base">
              Review today&apos;s schedule, stay ahead of plan updates, and keep your client workflow organized on every screen size.
            </p>
          </div>

          <div className="rounded-[24px] border border-border/70 bg-background/40 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              Next up
            </p>
            <p className="mt-2 text-xl font-bold text-text-main">David Lee at 10:00 AM</p>
            <p className="mt-1 text-sm text-text-muted">Upper body strength block</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {trainerStats.map((stat) => (
          <div key={stat.title} className="card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-text-muted">{stat.title}</p>
                <h2 className="mt-3 text-3xl font-bold text-text-main">{stat.value}</h2>
                <p className="mt-3 text-sm leading-6 text-text-muted">{stat.description}</p>
              </div>
              <div
                className={`rounded-2xl p-3 ${
                  stat.tone === "secondary"
                    ? "bg-secondary/10 text-secondary"
                    : stat.tone === "accent"
                    ? "bg-accent/10 text-accent"
                    : stat.tone === "primary"
                    ? "bg-primary/10 text-primary"
                    : "bg-surfaceLight text-text-main"
                }`}
              >
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
              Today&apos;s schedule
            </p>
            <h2 className="mt-2 text-2xl font-bold text-text-main">Upcoming coaching sessions</h2>
          </div>
          <div className="rounded-full border border-border/70 bg-surfaceLight/55 px-4 py-2 text-sm font-medium text-text-muted">
            3 sessions queued
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {sessions.map((session) => (
            <article
              key={`${session.time}-${session.client}`}
              className="flex flex-col gap-4 rounded-[24px] border border-border/70 bg-surfaceLight/35 p-5 transition-all hover:border-secondary/30 lg:flex-row lg:items-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-secondary/10 text-secondary">
                <Clock4 className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-bold text-text-main">{session.client}</h3>
                  <span className="text-sm font-semibold text-secondary">{session.time}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-text-muted">{session.note}</p>
              </div>
              <button type="button" className="btn-secondary">
                View routine
                <ArrowRight className="h-4 w-4" />
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default TrainerDashboard;
