import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

type MobileHeaderProps = {
  onOpenQuickAdd?: () => void;
  onOpenProfile?: () => void;
  userInitials?: string;
};

export function MobileHeader(_props: MobileHeaderProps = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  const isHome = pathname === "/";

  // Compute a clean human-readable title for each screen
  const getPageTitle = () => {
    if (isHome) return "LifeNest";
    if (pathname.startsWith("/my-life/tasks")) return "To-Do & Tasks";
    if (pathname.startsWith("/my-life/expenses") || pathname.startsWith("/expenses")) return "Daily Expenses";
    if (pathname.startsWith("/documents/vault") || pathname.startsWith("/documents")) return "Document Vault";
    if (pathname.startsWith("/documents/licenses")) return "Licenses & IDs";
    if (pathname.startsWith("/assets/vehicles")) return "Vehicles & Fuel";
    if (pathname.startsWith("/rentals/properties") || pathname.startsWith("/rentals")) return "Properties & Rent";
    if (pathname.startsWith("/assets/warranties")) return "Warranty Cards";
    if (pathname.startsWith("/settings")) return "Settings";
    return "LifeNest";
  };

  const handleBack = () => {
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
      </div>
    </header>
  );
}
