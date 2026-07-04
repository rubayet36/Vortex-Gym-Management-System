import React, { useMemo, useState } from "react";
import fitnessClubLogo from "../../assets/Fitness Club (iOS Icon).png";
import { Navigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  LogOut,
  Dumbbell,
  Activity,
  ShieldAlert,
  CreditCard,
  ChevronRight,
  Menu,
  X,
  SunMedium,
  MoonStar,
  Package,
} from "lucide-react";

const roleCopy = {
  owner: {
    label: "Owner Console",
    description: "Full control over members, staff, finance, and operations.",
  },
  manager: {
    label: "Manager Workspace",
    description: "Stay on top of daily floor activity and member operations.",
  },
  trainer: {
    label: "Trainer Studio",
    description: "Plan sessions, monitor clients, and guide progress smoothly.",
  },
  member: {
    label: "Member Hub",
    description: "Track workouts, progress, and your daily fitness journey.",
  },
};

const AppLayout = () => {
  const { user, profile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user || !profile) return <Navigate to="/login" replace />;

  const handleLogout = async () => {
    setIsMobileMenuOpen(false);
    await logout();
  };

  const navLinks = useMemo(() => {
    const role = profile.role;

    if (role === "owner" || role === "manager") {
      return [
        {
          path: "/admin",
          label: "Dashboard",
          mobileLabel: "Home",
          description: "Live overview of members, check-ins, and alerts.",
          icon: <LayoutDashboard className="h-5 w-5" />,
        },
        {
          path: "/admin/members",
          label: "Members & Staff",
          mobileLabel: "Members",
          description: "Manage packages, members, device users, and bridge tools.",
          icon: <Users className="h-5 w-5" />,
        },
        {
          path: "/admin/pos",
          label: "Attendance",
          mobileLabel: "Attendance",
          description: "Review door logs, check-ins, and current floor traffic.",
          icon: <CalendarDays className="h-5 w-5" />,
        },
        {
          path: "/admin/finances",
          label: "Finances",
          mobileLabel: "Finance",
          description: "Track packages, transactions, dues, and business spend.",
          icon: <CreditCard className="h-5 w-5" />,
        },
        {
          path: "/admin/packages/history",
          label: "Package History",
          mobileLabel: "Packages",
          description: "Analyse member counts and usage stats per package.",
          icon: <Package className="h-5 w-5" />,
        },
      ];
    }

    if (role === "trainer") {
      return [
        {
          path: "/trainer",
          label: "Dashboard",
          mobileLabel: "Home",
          description: "A focused snapshot of your client load and schedule.",
          icon: <LayoutDashboard className="h-5 w-5" />,
        },
        {
          path: "/trainer/clients",
          label: "My Clients",
          mobileLabel: "Clients",
          description: "Keep client routines, sessions, and progress organized.",
          icon: <Users className="h-5 w-5" />,
        },
        {
          path: "/trainer/workout-builder",
          label: "Workouts",
          mobileLabel: "Plans",
          description: "Build training plans and diet outlines with ease.",
          icon: <Dumbbell className="h-5 w-5" />,
        },
      ];
    }

    return [
      {
        path: "/member",
        label: "Dashboard",
        mobileLabel: "Home",
        description: "Your membership snapshot, routines, and latest updates.",
        icon: <LayoutDashboard className="h-5 w-5" />,
      },
      {
        path: "/member/tracker",
        label: "Progress Tracker",
        mobileLabel: "Progress",
        description: "Monitor body changes, photos, and personal milestones.",
        icon: <Activity className="h-5 w-5" />,
      },
      {
        path: "/member/exercises",
        label: "Exercises",
        mobileLabel: "Library",
        description: "Browse movements and training guidance anywhere.",
        icon: <Dumbbell className="h-5 w-5" />,
      },
    ];
  }, [profile.role]);

  const activeLink =
    navLinks.find((link) => location.pathname === link.path) ||
    navLinks.find((link) => location.pathname.startsWith(link.path)) ||
    navLinks[0];

  const initials = `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase();
  const roleMeta = roleCopy[profile.role] || roleCopy.member;

  const renderNavLink = (link, compact = false) => {
    const isActive = location.pathname === link.path;

    return (
      <Link
        key={link.path}
        to={link.path}
        onClick={() => setIsMobileMenuOpen(false)}
        className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-200 ${
          isActive
            ? "border-primary/30 bg-primary/10 text-text-main shadow-lg shadow-primary/10"
            : "border-transparent text-text-muted hover:border-border/60 hover:bg-surfaceLight/65 hover:text-text-main"
        } ${compact ? "justify-center px-3 py-2.5" : ""}`}
      >
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all ${
            isActive
              ? "bg-primary text-white"
              : "bg-surfaceLight/70 text-text-muted group-hover:text-text-main"
          }`}
        >
          {link.icon}
        </span>
        {!compact && (
          <>
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm font-semibold ${isActive ? "text-text-main" : ""}`}>
                {link.label}
              </p>
              <p className="truncate text-xs text-text-muted">{link.description}</p>
            </div>
            <ChevronRight
              className={`h-4 w-4 transition-transform ${
                isActive ? "text-primary" : "text-text-muted/70 group-hover:translate-x-0.5"
              }`}
            />
          </>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen text-text-main">
      <div className="mx-auto flex min-h-screen max-w-[1920px]">
        <aside className="hidden w-[96px] shrink-0 lg:block">
          <div className="sticky top-0 flex h-screen flex-col border-r border-border/60 bg-surface/70 px-3 py-6 backdrop-blur-2xl">
            <div className="card border-primary/20 bg-gradient-to-br from-surface via-surface to-surfaceLight/80 p-3">
              <div className="mb-4 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] overflow-hidden shadow-lg shadow-primary/20">
                  <img src={fitnessClubLogo} alt="Fitness Club Logo" className="h-full w-full object-cover" />
                </div>
              </div>

              <div className="flex justify-center rounded-[20px] border border-border/70 bg-background/45 p-2" title={`${profile.first_name} ${profile.last_name} (${profile.role})`}>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surfaceLight text-xs font-bold uppercase text-text-main">
                  {initials || "GM"}
                </div>
              </div>
            </div>

            <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="rounded-[24px] border border-border/60 bg-surface/55 p-2">
                <div className="space-y-2.5">
                  {navLinks.map((link) => renderNavLink(link, true))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border/55 bg-background/72 backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-surface/80 text-text-main transition-all hover:bg-surfaceLight/80 lg:hidden"
                  aria-label="Open navigation"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
                    {roleMeta.label}
                  </p>
                  <h2 className="truncate text-2xl font-bold text-text-main">
                    {activeLink?.label || "Dashboard"}
                  </h2>
                  <p className="mt-1 hidden text-sm text-text-muted sm:block">
                    {activeLink?.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex h-11 items-center justify-center rounded-2xl border border-border/70 bg-surface/80 px-3 text-text-main transition-all hover:bg-surfaceLight/80 sm:w-auto sm:gap-2"
                  aria-label="Toggle theme"
                >
                  {theme === "dark" ? (
                    <SunMedium className="h-4 w-4" />
                  ) : (
                    <MoonStar className="h-4 w-4" />
                  )}
                  <span className="hidden text-sm font-semibold sm:block">
                    {theme === "dark" ? "Light" : "Dark"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="hidden items-center justify-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400 transition-all hover:bg-red-500/20 lg:inline-flex"
                >
                  <span>Logout</span>
                  <LogOut className="h-4 w-4" />
                </button>

                <div className="hidden items-center gap-3 rounded-[22px] border border-border/70 bg-surface/80 px-3 py-2 sm:flex">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-sm font-bold text-primary">
                    {initials || "GM"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text-main">
                      {profile.first_name} {profile.last_name}
                    </p>
                    <p className="text-xs capitalize text-text-muted">{profile.role}</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="mobile-safe-bottom flex-1 pb-8 lg:pb-6">
            <Outlet />
          </main>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close navigation overlay"
          />
          <div className="relative ml-auto flex h-full w-[min(90vw,360px)] flex-col border-l border-border/60 bg-background/95 p-4 shadow-2xl backdrop-blur-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl overflow-hidden">
                  <img src={fitnessClubLogo} alt="Fitness Club Logo" className="h-full w-full object-cover" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
                    Navigation
                  </p>
                  <p className="text-xl font-bold text-text-main">GymOS</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-surface/75 text-text-main"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="card mb-4 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
                Signed in as
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-sm font-bold text-primary">
                  {initials || "GM"}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-text-main">
                    {profile.first_name} {profile.last_name}
                  </p>
                  <p className="text-sm capitalize text-text-muted">{profile.role}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">{navLinks.map((link) => renderNavLink(link))}</div>

            <div className="mt-auto pt-6">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-between rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400 transition-all hover:bg-red-500/20"
              >
                <span>Sign out</span>
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/65 bg-background/88 px-3 pb-[calc(0.65rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-4 gap-2">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 text-[11px] font-semibold transition-all ${
                  isActive
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "bg-surface/70 text-text-muted"
                }`}
              >
                {link.icon}
                <span className="truncate">{link.mobileLabel}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
