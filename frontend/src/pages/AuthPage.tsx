import { useState } from "react";
import { login, register } from "../services/api";
import { supabase } from "../lib/supabase";
import { SigninOverlay } from "../components/common/LoadingStates";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, CheckCircle2, XCircle } from "lucide-react";

export interface AuthPageProps {
  initialMode?: "sign-in" | "sign-up";
  onSwitchMode?: (mode: "sign-in" | "sign-up") => void;
  onBackToLanding?: () => void;
}

export function AuthPage({ initialMode = "sign-in", onSwitchMode, onBackToLanding }: AuthPageProps) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const handleModeChange = (newMode: "sign-in" | "sign-up") => {
    setMode(newMode);
    setMessage("");
    setSuccessMessage("");
    setConfirmPassword("");
    onSwitchMode?.(newMode);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setSuccessMessage("");

    if (mode === "sign-up" && password !== confirmPassword) {
      setMessage("Passwords do not match. Please verify both passwords.");
      setBusy(false);
      return;
    }
    try {
      if (mode === "sign-in") {
        await login(email, password);
      } else {
        await register(email, password);
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          setSuccessMessage(
            "Account created! If email confirmation is enabled in your Supabase project, please check your inbox to confirm before signing in."
          );
          setMode("sign-in");
          setBusy(false);
        }
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Authentication failed"
      );
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f4fbf7] via-[#ebf7f1] to-slate-100 p-4 overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute h-96 w-96 rounded-full bg-emerald-400/20 blur-3xl -top-20 -left-20 pointer-events-none" />
      <div className="absolute h-96 w-96 rounded-full bg-teal-400/20 blur-3xl -bottom-20 -right-20 pointer-events-none" />

      {/* Main Authentication Card */}
      <div className="relative w-full max-w-md rounded-3xl border border-emerald-100/90 bg-white/95 p-7 sm:p-8 shadow-2xl shadow-emerald-950/10 backdrop-blur-xl text-slate-900">
        {onBackToLanding && (
          <button
            type="button"
            onClick={onBackToLanding}
            className="absolute top-5 left-5 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-50/80 hover:bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-200/60 transition cursor-pointer"
          >
            ← Back
          </button>
        )}
        {/* Brand Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-white border border-emerald-100 shadow-md shadow-emerald-950/5 mb-1">
            <img
              src="/logo.png"
              alt="Likhe Rakho"
              className="h-12 w-12 rounded-xl object-contain"
            />
          </div>
          <div>
            <div className="text-base font-extrabold tracking-tight flex items-center justify-center gap-1">
              <span className="text-[#064e3b]">Likhe</span>
              <span className="text-[#00a859]">Rakho</span>
            </div>
            <div className="text-xs font-semibold text-[#064e3b]/90 mt-1">
              “Remember less, manage more with Likhe Rakho.”
            </div>

            <h1 className="mt-3.5 text-2xl font-black tracking-tight text-slate-900">
              {mode === "sign-in" ? "Welcome Back" : "Create Free Account"}
            </h1>
            <p className="mt-1.5 text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
              {mode === "sign-in"
                ? "Access your household expenses, vehicle papers, warranties, and emergency documents in seconds."
                : "Never lose important documents or miss expensive renewal deadlines again. All your records in one place."}
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-emerald-50/80 border border-emerald-200/70 mb-5 text-xs font-semibold shadow-xs">
          <button
            type="button"
            onClick={() => handleModeChange("sign-in")}
            className={`py-2.5 rounded-xl transition cursor-pointer text-center ${
              mode === "sign-in"
                ? "bg-gradient-to-r from-[#064e3b] to-[#0d825c] text-white shadow-sm shadow-emerald-950/20 font-bold"
                : "text-emerald-900/70 hover:text-emerald-950 font-semibold"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("sign-up")}
            className={`py-2.5 rounded-xl transition cursor-pointer text-center ${
              mode === "sign-up"
                ? "bg-gradient-to-r from-[#064e3b] to-[#0d825c] text-white shadow-sm shadow-emerald-950/20 font-bold"
                : "text-emerald-900/70 hover:text-emerald-950 font-semibold"
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Email Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700/60 pointer-events-none">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700/60 pointer-events-none">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-800 transition cursor-pointer p-0.5"
                title={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password Input (Sign Up Mode Only) */}
          {mode === "sign-up" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Confirm Password
                </label>
                {confirmPassword.length > 0 && (
                  <div className="flex items-center gap-1">
                    {password === confirmPassword ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Passwords Match</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                        <XCircle className="h-3.5 w-3.5 text-rose-500" />
                        <span>Passwords Do Not Match</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700/60 pointer-events-none">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="••••••••"
                  className={`w-full rounded-xl border pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition font-mono ${
                    confirmPassword.length > 0
                      ? password === confirmPassword
                        ? "border-emerald-500 bg-emerald-50/20 focus:ring-4 focus:ring-emerald-500/10"
                        : "border-rose-400 bg-rose-50/20 focus:ring-4 focus:ring-rose-500/10"
                      : "border-slate-200 bg-slate-50/70 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-800 transition cursor-pointer p-0.5"
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Error & Success Alerts */}
          {message && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-700 font-medium">
              {message}
            </div>
          )}
          {successMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 text-xs text-emerald-800 font-medium">
              {successMessage}
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={busy}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-tr from-[#064e3b] to-[#0d825c] px-4 py-3 text-xs font-bold text-white shadow-md shadow-emerald-950/20 hover:from-[#073f30] hover:to-[#0b6e4e] active:scale-[0.99] transition cursor-pointer disabled:opacity-50"
          >
            <span>
              {mode === "sign-in"
                ? "Sign In to Vault"
                : "Create Free Account"}
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>

        {/* Security Badge Footer */}
        <div className="mt-6 pt-4 border-t border-emerald-100 flex items-center justify-center gap-1.5 text-[11px] text-emerald-900/80 font-semibold bg-emerald-50/50 py-2.5 px-3 rounded-xl border border-emerald-100/60">
          <ShieldCheck className="h-4 w-4 text-[#00a859] shrink-0" />
          <span>100% Encrypted & Secure Personal Vault</span>
        </div>
      </div>

      {/* Multi-Phase Full-Screen Animated Sign In Overlay */}
      {busy && (
        <SigninOverlay
          email={email}
          customMessage={
            mode === "sign-in"
              ? "Verifying Credentials & Unlocking..."
              : "Creating Encrypted Vault..."
          }
        />
      )}
    </div>
  );
}
