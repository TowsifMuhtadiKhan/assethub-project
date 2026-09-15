import { useEffect, useState } from "react";
import { AuthPage } from "../../pages/AuthPage";
import { getToken } from "../../services/api";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState(getToken());

  useEffect(() => {
    setSession(getToken());
  }, []);

  if (!session) return <AuthPage />;
  return children;
}
