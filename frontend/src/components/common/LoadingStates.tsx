import { Sparkles, LogOut } from "lucide-react";

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
 * Signout Transition Overlay
 * Displayed smoothly while clearing local credentials and revoking Supabase session.
 */
export function SignoutOverlay({
  message = "Signing out securely...",
  subtitle = "Clearing session data and closing workspace",
}: {
  message?: string;
  subtitle?: string;
}) {
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md px-4 text-white">
      <div className="relative flex items-center justify-center mb-6">
        {/* Glow */}
        <div className="absolute h-24 w-24 rounded-full bg-rose-500/20 blur-xl animate-pulse" />

        {/* Spinning Ring */}
        <div className="h-16 w-16 rounded-full border-2 border-rose-500/20 border-t-rose-500 animate-spin" />

        {/* Center LogOut Icon */}
        <div className="absolute flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 border border-rose-500/30 text-rose-400 shadow-lg">
          <LogOut className="h-4 w-4 animate-pulse text-rose-400" />
        </div>
      </div>

      <h3 className="text-base font-bold tracking-tight text-white">{message}</h3>
      <p className="mt-1 text-xs text-slate-400">{subtitle}</p>

      {/* Progress Bar Animation */}
      <div className="mt-5 h-1 w-44 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full w-full bg-gradient-to-r from-rose-500 to-indigo-500 animate-[shimmer_1.5s_infinite] origin-left" />
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
