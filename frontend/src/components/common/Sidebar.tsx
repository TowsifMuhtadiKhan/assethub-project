import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Bell,
  FileText,
  Award,
  Car,
  Building2,
  ShieldCheck,
  Users,
  Settings,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const navGroups = [
  {
    title: "General",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "My Life",
    items: [
      { to: "/my-life/tasks", label: "Tasks & To-Dos", icon: CheckSquare },
      { to: "/my-life/calendar", label: "Schedule", icon: Calendar },
      { to: "/notifications", label: "WhatsApp & Alerts", icon: Bell },
    ],
  },
  {
    title: "Vault",
    items: [
      { to: "/documents/vault", label: "Document Vault", icon: FileText },
      { to: "/documents/licenses", label: "Licenses & Permits", icon: Award },
    ],
  },
  {
    title: "Assets & Rentals",
    items: [
      { to: "/assets/vehicles/cars", label: "Vehicles & Fuel", icon: Car },
      { to: "/assets/warranties", label: "Warranties & Receipts", icon: ShieldCheck },
      { to: "/rentals/properties", label: "Properties & Rent", icon: Building2 },
    ],
  },
  {
    title: "Workspace",
    items: [
      { to: "/family/profiles", label: "Family Profiles", icon: Users },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  return (
    <aside className="hidden h-screen w-60 shrink-0 border-r border-slate-200/90 bg-white p-3 text-slate-800 lg:fixed lg:left-0 lg:top-0 lg:flex lg:flex-col shadow-[1px_0_4px_rgba(0,0,0,0.02)]">
      {/* Brand Header */}
      <div className="mb-4 flex items-center justify-between px-2 pt-1 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 text-xs font-bold text-white shadow-xs">
            LN
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-slate-900 leading-none">
              LifeNest
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
              Family & Personal OS
            </div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700 border border-emerald-200/60">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Online
        </span>
      </div>

      {/* Nav List */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-1">
        {navGroups.map((group) => (
          <div key={group.title}>
            <div className="mb-1 px-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {group.title}
            </div>
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-slate-100 text-slate-950 font-semibold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`
                  }
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  <span className="truncate">{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Info */}
      <div className="border-t border-slate-100 pt-2 px-1">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Storage</span>
          <span className="font-mono text-slate-600 font-medium">Supabase RLS</span>
        </div>
      </div>
    </aside>
  );
}
