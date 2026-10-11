import { useState } from "react";
import { login, register } from "../services/api";
import { supabase } from "../lib/supabase";

export function AuthPage() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
            "Account created! If email confirmation is enabled in your Supabase project, please check your inbox to confirm before signing in.",
          );
          setMode("sign-in");
        }
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Authentication failed",
      );
    }
    setBusy(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"
      >
        <div>
          <div className="flex items-center gap-3 mb-3">
            <img
              src="/logo.png"
              alt="LifeNest"
              className="h-10 w-10 rounded-xl object-contain shadow-md shadow-blue-500/20"
            />
            <div className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
              LifeNest
            </div>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            {mode === "sign-in"
              ? "Sign in to LifeNest"
              : "Create your LifeNest account"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Organize your documents, family records, assets, rentals, tasks, and
            reminders in one secure personal operating system.
          </p>
        </div>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-cyan-500"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-cyan-500"
        />
        {message && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600">
            {message}
          </div>
        )}
        {successMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        )}
        <button
          disabled={busy}
          className="w-full rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-50"
        >
          {busy
            ? "Please wait..."
            : mode === "sign-in"
              ? "Sign in"
              : "Create account"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "sign-in" ? "sign-up" : "sign-in");
            setMessage("");
            setSuccessMessage("");
          }}
          className="w-full text-sm font-semibold text-cyan-700 hover:underline"
        >
          {mode === "sign-in"
            ? "Create a new account"
            : "I already have an account"}
        </button>
      </form>
    </div>
  );
}
