import { useEffect, useState } from "react";
import { AuthPage } from "../../pages/AuthPage";
import { supabase } from "../../lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { AnimatedPageLoader } from "../common/LoadingStates";

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
      <AnimatedPageLoader
        message="Loading AssetHub..."
        subtitle="Connecting encrypted vault & session"
      />
    );
  }

  if (!session) return <AuthPage />;
  return <>{children}</>;
}
