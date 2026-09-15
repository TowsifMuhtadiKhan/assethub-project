import {
  BarChart3,
  Bell,
  Building2,
  Car,
  ChevronDown,
  CreditCard,
  FileText,
  Gauge,
  House,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { clearToken, hasApiConnection } from "../../services/api";

const navGroups = [
  {
    title: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/reports", label: "Reports", icon: BarChart3 },
      { to: "/documents", label: "Documents", icon: FileText },
      { to: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    title: "Vehicles",
    items: [
      { to: "/vehicles/cars", label: "Cars", icon: Car },
      { to: "/vehicles/bikes", label: "Bikes", icon: Gauge },
      { to: "/vehicles/services", label: "Maintenance", icon: ShieldCheck },
      { to: "/vehicles/expenses", label: "Expenses", icon: CreditCard },
    ],
  },
  {
    title: "Property",
    items: [
      { to: "/properties", label: "Properties", icon: Building2 },
      { to: "/units", label: "Units", icon: House },
      { to: "/tenants", label: "Tenants", icon: Users },
      { to: "/rent-collection", label: "Rent Collection", icon: CreditCard },
      { to: "/property-expenses", label: "Expenses", icon: FileText },
    ],
  },
];

export function Sidebar() {
  return (
    <aside className="hidden h-screen w-72 shrink-0 border-r border-slate-200 bg-slate-950 p-5 text-slate-100 lg:fixed lg:left-0 lg:top-0 lg:flex lg:flex-col">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-600 font-bold text-white">
          A
        </div>
        <div>
          <div className="text-lg font-semibold">AssetHub</div>
          <div className="text-xs text-slate-400">Management Suite</div>
        </div>
      </div>

      <nav className="space-y-6">
        {navGroups.map((group) => (
          <div key={group.title}>
            <div className="mb-3 flex items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              <span>{group.title}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </div>
            <div className="space-y-1.5">
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? "bg-slate-800 text-white shadow-inner shadow-slate-700/50"
                        : "text-slate-300 hover:bg-slate-900 hover:text-white"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
          System
        </div>
        <div className="mt-3 text-sm font-medium text-slate-200">
          {hasApiConnection ? "API Connected" : "API not configured"}
        </div>
        <div
          className={`mt-1 text-xs ${hasApiConnection ? "text-emerald-400" : "text-amber-400"}`}
        >
          {hasApiConnection ? "JWT + user data enabled" : "Add API URL"}
        </div>
        {hasApiConnection && (
          <button
            type="button"
            onClick={() => {
              clearToken();
              window.location.reload();
            }}
            className="mt-4 text-xs font-semibold text-slate-400 hover:text-white"
          >
            Sign out
          </button>
        )}
      </div>
    </aside>
  );
}
