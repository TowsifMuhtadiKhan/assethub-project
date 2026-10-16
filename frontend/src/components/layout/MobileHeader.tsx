import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

type MobileHeaderProps = {
  onOpenQuickAdd?: () => void;
  onOpenProfile?: () => void;
  userInitials?: string;
};

export function MobileHeader(_props: MobileHeaderProps = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const pathname = location.pathname;

  const isHome = pathname === "/";

  // Compute a clean human-readable title for each screen
  const getPageTitle = () => {
    if (isHome) return language === "bn" ? "লিখে রাখো" : "Likhe Rakho";
    if (pathname.startsWith("/my-life/expenses/loans/"))
      return language === "bn" ? "ইএমআই বিবরণ" : "EMI Schedule";
    if (pathname.startsWith("/my-life/expenses/savings/"))
      return language === "bn"
        ? "ডিপিএস / সঞ্চয় বিবরণ"
        : "DPS & Savings Schedule";
    if (pathname.startsWith("/my-life/tasks"))
      return t("nav_tasks", "To-Do & Tasks");
    if (pathname.startsWith("/my-life/calendar"))
      return t("nav_calendar", "Calendar");
    if (
      pathname.startsWith("/my-life/expenses") ||
      pathname.startsWith("/expenses") ||
      pathname.startsWith("/daily-expenses")
    )
      return t("nav_daily_expenses", "Daily Expenses");
    if (
      pathname.startsWith("/documents/vault") ||
      pathname.startsWith("/documents")
    )
      return t("nav_documents", "Document Vault");
    if (pathname.startsWith("/documents/licenses"))
      return t("nav_licenses", "Licenses & IDs");
    if (pathname.startsWith("/assets/vehicles/dashboard"))
      return t("nav_vehicles", "Vehicles Dashboard");
    if (pathname.startsWith("/assets/vehicles/cars"))
      return language === "bn" ? "গাড়ি" : "Cars";
    if (pathname.startsWith("/assets/vehicles/bikes"))
      return language === "bn" ? "বাইক" : "Bikes";
    if (pathname.startsWith("/vehicles/"))
      return language === "bn" ? "যানবাহন বিবরণ" : "Vehicle Details";
    if (
      pathname.startsWith("/assets/vehicles") ||
      pathname.startsWith("/vehicles")
    )
      return t("nav_vehicles", "Vehicles & Fuel");
    if (pathname.startsWith("/rentals/dashboard"))
      return language === "bn" ? "ভাড়া ড্যাশবোর্ড" : "Rentals Dashboard";
    if (
      pathname.startsWith("/rentals/properties") ||
      pathname.startsWith("/rentals") ||
      pathname.startsWith("/properties")
    ) {
      return location.search.includes("property=")
        ? language === "bn"
          ? "সম্পত্তি বিবরণ"
          : "Property Details"
        : t("nav_properties", "Properties & Rent");
    }
    if (pathname.startsWith("/assets/warranties"))
      return t("nav_warranties", "Warranty Cards");
    if (pathname.startsWith("/settings")) return t("nav_settings", "Settings");
    return language === "bn" ? "লিখে রাখো" : "Likhe Rakho";
  };

  const handleBack = () => {
    // If inside EMI or Savings detail, return to respective tabs
    if (pathname.startsWith("/my-life/expenses/loans/")) {
      navigate("/my-life/expenses?tab=loans");
      return;
    }
    if (pathname.startsWith("/my-life/expenses/savings/")) {
      navigate("/my-life/expenses?tab=savings");
      return;
    }
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
    <header className="sticky top-0 z-30 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-md safe-area-top lg:hidden shrink-0">
      <div className="flex h-14 items-center justify-between px-3.5">
        {/* Left: Back Button or App Logo & Brand Header */}
        <div className="flex items-center gap-2 min-w-0">
          {!isHome ? (
            <>
              <button
                type="button"
                onClick={handleBack}
                className="-ml-1 flex items-center justify-center h-8 w-8 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 active:scale-90 transition cursor-pointer select-none outline-none"
                aria-label="Go back"
              >
                <ChevronLeft className="h-5 w-5 stroke-[2.25]" />
              </button>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-slate-900 truncate tracking-tight">
                  {getPageTitle()}
                </h1>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="Likhe Rakho"
                className="h-8.5 w-8.5 rounded-xl object-contain shadow-xs shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <div className="text-[14px] font-extrabold tracking-tight leading-tight flex items-center gap-1">
                  <span className="text-[#064e3b]">Likhe</span>
                  <span className="text-[#00a859]">Rakho</span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.2 rounded-full">
                    লিখে রাখো
                  </span>
                </div>
                <div className="text-[10px] font-semibold text-[#064e3b]/90 leading-none mt-0.5 truncate">
                  মনে রাখার ঝামেলা শেষ, লিখে রাখো।
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right action area (empty or contextual) */}
        <div id="mobile-header-right" className="flex items-center gap-2 shrink-0" />
      </div>
    </header>
  );
}
