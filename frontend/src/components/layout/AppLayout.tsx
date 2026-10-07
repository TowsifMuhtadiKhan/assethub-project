import {
  Bell,
  CircleUserRound,
  Menu,
  Plus,
  Search,
  CheckSquare,
  FileText,
  Car,
  Building,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useNavigate, Outlet } from "react-router-dom";
import { useState } from "react";
import { Sidebar } from "../common/Sidebar";
import { clearToken, getUserEmail } from "../../services/api";

export function AppLayout() {
  const navigate = useNavigate();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="ml-0 flex min-w-0 flex-1 flex-col lg:ml-60">
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md lg:px-6">
            <div className="flex items-center gap-2.5">
              <button
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div className="hidden items-center gap-2 rounded-lg border border-slate-200/80 bg-slate-50/80 px-2.5 py-1.5 lg:flex">
                <Search className="h-3.5 w-3.5 text-slate-400" />
                <input
                  className="w-64 border-0 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
                  placeholder="Search docs, tasks, assets... (Ctrl+K)"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative">
                <button
                  type="button"
                  aria-label="Quick create menu"
                  onClick={() => setQuickAddOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create</span>
                </button>

                {quickAddOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setQuickAddOpen(false)}
                    />
                    <div className="absolute right-0 top-11 z-40 w-72 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-2xl ring-1 ring-slate-950/5 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3 py-2 border-b border-slate-100 mb-1">
                        <div className="text-xs font-bold text-slate-900">Quick Create</div>
                        <div className="text-[11px] text-slate-500">Record a new item in your personal hub</div>
                      </div>

                      <div className="space-y-0.5">
                        {[
                          {
                            label: "New Task & To-Do",
                            description: "Deadlines, bills & WhatsApp alerts",
                            path: "/my-life/tasks",
                            icon: CheckSquare,
                            color: "text-emerald-600 bg-emerald-50 border-emerald-100",
                          },
                          {
                            label: "Upload Document",
                            description: "Passports, NIDs, certificates",
                            path: "/documents/vault",
                            icon: FileText,
                            color: "text-indigo-600 bg-indigo-50 border-indigo-100",
                          },
                          {
                            label: "Add Vehicle",
                            description: "Cars, bikes, fuel & servicing",
                            path: "/assets/vehicles/cars",
                            icon: Car,
                            color: "text-amber-600 bg-amber-50 border-amber-100",
                          },
                          {
                            label: "Property & Rental",
                            description: "Deeds, units & tenant rents",
                            path: "/rentals/properties",
                            icon: Building,
                            color: "text-purple-600 bg-purple-50 border-purple-100",
                          },
                          {
                            label: "Warranty & Receipt",
                            description: "Product warranty & claim dates",
                            path: "/assets/warranties",
                            icon: ShieldAlert,
                            color: "text-cyan-600 bg-cyan-50 border-cyan-100",
                          },
                          {
                            label: "Family Profile",
                            description: "Family member directory & folders",
                            path: "/family/profiles",
                            icon: Users,
                            color: "text-rose-600 bg-rose-50 border-rose-100",
                          },
                        ].map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.path}
                              type="button"
                              onClick={() => {
                                setQuickAddOpen(false);
                                navigate(item.path);
                              }}
                              className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-slate-50 transition group cursor-pointer"
                            >
                              <div
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${item.color}`}
                              >
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-slate-800 group-hover:text-slate-950">
                                  {item.label}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {item.description}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => navigate("/notifications")}
                className="relative rounded-lg border border-slate-200/80 bg-white p-2 text-slate-600 hover:bg-slate-50 transition"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute 1 top-1 flex h-2 w-2 rounded-full bg-emerald-500" />
              </button>

              <div className="relative">
                <button
                  type="button"
                  aria-label="Open profile menu"
                  onClick={() => setProfileOpen((open) => !open)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5 text-slate-700 hover:bg-slate-50 transition"
                >
                  <CircleUserRound className="h-4 w-4 text-slate-500" />
                  <span className="hidden max-w-36 truncate text-xs font-medium sm:block">
                    {getUserEmail() || "Account"}
                  </span>
                </button>
                {profileOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setProfileOpen(false)}
                    />
                    <div className="absolute right-0 top-11 z-40 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                      <div className="px-2.5 py-2 border-b border-slate-100 mb-1">
                        <div className="text-[11px] font-semibold text-slate-900">LifeNest Account</div>
                        <div className="truncate text-[10px] text-slate-400 font-mono">
                          {getUserEmail() || "Signed In"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          navigate("/settings");
                        }}
                        className="w-full rounded-md px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                      >
                        Settings
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          clearToken();
                          window.location.reload();
                        }}
                        className="w-full rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      >
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-50/60">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
