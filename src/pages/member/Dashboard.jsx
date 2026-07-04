import React from "react";
import { Dumbbell, Utensils, Zap, Clock, ChevronRight, BellRing } from "lucide-react";

const MemberDashboard = () => {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-5 md:space-y-8 md:px-8 md:py-8">
      <section className="card relative overflow-hidden p-6 md:p-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(39,201,146,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(245,90,74,0.1),transparent_24%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-[4.5rem] w-[4.5rem] overflow-hidden rounded-[28px] border border-primary/30 bg-surfaceLight">
              <img
                src="https://i.pravatar.cc/150?u=current_user"
                alt="User"
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
                Member hub
              </p>
              <h1 className="mt-2 text-3xl font-bold text-text-main md:text-4xl">
                Hi, Michael!
              </h1>
              <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 text-sm font-semibold text-accent">
                <Zap className="h-4 w-4" />
                12 day streak
              </p>
            </div>
          </div>

          <div className="rounded-[24px] border border-border/70 bg-background/35 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              Today&apos;s focus
            </p>
            <p className="mt-2 text-xl font-bold text-text-main">Push day + nutrition target</p>
            <p className="mt-1 text-sm text-text-muted">Keep your routine and calories on track.</p>
          </div>
        </div>
      </section>

      <div className="card border-primary/20 bg-primary/10 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-main">Package expiring soon</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
                Your &quot;Monthly Basic&quot; package expires in 5 days. Renew now to avoid any interruption to check-ins or training access.
              </p>
            </div>
          </div>
          <button type="button" className="btn-primary sm:self-center">
            Renew package
          </button>
        </div>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
              Today&apos;s plan
            </p>
            <h2 className="mt-2 text-2xl font-bold text-text-main">Your active routine</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <article className="card group relative overflow-hidden p-5">
            <div className="absolute inset-x-0 top-0 h-1 bg-secondary" />
            <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-secondary/10 transition-all group-hover:bg-secondary/20" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-secondary/10 text-secondary">
                <Dumbbell className="h-7 w-7" />
              </div>
              <ChevronRight className="h-5 w-5 text-text-muted transition-all group-hover:translate-x-1 group-hover:text-secondary" />
            </div>
            <h3 className="relative mt-5 text-2xl font-bold text-text-main">Push Day</h3>
            <p className="relative mt-2 text-sm leading-6 text-text-muted">
              6 exercises, 45 minutes, focus on chest, shoulders, and triceps.
            </p>
            <button type="button" className="btn-secondary relative mt-5 w-full justify-between">
              Start workout
              <ChevronRight className="h-4 w-4" />
            </button>
          </article>

          <article className="card group relative overflow-hidden p-5">
            <div className="absolute inset-x-0 top-0 h-1 bg-accent" />
            <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-accent/10 transition-all group-hover:bg-accent/20" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-accent/10 text-accent">
                <Utensils className="h-7 w-7" />
              </div>
              <ChevronRight className="h-5 w-5 text-text-muted transition-all group-hover:translate-x-1 group-hover:text-accent" />
            </div>
            <h3 className="relative mt-5 text-2xl font-bold text-text-main">Bulking Diet</h3>
            <p className="relative mt-2 text-sm leading-6 text-text-muted">
              3,000 kcal target with a high-protein meal structure for the day.
            </p>
            <div className="relative mt-5">
              <div className="h-3 w-full overflow-hidden rounded-full bg-surfaceLight/70">
                <div className="h-full w-[60%] rounded-full bg-accent" />
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="font-semibold text-text-main">60% completed</span>
                <span className="text-text-muted">1,800 kcal remaining</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="card p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surfaceLight text-secondary">
            <BellRing className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
              Notice board
            </p>
            <h3 className="mt-2 text-xl font-bold text-text-main">
              New equipment arriving next week
            </h3>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              We are adding two new Smith machines and a hip thrust machine to the floor. Expected installation on Tuesday.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MemberDashboard;
