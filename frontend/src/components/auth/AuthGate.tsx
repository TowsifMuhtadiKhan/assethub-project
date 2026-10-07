import { useEffect, useState } from "react";
import { AuthPage } from "../../pages/AuthPage";
import { supabase } from "../../lib/supabase";
import type { Session } from "@supabase/supabase-js";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-sm font-semibold text-slate-500">Loading AssetHub...</div>
      </div>
    );
  }

  if (!session) return <AuthPage />;
  return <>{children}</>;
}
