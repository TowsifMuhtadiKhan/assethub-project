import { useState, useEffect } from "react";
import {
  Sparkles,
  LogOut,
  ShieldCheck,
  Lock,
  KeyRound,
  CheckCircle2,
} from "lucide-react";

/**
 * Animated Brand Page Loader
 * Used for full-screen loading, AuthGate, and initial application boot.
 */
export function AnimatedPageLoader({
  message = "Loading your space...",
  subtitle = "Syncing encrypted records & workspace",
  fullscreen = true,
}: {
  message?: string;
  subtitle?: string;
  fullscreen?: boolean;
}) {
  const containerClass = fullscreen
    ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-md px-4 text-white"
    : "flex flex-col items-center justify-center py-20 px-4 w-full";

  return (
    <div className={containerClass} role="status" aria-live="polite">
      {/* Animated Glowing Dual Rings + Brand Icon */}
      <div className="relative flex items-center justify-center mb-6">
        {/* Soft Ambient Glow */}
        <div className="absolute h-24 w-24 rounded-full bg-gradient-to-tr from-indigo-500/30 to-blue-400/30 blur-xl animate-pulse" />

        {/* Outer Rotating Gradient Ring */}
        <div className="h-16 w-16 rounded-full border-2 border-transparent border-t-indigo-500 border-r-blue-400 animate-spin" />

        {/* Inner Counter-Rotating Ring */}
        <div
          className="absolute h-11 w-11 rounded-full border-2 border-transparent border-b-emerald-400 border-l-teal-300 animate-spin"
          style={{ animationDirection: "reverse", animationDuration: "1.2s" }}
        />

        {/* Center Pulsing Icon Badge */}
        <div className="absolute flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-indigo-400 shadow-md">
          <Sparkles className="h-4 w-4 animate-pulse text-indigo-400" />
        </div>
      </div>

      {/* Primary Message */}
      <h3 className="text-base font-bold tracking-tight text-white">{message}</h3>

      {/* Subtitle with Animated Bouncing Dots */}
      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
        <span>{subtitle}</span>
        <span className="inline-flex gap-1 items-center">
          <span className="h-1 w-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="h-1 w-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="h-1 w-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
        </span>
      </div>
    </div>
  );
}

/**
 * Signin Transition Overlay
 * Displays a multi-phase animated verification, vault unlock, and welcome transition.
 */
export function SigninOverlay({
  email,
  customMessage,
}: {
  email?: string;
  customMessage?: string;
}) {
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [progress, setProgress] = useState(20);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setPhase(2);
      setProgress(65);
    }, 450);

    const t2 = setTimeout(() => {
      setPhase(3);
      setProgress(100);
    }, 950);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const userName = email ? email.split("@")[0] : "";

  return (
    <div
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-xl px-4 text-white animate-in fade-in duration-300"
      role="status"
      aria-live="polite"
    >
      {/* Background Ambient Glows */}
      <div className="absolute h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl -top-10 -left-10 pointer-events-none" />
      <div className="absolute h-80 w-80 rounded-full bg-indigo-500/15 blur-3xl -bottom-10 -right-10 pointer-events-none" />

      {/* Centerpiece Icon with Multi-ring Glow */}
      <div className="relative flex items-center justify-center mb-6">
        {/* Outer Halo */}
        <div className="absolute h-28 w-28 rounded-full bg-gradient-to-tr from-cyan-500/25 to-blue-600/25 blur-xl animate-pulse" />

        {/* Outer Gradient Spinning Ring */}
        <div className="h-20 w-20 rounded-full border-2 border-transparent border-t-cyan-400 border-r-blue-500 animate-spin" />

        {/* Inner Counter-Rotating Ring */}
        <div
          className="absolute h-14 w-14 rounded-full border-2 border-transparent border-b-emerald-400 border-l-teal-300 animate-spin"
          style={{ animationDirection: "reverse", animationDuration: "1.4s" }}
        />

        {/* Center Animated Icon Tile */}
        <div className="absolute flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 border border-cyan-500/30 text-cyan-400 shadow-xl shadow-cyan-500/20">
          {phase === 1 && <KeyRound className="h-5 w-5 animate-pulse text-cyan-400" />}
          {phase === 2 && <Lock className="h-5 w-5 text-indigo-400 animate-bounce" />}
          {phase === 3 && <ShieldCheck className="h-5 w-5 text-emerald-400 animate-in zoom-in-75 duration-300" />}
        </div>
      </div>

      {/* Main Status Header */}
      <div className="text-center space-y-1">
        <h3 className="text-lg font-bold tracking-tight text-white flex items-center justify-center gap-2">
          {phase === 1 && (customMessage || "Verifying Credentials...")}
          {phase === 2 && "Unlocking Personal Vault..."}
          {phase === 3 && (userName ? `Welcome back, ${userName}!` : "Welcome to LifeNest!")}
        </h3>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          {phase === 1 && "Authenticating identity & security tokens"}
          {phase === 2 && "Decrypting personal keys and family records"}
          {phase === 3 && "Opening encrypted dashboard workspace"}
        </p>
      </div>

      {/* Smooth Progress Bar with Glowing Head */}
      <div className="mt-6 w-56 h-1.5 overflow-hidden rounded-full bg-slate-800/80 p-0.5 border border-slate-700/50">
        <div
          className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Security Checkpoints Mini-List */}
      <div className="mt-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3 w-64 space-y-1.5 text-[11px] font-mono backdrop-blur-xs">
        <div className={`flex items-center gap-2 transition ${progress >= 30 ? "text-emerald-400 font-semibold" : "text-slate-500"}`}>
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>Identity Verified</span>
        </div>
        <div className={`flex items-center gap-2 transition ${progress >= 65 ? "text-emerald-400 font-semibold" : "text-slate-500"}`}>
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>Vault Keys Decrypted</span>
        </div>
        <div className={`flex items-center gap-2 transition ${progress >= 100 ? "text-emerald-400 font-semibold" : "text-slate-500"}`}>
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>Workspace Connected</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Signout Transition Overlay
 * Displayed smoothly while clearing local credentials and revoking Supabase session.
 */
