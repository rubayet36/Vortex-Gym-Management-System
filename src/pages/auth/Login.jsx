import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  Activity,
  Lock,
  Mail,
  MoonStar,
  ShieldCheck,
  Sparkles,
  SunMedium,
} from "lucide-react";

const featureHighlights = [
  "Live member and staff operations",
  "Door attendance and access monitoring",
  "Packages, payments, and dues tracking",
];

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error: loginError } = await login(email, password);
      if (loginError) throw loginError;
      navigate("/");
    } catch (err) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-[-6rem] top-[-4rem] h-72 w-72 rounded-full bg-primary/20 blur-[110px]" />
        <div className="absolute right-[-5rem] top-[18%] h-72 w-72 rounded-full bg-secondary/20 blur-[120px]" />
        <div className="absolute bottom-[-5rem] left-[20%] h-80 w-80 rounded-full bg-accent/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col justify-center">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-text-muted">
                Vortex
              </p>
              <h1 className="text-2xl font-bold text-text-main">GymOS</h1>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="btn-secondary px-3"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <SunMedium className="h-4 w-4" />
            ) : (
              <MoonStar className="h-4 w-4" />
            )}
            <span className="hidden sm:block">
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </span>
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_minmax(0,420px)]">
          <section className="card relative hidden overflow-hidden p-8 lg:flex lg:flex-col lg:justify-between xl:p-10">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Modern Operations Dashboard
              </div>
              <h2 className="mt-6 max-w-xl text-4xl font-bold leading-tight text-text-main xl:text-5xl">
                Manage the gym from one polished, responsive workspace.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-text-muted">
                Sign in to access the redesigned dashboard experience for members, trainers, staff, attendance, and finances.
              </p>
            </div>

            <div className="relative mt-10 grid gap-4 xl:grid-cols-3">
              {featureHighlights.map((item) => (
                <div
                  key={item}
                  className="rounded-[24px] border border-border/70 bg-background/40 p-5"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-surfaceLight text-accent">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold leading-6 text-text-main">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="card glass mx-auto w-full max-w-md border-border/70 p-6 sm:p-8">
            <div className="mb-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[26px] bg-primary/10 text-primary">
                <Activity className="h-8 w-8" />
              </div>
              <h2 className="mt-5 text-3xl font-bold text-text-main">Welcome back</h2>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                Sign in to continue to your gym management workspace.
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-12"
                    placeholder="admin@vortexgym.com"
                    required
                    autoFocus
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pl-12"
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary mt-2 w-full py-3 text-base"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="mt-6 rounded-[22px] border border-border/70 bg-surfaceLight/55 px-4 py-3 text-center text-xs leading-6 text-text-muted">
              Access is based on your existing role and permissions. No backend behavior has been changed.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Login;
