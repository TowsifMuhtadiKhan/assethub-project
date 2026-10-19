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
  Globe,
  ArrowLeft,
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
    <div className="min-h-screen w-full bg-[#07130D] text-slate-100 flex flex-col lg:grid lg:grid-cols-12 selection:bg-[#7EE0AC] selection:text-[#07130D]">
      {/* ===================================================================
          LEFT BRAND & STORYTELLING PANEL (Col 1-6 or 1-7)
          =================================================================== */}
      <div className="relative lg:col-span-6 xl:col-span-7 bg-[#0C1E16] border-b lg:border-b-0 lg:border-r border-[#153423] p-6 sm:p-10 lg:p-16 flex flex-col justify-between overflow-hidden">
        {/* Subtle Ambient Glow Backgrounds */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#1A422E]/40 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#123623]/30 blur-3xl pointer-events-none" />

        {/* Top: Brand Logo Card */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl shadow-xl shadow-black/20 border border-white/20">
            <img
              src="/logo.png"
              alt="Likhe Rakho Logo"
              className="h-9 w-9 object-contain rounded-lg"
            />
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tight text-[#071A11] leading-none">
                Likhe Rakho
              </span>
              <span className="text-[10px] font-semibold text-[#00a859] mt-0.5">
                Family Asset Management
              </span>
            </div>
          </div>

          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A2C7B1] hover:text-white bg-[#10291D] hover:bg-[#153626] px-3 py-1.5 rounded-xl border border-[#1C4730] transition cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
          )}
        </div>

        {/* Center: Editorial Slogan & Numbered Highlights */}
        <div className="relative z-10 my-12 lg:my-auto max-w-xl">
          <p className="text-[10.5px] font-bold tracking-[0.22em] text-[#749D84] uppercase">
            A little order. A lot of peace of mind.
          </p>

          <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.15]">
            Everything you own. <br />
            <span className="font-serif italic font-normal text-[#8FE3B0]">
              Remembered together.
            </span>
          </h1>

          <p className="mt-5 text-xs sm:text-sm text-[#A0C0AF] leading-relaxed max-w-lg">
            A thoughtful, secure vault for your family’s assets, financial records, rent collections, vehicle documents, and the details that matter.
          </p>

          {/* Numbered Feature List */}
          <div className="mt-8 sm:mt-10 space-y-4 pt-6 border-t border-[#163625]">
            <div className="flex items-center gap-4 text-xs">
              <span className="font-mono text-[#58856B] font-bold text-xs">01</span>
              <span className="text-[#CFE3D7] font-medium">Know what you have in one organized dashboard</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="font-mono text-[#58856B] font-bold text-xs">02</span>
              <span className="text-[#CFE3D7] font-medium">Keep the right people informed with 24/7 automated WhatsApp reminders</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="font-mono text-[#58856B] font-bold text-xs">03</span>
              <span className="text-[#CFE3D7] font-medium">Make room for peace of mind across generations</span>
            </div>
          </div>
        </div>

        {/* Bottom Left: Security & Region Badge */}
        <div className="relative z-10 flex items-center gap-2 text-[11px] text-[#6E957E] pt-6 border-t border-[#132F20] lg:border-t-0">
          <ShieldCheck className="h-4 w-4 text-[#7EE0AC] shrink-0" />
          <span>Private encrypted family workspace &bull; বাংলাদেশ</span>
        </div>
      </div>

      {/* ===================================================================
          RIGHT AUTHENTICATION FORM PANEL (Col 7-12 or 8-12)
          =================================================================== */}
      <div className="lg:col-span-6 xl:col-span-5 bg-[#07130D] p-6 sm:p-12 lg:p-16 flex flex-col justify-between items-center">
        <div className="w-full max-w-sm my-auto">
          {/* Form Header */}
          <div className="mb-7">
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#58856B] uppercase block">
              Your Family's Digital Memory
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {mode === "sign-in" ? "Welcome back" : "Create an account"}
            </h2>
            <p className="mt-1 text-xs text-[#87A895]">
              {mode === "sign-in"
                ? "Sign in to access your family workspace."
                : "Start organizing your family records and assets."}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-4">
            {/* Email Address */}
            <div>
              <label className="block text-xs font-medium text-[#B2CEC0] mb-1.5">
                Email address
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
                className="w-full rounded-xl bg-[#0C1E16] border border-[#173926] px-3.5 py-2.5 text-xs text-white placeholder-[#4E735E] outline-none focus:border-[#7EE0AC] focus:ring-1 focus:ring-[#7EE0AC] transition"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-[#B2CEC0]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] font-medium text-[#749D84] hover:text-[#7EE0AC] transition flex items-center gap-1 cursor-pointer"
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
                className="w-full rounded-xl bg-[#0C1E16] border border-[#173926] px-3.5 py-2.5 text-xs text-white placeholder-[#4E735E] outline-none focus:border-[#7EE0AC] focus:ring-1 focus:ring-[#7EE0AC] transition font-mono"
              />
            </div>

            {/* Confirm Password (Sign-up only) */}
            {mode === "sign-up" && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-[#B2CEC0]">
                    Confirm Password
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-[11px] font-medium text-[#749D84] hover:text-[#7EE0AC] transition flex items-center gap-1 cursor-pointer"
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
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#7EE0AC]">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Matched</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400">
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
                  className={`w-full rounded-xl bg-[#0C1E16] border px-3.5 py-2.5 text-xs text-white placeholder-[#4E735E] outline-none transition font-mono ${
                    confirmPassword.length > 0
                      ? password === confirmPassword
                        ? "border-[#7EE0AC] focus:border-[#7EE0AC]"
                        : "border-rose-500 focus:border-rose-400"
                      : "border-[#173926] focus:border-[#7EE0AC]"
                  }`}
                />
              </div>
            )}

            {/* Alerts */}
            {message && (
              <div className="rounded-xl border border-rose-900/50 bg-rose-950/40 p-3 text-xs text-rose-300">
                {message}
              </div>
            )}
            {successMessage && (
              <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 p-3 text-xs text-[#8FE3B0]">
                {successMessage}
              </div>
            )}

            {/* Mint Action Button */}
            <button
              type="submit"
              disabled={busy}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#7EE0AC] hover:bg-[#6ed49e] active:scale-[0.99] py-3 text-xs font-bold text-[#071A11] shadow-lg shadow-[#7EE0AC]/10 transition cursor-pointer disabled:opacity-50"
            >
              <span>{mode === "sign-in" ? "Sign in" : "Create account"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          {/* Secondary Links */}
          <div className="mt-5 flex items-center justify-between text-xs text-[#87A895]">
            {mode === "sign-in" ? (
              <>
                <button
                  type="button"
                  onClick={() => alert("Password reset instructions will be sent to your email address if registered.")}
                  className="hover:text-white transition cursor-pointer"
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("sign-up")}
                  className="text-[#7EE0AC] hover:underline font-semibold transition cursor-pointer"
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                <span className="text-[#648B74]">Already have an account?</span>
                <button
                  type="button"
                  onClick={() => handleModeChange("sign-in")}
                  className="text-[#7EE0AC] hover:underline font-semibold transition cursor-pointer"
                >
                  Sign in
                </button>
              </>
            )}
          </div>

          {/* Release / Footnote Notice */}
          <div className="mt-8 pt-6 border-t border-[#132F20] text-[11px] text-[#58856B] leading-relaxed">
            Foundation release &bull; Family asset records, vehicle documents, and 24/7 autonomous WhatsApp reminders.
          </div>
        </div>

        {/* Bottom Theme & Language Bar */}
        <div className="w-full max-w-sm mt-8 flex items-center justify-between text-[11px] text-[#58856B]">
          <div className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-[#4E735E]" />
            <span>বাংলা / English</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0C1E16] border border-[#173926] text-[#749D84]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7EE0AC]" />
            <span>Theme: Forest Night</span>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {busy && (
        <SigninOverlay
          email={email}
          customMessage={
            mode === "sign-in"
              ? "Verifying Credentials & Unlocking..."
              : "Creating Encrypted Family Workspace..."
          }
        />
      )}
    </div>
  );
}
