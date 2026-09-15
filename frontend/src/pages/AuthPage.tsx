import { useState } from "react";
import { login, register } from "../services/api";

export function AuthPage() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (mode === "sign-in") await login(email, password);
      else await register(email, password);
      window.location.reload();
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
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-600">
            AssetHub
          </div>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            {mode === "sign-in"
              ? "Sign in to your account"
              : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Your vehicles, expenses, maintenance, and files stay separated from
            other users.
          </p>
        </div>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address"
          className="field w-full"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          className="field w-full"
        />
        {message && <p className="text-sm text-rose-600">{message}</p>}
        <button
          disabled={busy}
          className="w-full rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
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
          }}
          className="w-full text-sm font-semibold text-cyan-700"
        >
          {mode === "sign-in"
            ? "Create a new account"
            : "I already have an account"}
        </button>
      </form>
    </div>
  );
}
