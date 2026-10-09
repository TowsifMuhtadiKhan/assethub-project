import { useState } from "react";
import { Database, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";

export function SqlSetupBanner({ error }: { error?: string }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Detect if error is the classic missing Supabase table error PGRST205
  const isMissingTable = Boolean(
    error?.includes("PGRST205") ||
    error?.toLowerCase().includes("could not find the table") ||
    error?.toLowerCase().includes("schema cache")
  );

  if (!isMissingTable) return null;

  const copyPath = () => {
    navigator.clipboard.writeText("frontend/supabase/schema.sql");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-amber-50/90 p-3.5 text-xs text-amber-900 shadow-xs">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-800 shrink-0 mt-0.5">
            <Database className="h-4 w-4" />
          </div>
          <div>
            <div className="font-bold text-amber-950 flex items-center gap-1.5 text-[12px]">
              <span>Supabase Database Schema Setup Required</span>
              <span className="rounded-full bg-amber-200/80 px-2 py-0.2 text-[10px] font-semibold text-amber-900">
                1-Time Step
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-amber-800/90">
              Your Supabase tables (<code>lifenest_*</code>) haven't been created in your database yet. Run the SQL script in your Supabase SQL Editor to activate full database storage.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-9 sm:ml-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-300/80 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100/50 shadow-2xs"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            <span>{expanded ? "Hide Steps" : "How to fix in 10s"}</span>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-amber-200/70 space-y-2 text-[11px] text-amber-900">
          <div className="font-semibold text-amber-950">Quick 2-step setup:</div>
          <ol className="list-decimal list-inside space-y-1.5 pl-1">
            <li>
              Open your Supabase project dashboard (<code>https://supabase.com/dashboard/project/rbrseemfyiqcdezxhssx</code>) and click on <strong>SQL Editor</strong> on the left menu.
            </li>
            <li>
              Copy the contents of <strong className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-amber-300">frontend/supabase/schema.sql</strong> and click <strong>Run</strong>.
            </li>
          </ol>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={copyPath}
              className="inline-flex items-center gap-1 rounded-md bg-amber-900 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-amber-800"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Path Copied!" : "Copy schema.sql file path"}
            </button>
            <span className="text-[10px] text-amber-700">All tables are safe and namespaced with <code>lifenest_</code> to never conflict with your other projects.</span>
          </div>
        </div>
      )}
    </div>
  );
}
