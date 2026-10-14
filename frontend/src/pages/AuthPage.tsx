import { useState } from "react";
import { login, register } from "../services/api";
import { supabase } from "../lib/supabase";
import { SigninOverlay } from "../components/common/LoadingStates";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight } from "lucide-react";

export function AuthPage() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setSuccessMessage("");
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
    <div className="relative flex min-h-screen items-center justify-center bg-slate-900 p-4 overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl -top-20 -left-20 pointer-events-none" />
      <div className="absolute h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl -bottom-20 -right-20 pointer-events-none" />

      {/* Main Authentication Card */}
      <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950/80 p-7 sm:p-8 shadow-2xl backdrop-blur-xl text-white">
        {/* Brand Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-slate-900 border border-slate-800 shadow-md mb-1">
            <img
              src="/logo.png"
              alt="LifeNest"
              className="h-10 w-10 rounded-xl object-contain shadow-md shadow-blue-500/20"
            />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400 font-mono">
              LifeNest OS
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
              {mode === "sign-in" ? "Welcome Back" : "Create Vault Account"}
            </h1>
            <p className="mt-1.5 text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              {mode === "sign-in"
                ? "Enter your credentials to unlock your encrypted personal and family vault."
                : "Organize your documents, assets, expenses, rentals, and tasks in one secure space."}
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-900 border border-slate-800 mb-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode("sign-in");
              setMessage("");
              setSuccessMessage("");
            }}
            className={`py-2 rounded-lg transition cursor-pointer text-center ${
              mode === "sign-in"
                ? "bg-slate-800 text-white shadow-xs font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("sign-up");
              setMessage("");
              setSuccessMessage("");
            }}
            className={`py-2 rounded-lg transition cursor-pointer text-center ${
              mode === "sign-up"
                ? "bg-slate-800 text-white shadow-xs font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Email Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 focus:bg-slate-900 transition"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 focus:bg-slate-900 transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition cursor-pointer p-0.5"
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

          {/* Error & Success Alerts */}
          {message && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300 font-medium">
              {message}
            </div>
          )}
          {successMessage && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs text-emerald-300 font-medium">
              {successMessage}
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={busy}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 active:scale-[0.99] transition cursor-pointer disabled:opacity-50"
          >
            <span>{mode === "sign-in" ? "Sign In to Vault" : "Create Secure Vault"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>

        {/* Security Badge Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>AES-256 Encrypted Session & Data Storage</span>
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
