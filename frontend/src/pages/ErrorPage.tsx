import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  AlertOctagon,
  RefreshCw,
  Home,
  Database,
  ArrowLeft,
  LifeBuoy,
  FileText,
} from "lucide-react";

interface ErrorPageProps {
  title?: string;
  message?: string;
  errorCode?: string | number;
  onRetry?: () => void;
}

export function ErrorPage({
  title,
  message,
  errorCode,
  onRetry,
}: ErrorPageProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Read error details passed via location state or query params if any
  const state = (location.state as { title?: string; message?: string; code?: string }) || {};
  const query = new URLSearchParams(location.search);

  const displayCode = errorCode || state.code || query.get("code") || "500";
  const displayTitle =
    title || state.title || query.get("title") || "Something Went Wrong";
  const displayMessage =
    message ||
    state.message ||
    query.get("message") ||
    "Likhe Rakho encountered an unexpected server or network issue while processing your request. Please try again or return to the main dashboard.";

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center py-10 px-4 sm:px-6 relative overflow-hidden bg-[#f6faf7]">
      {/* Soft Ambient Theme Glows */}
      <div className="absolute h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl -top-10 -left-10 pointer-events-none" />
      <div className="absolute h-80 w-80 rounded-full bg-teal-500/10 blur-3xl -bottom-10 -right-10 pointer-events-none" />

      <div className="relative w-full max-w-xl text-center">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-2.5 mb-5">
          <img
            src="/logo.png"
            alt="Likhe Rakho"
            className="h-9 w-9 object-contain rounded-xl shadow-2xs"
          />
          <div className="flex flex-col text-left">
            <div className="text-[15px] font-extrabold tracking-tight leading-tight flex items-center gap-0.5">
              <span className="text-[#064e3b]">Likhe</span>
              <span className="text-[#00a859]">Rakho</span>
            </div>
            <div className="text-[9px] font-semibold text-[#064e3b]/85 leading-none flex items-center gap-1 mt-0.5">
              <span className="h-px w-2 bg-emerald-400" />
              <span>লিখে রাখো</span>
              <span className="h-px w-2 bg-emerald-400" />
            </div>
          </div>
        </div>

        {/* Error Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50/80 px-3.5 py-1 text-xs font-semibold text-rose-700 shadow-2xs mb-4">
          <span className="flex h-2 w-2 rounded-full bg-rose-600 animate-ping" />
          <span>Error {displayCode} • System Alert</span>
        </div>

        {/* Big Icon */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 shadow-xs">
          <AlertOctagon className="h-8 w-8" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-display">
          {displayTitle}
        </h1>
        <p className="mt-2.5 text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          {displayMessage}
        </p>

        {/* Primary Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-tr from-[#064e3b] to-[#0d825c] hover:from-[#073f30] hover:to-[#0b6e4e] px-5 py-2.5 text-xs font-bold text-white transition shadow-xs cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try Again
            </button>
          ) : (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-tr from-[#064e3b] to-[#0d825c] hover:from-[#073f30] hover:to-[#0b6e4e] px-5 py-2.5 text-xs font-bold text-white transition shadow-xs cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reload Application
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Go Back
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
          >
            <Home className="h-3.5 w-3.5" />
            Dashboard
          </button>
        </div>

        {/* Diagnostic Card */}
        <div className="mt-8 rounded-3xl border border-slate-200/90 bg-white p-5 text-left shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-slate-500" />
              System Diagnostics
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {new Date().toLocaleTimeString()}
            </span>
          </div>

          <div className="pt-3 space-y-2 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Environment:</span>
              <span className="font-mono text-[11px] font-semibold text-slate-700">
                Production / Client OS
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Database Engine:</span>
              <span className="font-mono text-[11px] font-semibold text-emerald-800">
                Supabase PostgreSQL
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <Link
              to="/settings"
              className="text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1"
            >
              <LifeBuoy className="h-3 w-3" />
              Verify Connection Settings
            </Link>
            <Link
              to="/documents/vault"
              className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
            >
              <FileText className="h-3 w-3" />
              Open Document Vault
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
