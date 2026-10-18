import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://rbrseemfyiqcdezxhssx.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_92TM31rqlGU11iEeaRlfHQ_rDEtYluh";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Validates the current user session.
 * If the session is invalid or expired, automatically logs out so the user isn't stuck.
 */
export async function requireAuthUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    try {
      await supabase.auth.signOut();
    } catch {}
    localStorage.removeItem("assethub-api-token");
    localStorage.removeItem("assethub-api-user-email");
    window.location.href = "/";
    throw new Error("Session expired. Please log in again.");
  }

  return user;
}
