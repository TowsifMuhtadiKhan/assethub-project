import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://rbrseemfyiqcdezxhssx.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_92TM31rqlGU11iEeaRlfHQ_rDEtYluh";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
