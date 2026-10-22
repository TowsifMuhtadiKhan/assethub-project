import { useState } from "react";
import { login, register } from "../services/api";
import { supabase } from "../lib/supabase";
import { SigninOverlay } from "../components/common/LoadingStates";
import {
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Sparkles,
  Receipt,
  Car,
  Building2,
  FileText,
} from "lucide-react";

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
    const cleanEmail = email.trim().toLowerCase();
    try {
      if (mode === "sign-in") {
        await login(cleanEmail, password);
      } else {
        await register(cleanEmail, password);
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
      const raw = error instanceof Error ? error.message : "Authentication failed";
      if (raw.includes("Load failed") || raw.includes("Failed to fetch") || raw.includes("NetworkError")) {
        setMessage("Connection failed. Please check your internet connection and try again.");
      } else {
        setMessage(raw);
      }
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f6faf7] text-slate-900 flex flex-col lg:grid lg:grid-cols-12 selection:bg-emerald-200 selection:text-emerald-950 font-sans">
      {/* ===================================================================
          LEFT BRAND & FEATURES HERO PANEL (Col 1-7, Desktop only)
          =================================================================== */}
      <div className="hidden lg:flex relative lg:col-span-6 xl:col-span-7 bg-gradient-to-br from-white via-[#f6faf7] to-[#ebf7f0]/60 border-r border-slate-200/80 p-8 lg:p-12 xl:p-16 flex-col justify-between overflow-hidden text-slate-900">
        {/* Soft Ambient Radial Lights */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-emerald-200/30 via-teal-100/20 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-emerald-100/40 blur-3xl pointer-events-none" />

        {/* Top Header: Likhe Rakho Logo & Back Button */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-3 bg-white px-4 py-2 rounded-2xl shadow-xs border border-slate-200/80">
            <img
              src="/logo.png"
              alt="Likhe Rakho"
              className="h-9 w-9 object-contain rounded-lg"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-sm font-black tracking-tight text-[#064e3b]">Likhe</span>
                <span className="text-sm font-black tracking-tight text-[#0d825c]">Rakho</span>
                <span className="text-[11px] font-bold text-slate-500 ml-0.5">(লিখে রাখো)</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-500">
                Family Asset & Finance Vault
              </span>
            </div>
          </div>

          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs transition cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
              <span>Back to Home</span>
            </button>
          )}
        </div>

        {/* Center: Likhe Rakho Core Story & Value Pillars */}
        <div className="relative z-10 my-auto py-8 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/90 text-[#064e3b] text-xs font-bold mb-5 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>Remember less, manage more with Likhe Rakho</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
            Everything you own. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#064e3b] via-[#0d825c] to-[#00a859] font-serif italic font-normal">
              Remembered together.
            </span>
          </h1>

          <p className="mt-4 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg">
            আপনার পরিবারের সমস্ত সম্পদ, খরচ ও জরুরি নথিপত্র এক জায়গায়। Never lose important documents or miss expensive renewal deadlines again.
          </p>

          {/* Likhe Rakho 4 Core Modules List */}
          <div className="mt-8 space-y-3 pt-6 border-t border-slate-200/80">
            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/90 border border-slate-200/70 shadow-2xs hover:border-emerald-300 transition">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200/70 text-[#064e3b] shrink-0">
                <Receipt className="h-4 w-4 text-[#064e3b]" />
              </div>
              <div>
                <span className="text-slate-900 font-bold text-xs block">Household & Family Expenses</span>
                <span className="text-slate-500 text-[11px] block">দৈনন্দিন খরচ, বাজার ও বাজেট ট্র্যাকিং</span>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/90 border border-slate-200/70 shadow-2xs hover:border-emerald-300 transition">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200/70 text-[#064e3b] shrink-0">
                <Car className="h-4 w-4 text-[#064e3b]" />
              </div>
              <div>
                <span className="text-slate-900 font-bold text-xs block">Vehicles & Automated WhatsApp Alerts</span>
                <span className="text-slate-500 text-[11px] block">ট্যাক্স টোকেন, ফিটনেস ও রিনিউয়াল নোটিফিকেশন</span>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/90 border border-slate-200/70 shadow-2xs hover:border-emerald-300 transition">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200/70 text-[#064e3b] shrink-0">
                <Building2 className="h-4 w-4 text-[#064e3b]" />
              </div>
              <div>
                <span className="text-slate-900 font-bold text-xs block">Properties, Units & Rent Tracking</span>
                <span className="text-slate-500 text-[11px] block">ভাড়াটিয়া, চুক্তিপত্র ও ভাড়ার রশিদ ব্যবস্থাপনা</span>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/90 border border-slate-200/70 shadow-2xs hover:border-emerald-300 transition">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200/70 text-[#064e3b] shrink-0">
                <FileText className="h-4 w-4 text-[#064e3b]" />
              </div>
              <div>
                <span className="text-slate-900 font-bold text-xs block">Encrypted Document Vault</span>
                <span className="text-slate-500 text-[11px] block">জরুরি কাগজপত্র, এনআইডি ও ওয়ারেন্টি কার্ড</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Left: Trust & Encryption Footnote */}
        <div className="relative z-10 flex items-center gap-2 text-[11px] text-slate-500 pt-6 border-t border-slate-200/80">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>100% Encrypted & Secure Family Vault &bull; বাংলাদেশ</span>
        </div>
      </div>

      {/* ===================================================================
          RIGHT AUTHENTICATION FORM PANEL (Mobile: Full Screen, Desktop: Col 8-12)
          =================================================================== */}
      <div className="w-full min-h-screen lg:min-h-0 lg:col-span-6 xl:col-span-5 bg-[#f6faf7] p-4 sm:p-8 lg:p-12 xl:p-16 flex flex-col justify-between items-center text-slate-900 relative">
        {/* Mobile-Only Header with Logo & Back Button */}
        <div className="w-full max-w-sm mb-4 flex items-center justify-between lg:hidden pt-2">
          <div className="inline-flex items-center gap-2.5 bg-white px-3 py-1.5 rounded-2xl shadow-xs border border-slate-200/90">
            <img
              src="/logo.png"
              alt="Likhe Rakho"
              className="h-7 w-7 object-contain rounded-lg"
            />
            <div className="flex flex-col">
              <div className="text-xs font-black tracking-tight leading-none text-slate-900">
                Likhe<span className="text-[#0d825c]">Rakho</span>
              </div>
              <span className="text-[9px] font-semibold text-slate-500 leading-none mt-0.5">
                Family Vault
              </span>
            </div>
          </div>

          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs transition cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
          )}
        </div>

        <div className="w-full max-w-sm my-auto bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-950/5">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 border border-slate-200/80 mb-6 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleModeChange("sign-in")}
              className={`py-2.5 rounded-xl transition cursor-pointer text-center ${
                mode === "sign-in"
                  ? "bg-gradient-to-tr from-[#064e3b] to-[#0d825c] text-white font-bold shadow-sm shadow-emerald-950/20"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("sign-up")}
              className={`py-2.5 rounded-xl transition cursor-pointer text-center ${
                mode === "sign-up"
                  ? "bg-gradient-to-tr from-[#064e3b] to-[#0d825c] text-white font-bold shadow-sm shadow-emerald-950/20"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Create Free Account
            </button>
          </div>

          {/* Form Header */}
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {mode === "sign-in" ? "Welcome Back" : "Create Free Account"}
            </h2>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              {mode === "sign-in"
                ? "Access your household expenses, vehicle papers, and family documents in seconds."
                : "Get started with your private personal vault. Never lose important records again."}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-4">
            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl bg-white border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#064e3b] focus:ring-2 focus:ring-[#064e3b]/20 transition shadow-2xs"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] font-semibold text-[#0d825c] hover:text-[#064e3b] transition flex items-center gap-1 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="h-3 w-3" />
                      <span>Hide</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3" />
                      <span>Show</span>
                    </>
                  )}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl bg-white border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#064e3b] focus:ring-2 focus:ring-[#064e3b]/20 transition shadow-2xs font-mono"
              />
            </div>

            {/* Confirm Password (Sign-up only) */}
            {mode === "sign-up" && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Confirm Password
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-[11px] font-semibold text-[#0d825c] hover:text-[#064e3b] transition flex items-center gap-1 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <>
                          <EyeOff className="h-3 w-3" />
                          <span>Hide</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3" />
                          <span>Show</span>
                        </>
                      )}
                    </button>
                    {confirmPassword.length > 0 && (
                      <div className="flex items-center gap-1">
                        {password === confirmPassword ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Matched</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600">
                            <XCircle className="h-3 w-3" />
                            <span>Mismatch</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="••••••••"
                  className={`w-full rounded-xl bg-white border px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition shadow-2xs font-mono ${
                    confirmPassword.length > 0
                      ? password === confirmPassword
                        ? "border-emerald-600 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                        : "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                      : "border-slate-200 focus:border-[#064e3b] focus:ring-2 focus:ring-[#064e3b]/20"
                  }`}
                />
              </div>
            )}

            {/* Alerts */}
            {message && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                {message}
              </div>
            )}
            {successMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                {successMessage}
              </div>
            )}

            {/* Action Button */}
            <button
              type="submit"
              disabled={busy}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-tr from-[#064e3b] to-[#0d825c] hover:from-[#073f30] hover:to-[#0b6e4e] active:scale-[0.99] py-3 text-xs font-bold text-white shadow-md shadow-emerald-950/20 transition cursor-pointer disabled:opacity-50"
            >
              <span>{mode === "sign-in" ? "Sign In to Vault" : "Create Free Account"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          {/* Secondary Links */}
          <div className="mt-5 flex items-center justify-between text-xs text-slate-600">
            {mode === "sign-in" ? (
              <>
                <button
                  type="button"
                  onClick={() => alert("Password reset instructions will be sent to your email address if registered.")}
                  className="hover:text-slate-900 transition cursor-pointer"
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("sign-up")}
                  className="text-[#064e3b] hover:text-[#0d825c] font-bold hover:underline transition cursor-pointer"
                >
                  Create free account
                </button>
              </>
            ) : (
              <>
                <span className="text-slate-500">Already have an account?</span>
                <button
                  type="button"
                  onClick={() => handleModeChange("sign-in")}
                  className="text-[#064e3b] hover:text-[#0d825c] font-bold hover:underline transition cursor-pointer"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>

        {/* Security Badge Footer */}
        <div className="w-full max-w-sm mt-8 pt-4 border-t border-slate-200/80 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>100% Encrypted & Secure Personal Vault</span>
        </div>
      </div>

      {/* Loading Overlay */}
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
