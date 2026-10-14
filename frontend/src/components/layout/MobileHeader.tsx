import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Globe, User } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

type MobileHeaderProps = {
  onOpenQuickAdd?: () => void;
  onOpenProfile?: () => void;
  userInitials?: string;
};

export function MobileHeader(props: MobileHeaderProps = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, toggleLanguage, t } = useLanguage();
  const pathname = location.pathname;

  const isHome = pathname === "/";

  // Compute a clean human-readable title for each screen
  const getPageTitle = () => {
    if (isHome) return "LifeNest";
    if (pathname.startsWith("/my-life/tasks")) return t("nav_tasks", "To-Do & Tasks");
    if (pathname.startsWith("/my-life/calendar")) return t("nav_calendar", "Calendar");
    if (pathname.startsWith("/my-life/expenses") || pathname.startsWith("/expenses") || pathname.startsWith("/daily-expenses")) return t("nav_daily_expenses", "Daily Expenses");
    if (pathname.startsWith("/documents/vault") || pathname.startsWith("/documents")) return t("nav_documents", "Document Vault");
    if (pathname.startsWith("/documents/licenses")) return t("nav_licenses", "Licenses & IDs");
    if (pathname.startsWith("/assets/vehicles/dashboard")) return t("nav_vehicles", "Vehicles Dashboard");
    if (pathname.startsWith("/assets/vehicles/cars")) return language === "bn" ? "গাড়ি" : "Cars";
    if (pathname.startsWith("/assets/vehicles/bikes")) return language === "bn" ? "বাইক" : "Bikes";
    if (pathname.startsWith("/vehicles/")) return language === "bn" ? "যানবাহন বিবরণ" : "Vehicle Details";
    if (pathname.startsWith("/assets/vehicles") || pathname.startsWith("/vehicles")) return t("nav_vehicles", "Vehicles & Fuel");
    if (pathname.startsWith("/rentals/dashboard")) return language === "bn" ? "ভাড়া ড্যাশবোর্ড" : "Rentals Dashboard";
    if (pathname.startsWith("/rentals/properties") || pathname.startsWith("/rentals") || pathname.startsWith("/properties")) {
      return location.search.includes("property=")
        ? (language === "bn" ? "সম্পত্তি বিবরণ" : "Property Details")
        : t("nav_properties", "Properties & Rent");
    }
    if (pathname.startsWith("/assets/warranties")) return t("nav_warranties", "Warranty Cards");
    if (pathname.startsWith("/settings")) return t("nav_settings", "Settings");
    return "LifeNest";
  };

  const handleBack = () => {
    // If inside vehicle details, go back to vehicles list
    if (pathname.startsWith("/vehicles/")) {
      navigate("/assets/vehicles");
      return;
    }
    // If inside a specific property details view, go back to properties list
    if (
      (pathname.startsWith("/rentals") || pathname.startsWith("/properties")) &&
      location.search.includes("property=")
    ) {
      navigate("/rentals/properties");
      return;
    }
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-md safe-area-top lg:hidden">
      <div className="flex h-14 items-center justify-between px-3.5">
        {/* Left: Back Button or App Logo */}
        <div className="flex items-center gap-2 min-w-0">
          {!isHome ? (
            <button
              type="button"
              onClick={handleBack}
              className="-ml-1 flex items-center justify-center h-7.5 w-7.5 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 active:scale-90 transition cursor-pointer select-none outline-none"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5 stroke-[2.25]" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="LifeNest"
                className="h-8 w-8 rounded-lg object-contain shadow-xs"
              />
            </div>
          )}

          {/* Page Title */}
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-900 truncate tracking-tight">
              {getPageTitle()}
            </h1>
            {isHome && (
              <p className="text-[10px] text-slate-400 leading-none">Family & Asset Vault</p>
            )}
          </div>
        </div>

        {/* Right: Language switch & Profile button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1 rounded-full border border-slate-200/90 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 shadow-2xs cursor-pointer active:scale-95 transition"
            aria-label="Toggle language"
            title={language === "en" ? "বাংলা ভাষায় পরিবর্তন করুন" : "Switch to English"}
          >
            <Globe className="h-3 w-3 text-indigo-600" />
            <span>{language === "en" ? "বাং" : "EN"}</span>
          </button>
          {props.onOpenProfile && (
            <button
              type="button"
              onClick={props.onOpenProfile}
              className="flex h-7.5 w-7.5 items-center justify-center rounded-full bg-gradient-to-tr from-slate-900 to-indigo-950 text-white shadow-xs ring-1 ring-slate-200 cursor-pointer active:scale-95 transition"
              aria-label="Open profile"
            >
              <User className="h-3.5 w-3.5 text-white" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
