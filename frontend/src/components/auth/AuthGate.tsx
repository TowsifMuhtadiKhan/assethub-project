import { useEffect, useState, useRef } from "react";
import { AuthPage } from "../../pages/AuthPage";
import { supabase } from "../../lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { AnimatedPageLoader, SigninOverlay } from "../common/LoadingStates";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWelcoming, setIsWelcoming] = useState(false);
  const initialCheckDone = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      initialCheckDone.current = true;
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // If user just signed in from AuthPage, show smooth welcoming transition
      if (initialCheckDone.current && event === "SIGNED_IN" && nextSession) {
        setIsWelcoming(true);
        setSession(nextSession);
        setLoading(false);
        setTimeout(() => {
          setIsWelcoming(false);
        }, 1150);
      } else {
        setSession(nextSession);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <AnimatedPageLoader
        message="Loading LifeNest..."
        subtitle="Connecting encrypted vault & session"
      />
    );
  }

  if (isWelcoming) {
    return <SigninOverlay email={session?.user?.email} />;
  }

  if (!session) return <AuthPage />;
  return <>{children}</>;
}
