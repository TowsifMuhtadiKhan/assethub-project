import type { DashboardStat } from "../../types";

export function StatCard({ stat }: { stat: DashboardStat }) {
  const toneClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    rose: "bg-rose-50 text-rose-700 ring-rose-200",
    violet: "bg-violet-50 text-violet-700 ring-violet-200",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-500">{stat.label}</div>
          <div className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {stat.value}
          </div>
        </div>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${toneClasses[stat.tone ?? "blue"]}`}
        >
          {stat.change}
        </span>
      </div>
    </div>
  );
}
