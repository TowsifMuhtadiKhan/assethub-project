import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Home,
  FileText,
  Users,
  CheckSquare,
  Car,
  Building,
} from "lucide-react";

export function NotFoundPage() {
  const navigate = useNavigate();

  const quickLinks = [
    {
      title: "Daily Dashboard",
      description: "Quick stats, upcoming alerts & summaries",
      icon: Home,
      to: "/",
      color: "text-blue-600 bg-blue-50 border-blue-100",
    },
    {
      title: "Document Vault",
      description: "NID, passports, certificates & family records",
      icon: FileText,
      to: "/documents/vault",
      color: "text-indigo-600 bg-indigo-50 border-indigo-100",
    },
    {
      title: "Tasks & To-Dos",
      description: "Pending tasks, due dates & WhatsApp alerts",
      icon: CheckSquare,
      to: "/my-life/tasks",
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
    {
      title: "Vehicles & Fuel",
      description: "Car & bike records, fitness, tax token & logs",
      icon: Car,
      to: "/assets/vehicles/cars",
      color: "text-amber-600 bg-amber-50 border-amber-100",
    },
    {
      title: "Real Estate & Rentals",
      description: "Properties, tenant rents & deed documents",
      icon: Building,
      to: "/rentals/properties",
      color: "text-purple-600 bg-purple-50 border-purple-100",
    },
    {
      title: "Family Profiles",
      description: "Family member directory and folders",
      icon: Users,
      to: "/family/profiles",
      color: "text-rose-600 bg-rose-50 border-rose-100",
    },
  ];

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-10 px-4 sm:px-6">
      <div className="w-full max-w-2xl text-center">
        {/* 404 Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs mb-4">
          <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          <span>Error 404 • Resource Not Found</span>
        </div>

        {/* Big Code & Heading */}
        <h1 className="text-6xl sm:text-7xl font-extrabold tracking-tight text-slate-900 font-display">
          404
        </h1>
        <h2 className="mt-2 text-xl sm:text-2xl font-bold text-slate-800">
          This page or record doesn't exist
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          The link you followed may be broken, expired, or the asset record may have been removed. Use the shortcuts below to get back on track.
        </p>

        {/* Primary Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition shadow-xs cursor-pointer"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-50/50 px-3 text-[11px] font-semibold text-slate-400">
              Explore LifeNest Hub
            </span>
          </div>
        </div>

        {/* Quick Hub Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-left">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                className="group flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-slate-300 hover:shadow-xs transition"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border ${link.color}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition text-xs font-bold">
                      →
                    </span>
                  </div>
                  <h3 className="mt-2.5 text-xs font-bold text-slate-900 group-hover:text-slate-700">
                    {link.title}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-500 leading-snug">
                    {link.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
