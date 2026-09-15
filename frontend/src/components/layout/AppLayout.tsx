import { Bell, Menu, Plus, Search } from "lucide-react";
import { useNavigate, Outlet } from "react-router-dom";
import { useState } from "react";
import { Sidebar } from "../common/Sidebar";

export function AppLayout() {
  const navigate = useNavigate();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="ml-0 flex min-w-0 flex-1 flex-col lg:ml-72">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur-sm lg:px-8">
            <div className="flex items-center gap-3">
              <button
                className="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="hidden items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 lg:flex">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  className="w-64 border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  placeholder="Search anything..."
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuickAddOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <Plus className="h-4 w-4" />
                Quick Add
              </button>
              <button className="relative rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-700">
                <Bell className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                  3
                </span>
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>

      {quickAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/30 p-4 pt-24"
          onMouseDown={() => setQuickAddOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-add-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="quick-add-title"
                  className="text-lg font-bold text-slate-900"
                >
                  Add something new
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Choose what you want to save to your account.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close quick add"
                onClick={() => setQuickAddOpen(false)}
                className="text-2xl leading-none text-slate-400 hover:text-slate-700"
              >
                &times;
              </button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                { label: "Car", path: "/vehicles/cars" },
                { label: "Bike", path: "/vehicles/bikes" },
                { label: "Property", path: "/properties" },
              ].map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => {
                    setQuickAddOpen(false);
                    navigate(item.path);
                  }}
                  className="rounded-xl border border-slate-200 p-4 text-left font-semibold text-slate-800 hover:border-cyan-500 hover:bg-cyan-50"
                >
                  Add {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
