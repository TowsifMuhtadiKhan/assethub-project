import { useEffect, useState, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { AuthPage } from "../../pages/AuthPage";
import { LandingPage } from "../../pages/LandingPage";
import { supabase } from "../../lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { AnimatedPageLoader, SigninOverlay } from "../common/LoadingStates";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWelcoming, setIsWelcoming] = useState(false);
  const initialCheckDone = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: { user }, error } = await supabase.auth.getUser().catch(() => ({ data: { user: null }, error: true }));
        if (!user || error) {
          // Stale / expired session: auto sign out cleanly
          await supabase.auth.signOut().catch(() => {});
          setSession(null);
        } else {
          setSession(session);
        }
      } else {
        setSession(null);
      }
      setLoading(false);
      initialCheckDone.current = true;
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "SIGNED_OUT") {
        setSession(null);
        setLoading(false);
        return;
      }
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
        message="Loading Likhe Rakho..."
        subtitle="Connecting encrypted vault & session"
      />
    );
  }

  if (isWelcoming) {
    return <SigninOverlay email={session?.user?.email} />;
  }

  if (!session) {
    // On native mobile APK (Capacitor Android/iOS), show mobile AuthPage directly
    if (Capacitor.isNativePlatform()) {
      return <AuthPage />;
    }
    // On Web: show landing marketing page with Sign Up & Sign In
    return <LandingPage />;
  }
  return <>{children}</>;
}