export function SignoutOverlay({
  message = "Signing out securely...",
  subtitle = "Clearing session data and locking workspace",
}: {
  message?: string;
  subtitle?: string;
}) {
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [progress, setProgress] = useState(25);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setPhase(2);
      setProgress(65);
    }, 400);

    const t2 = setTimeout(() => {
      setPhase(3);
      setProgress(100);
    }, 850);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-xl px-4 text-white animate-in fade-in duration-300"
      role="status"
      aria-live="polite"
    >
      {/* Background Ambient Glows */}
      <div className="absolute h-80 w-80 rounded-full bg-rose-500/15 blur-3xl -top-10 -left-10 pointer-events-none" />
      <div className="absolute h-80 w-80 rounded-full bg-amber-500/15 blur-3xl -bottom-10 -right-10 pointer-events-none" />

      {/* Centerpiece Icon */}
      <div className="relative flex items-center justify-center mb-6">
        {/* Glow */}
        <div className="absolute h-28 w-28 rounded-full bg-rose-500/25 blur-xl animate-pulse" />

        {/* Spinning Ring */}
        <div className="h-20 w-20 rounded-full border-2 border-transparent border-t-rose-500 border-r-amber-500 animate-spin" />

        {/* Inner Counter-Rotating Ring */}
        <div
          className="absolute h-14 w-14 rounded-full border-2 border-transparent border-b-rose-400 border-l-red-300 animate-spin"
          style={{ animationDirection: "reverse", animationDuration: "1.4s" }}
        />

        {/* Center LogOut / Lock Icon */}
        <div className="absolute flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 border border-rose-500/30 text-rose-400 shadow-xl shadow-rose-500/20">
          {phase === 1 && <LogOut className="h-5 w-5 animate-pulse text-rose-400" />}
          {phase === 2 && <Lock className="h-5 w-5 text-amber-400 animate-bounce" />}
          {phase === 3 && <ShieldCheck className="h-5 w-5 text-emerald-400 animate-in zoom-in-75 duration-300" />}
        </div>
      </div>

      <div className="text-center space-y-1">
        <h3 className="text-lg font-bold tracking-tight text-white">
          {phase === 1 && message}
          {phase === 2 && "Securing & Encrypting Vault..."}
          {phase === 3 && "Signed Out Safely. See you soon!"}
        </h3>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          {phase === 1 && subtitle}
          {phase === 2 && "Revoking active session credentials"}
          {phase === 3 && "All workspace data locked on this device"}
        </p>
      </div>

      {/* Progress Bar Animation */}
      <div className="mt-6 w-56 h-1.5 overflow-hidden rounded-full bg-slate-800/80 p-0.5 border border-slate-700/50">
        <div
          className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Security Checkpoints Mini-List */}
      <div className="mt-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3 w-64 space-y-1.5 text-[11px] font-mono backdrop-blur-xs">
        <div className={`flex items-center gap-2 transition ${progress >= 30 ? "text-rose-400 font-semibold" : "text-slate-500"}`}>
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>Local Tokens Cleared</span>
        </div>
        <div className={`flex items-center gap-2 transition ${progress >= 65 ? "text-amber-400 font-semibold" : "text-slate-500"}`}>
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>Sync Channels Disconnected</span>
        </div>
        <div className={`flex items-center gap-2 transition ${progress >= 100 ? "text-emerald-400 font-semibold" : "text-slate-500"}`}>
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>Vault Sealed & Locked</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Reusable Shimmer Bar for Skeletons
 */
export function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`}
    />
  );
}

/**
 * Cards Grid Skeleton (for Vehicles, Properties, Warranties, Vault)
 */
export function CardsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {/* Top Filter and Search Bar Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-2">
          <Shimmer className="h-7 w-20 rounded-full" />
          <Shimmer className="h-7 w-24 rounded-full" />
          <Shimmer className="h-7 w-20 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Shimmer className="h-8 w-44 rounded-full" />
          <Shimmer className="h-8 w-28 rounded-full" />
        </div>
      </div>

      {/* Grid of Skeleton Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Shimmer className="h-9 w-9 rounded-full shrink-0" />
                <div className="space-y-1.5">
                  <Shimmer className="h-3.5 w-28 rounded-md" />
                  <Shimmer className="h-2.5 w-20 rounded-md" />
                </div>
              </div>
              <Shimmer className="h-5 w-16 rounded-full" />
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <Shimmer className="h-3 w-24 rounded-md" />
              <Shimmer className="h-6 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Detail Page Skeleton (for Vehicle Details, Property Details, etc.)
 */
export function DetailPageSkeleton() {
  return (
    <div className="space-y-4 pb-20">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-3">
          <Shimmer className="h-8 w-8 rounded-full" />
          <Shimmer className="h-8 w-8 rounded-full" />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Shimmer className="h-4 w-36 rounded-md" />
              <Shimmer className="h-4 w-16 rounded-full" />
            </div>
            <Shimmer className="h-3 w-28 rounded-md" />
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
        <Shimmer className="h-7 w-24 rounded-lg" />
        <Shimmer className="h-7 w-28 rounded-lg" />
        <Shimmer className="h-7 w-24 rounded-lg" />
        <Shimmer className="h-7 w-32 rounded-lg" />
      </div>

      {/* Content Skeleton Area */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3">
          <Shimmer className="h-4 w-32 rounded-md" />
          <Shimmer className="h-20 w-full rounded-xl" />
          <Shimmer className="h-10 w-full rounded-xl" />
          <Shimmer className="h-10 w-full rounded-xl" />
        </div>
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3">
          <Shimmer className="h-4 w-40 rounded-md" />
          <div className="space-y-2">
            <Shimmer className="h-14 w-full rounded-xl" />
            <Shimmer className="h-14 w-full rounded-xl" />
            <Shimmer className="h-14 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Dashboard Overview Skeleton
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-5 pb-20">
      {/* Top Greeting Skeleton */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
        <div className="space-y-1.5">
          <Shimmer className="h-5 w-44 rounded-md" />
          <Shimmer className="h-3 w-64 rounded-md" />
        </div>
        <Shimmer className="h-9 w-9 rounded-full" />
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs space-y-2"
          >
            <div className="flex items-center justify-between">
              <Shimmer className="h-3 w-16 rounded-md" />
              <Shimmer className="h-4 w-4 rounded-full" />
            </div>
            <Shimmer className="h-6 w-24 rounded-md" />
            <Shimmer className="h-2.5 w-20 rounded-md" />
          </div>
        ))}
      </div>

      {/* Quick Action Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Shimmer key={i} className="h-8 w-28 rounded-full shrink-0" />
        ))}
      </div>

      {/* Feed Schedule Skeleton */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <Shimmer className="h-4 w-32 rounded-md" />
          <Shimmer className="h-6 w-20 rounded-full" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl bg-slate-50/70 p-3 border border-slate-100"
            >
              <div className="flex items-center gap-2.5">
                <Shimmer className="h-7 w-7 rounded-full shrink-0" />
                <div className="space-y-1">
                  <Shimmer className="h-3.5 w-36 rounded-md" />
                  <Shimmer className="h-2.5 w-24 rounded-md" />
                </div>
              </div>
              <Shimmer className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Expenses / Ledgers Skeleton
 */
export function ExpensesSkeleton() {
  return (
    <div className="space-y-4 pb-20">
      {/* Tabs Skeleton */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-1.5">
          <Shimmer className="h-8 w-28 rounded-full" />
          <Shimmer className="h-8 w-28 rounded-full" />
          <Shimmer className="h-8 w-28 rounded-full" />
        </div>
      </div>

      {/* Members Pills Skeleton */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <Shimmer key={i} className="h-10 w-32 rounded-full shrink-0" />
        ))}
      </div>

      {/* Summary Card Skeleton */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-2">
        <Shimmer className="h-3.5 w-28 rounded-md" />
        <Shimmer className="h-7 w-44 rounded-md" />
        <Shimmer className="h-2.5 w-36 rounded-md" />
      </div>

      {/* Single-Line Controls Skeleton */}
      <div className="flex items-center gap-2">
        <Shimmer className="h-8 flex-1 rounded-full" />
        <Shimmer className="h-8 w-24 rounded-full" />
        <Shimmer className="h-8 w-28 rounded-full" />
      </div>

      {/* List items skeleton */}
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs"
          >
            <div className="flex items-center gap-2.5">
              <Shimmer className="h-8 w-8 rounded-full shrink-0" />
              <div className="space-y-1">
                <Shimmer className="h-3.5 w-32 rounded-md" />
                <Shimmer className="h-2.5 w-20 rounded-md" />
              </div>
            </div>
            <div className="space-y-1 text-right">
              <Shimmer className="h-4 w-16 rounded-md ml-auto" />
              <Shimmer className="h-4 w-14 rounded-full ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
