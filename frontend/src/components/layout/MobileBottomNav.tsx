import { useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  PlusCircle,
  Sparkles,
  CircleUserRound,
} from "lucide-react";

type MobileBottomNavProps = {
  onOpenQuickAdd?: () => void;
  onOpenAi?: () => void;
  onOpenProfile?: () => void;
};

export function MobileBottomNav({
  onOpenQuickAdd,
  onOpenAi,
  onOpenProfile,
}: MobileBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  const isHome = pathname === "/";
  const isProfile = pathname.startsWith("/settings");

  const handleOpenAdd = () => {
    if (onOpenQuickAdd) {
      onOpenQuickAdd();
    } else {
      window.dispatchEvent(new CustomEvent("lifenest:open-quick-add"));
    }
  };

  const handleOpenAi = () => {
    if (onOpenAi) {
      onOpenAi();
    } else {
      window.dispatchEvent(new CustomEvent("lifenest:open-ai"));
    }
  };

  const handleProfileClick = () => {
    if (onOpenProfile) {
      onOpenProfile();
    } else {
      navigate("/settings?tab=profile");
    }
  };

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-md rounded-t-2xl border-t border-x border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex h-14 items-center justify-around px-2">
        {/* 1. HOME */}
        <button
          type="button"
          onClick={() => navigate("/")}
          className={`flex flex-1 flex-col items-center justify-center py-1 transition-all active:scale-95 cursor-pointer outline-none select-none ${
            isHome ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
          }`}
          aria-label="Home"
        >
          <Home
            className={`h-5 w-5 transition-transform ${
              isHome ? "stroke-[2.25] text-blue-600 scale-105" : "stroke-[1.85]"
            }`}
          />
          <span
            className={`mt-1 text-[10px] tracking-tight leading-none ${
              isHome ? "font-bold text-blue-600" : "font-medium text-slate-500"
            }`}
          >
            Home
          </span>
        </button>

        {/* 2. ADD */}
        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex flex-1 flex-col items-center justify-center py-1 text-slate-400 hover:text-blue-600 transition-all active:scale-95 cursor-pointer outline-none select-none group"
          aria-label="Add New"
        >
          <PlusCircle className="h-5 w-5 stroke-[1.85] text-slate-400 group-hover:text-blue-600 group-hover:scale-105 transition-all" />
          <span className="mt-1 text-[10px] font-medium text-slate-500 group-hover:text-blue-600 tracking-tight leading-none">
            Add
          </span>
        </button>

        {/* 3. AI HELP */}
        <button
          type="button"
          onClick={handleOpenAi}
          className="flex flex-1 flex-col items-center justify-center py-1 text-slate-400 hover:text-blue-600 transition-all active:scale-95 cursor-pointer outline-none select-none group"
          aria-label="AI Help"
        >
          <Sparkles className="h-5 w-5 stroke-[1.85] text-slate-400 group-hover:text-blue-600 group-hover:scale-105 transition-all" />
          <span className="mt-1 text-[10px] font-medium text-slate-500 group-hover:text-blue-600 tracking-tight leading-none">
            AI Help
          </span>
        </button>

        {/* 4. PROFILE */}
        <button
          type="button"
          onClick={handleProfileClick}
          className={`flex flex-1 flex-col items-center justify-center py-1 transition-all active:scale-95 cursor-pointer outline-none select-none ${
            isProfile ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
          }`}
          aria-label="Profile"
        >
          <CircleUserRound
            className={`h-5 w-5 transition-transform ${
              isProfile ? "stroke-[2.25] text-blue-600 scale-105" : "stroke-[1.85]"
            }`}
          />
          <span
            className={`mt-1 text-[10px] tracking-tight leading-none ${
              isProfile ? "font-bold text-blue-600" : "font-medium text-slate-500"
            }`}
          >
            Profile
          </span>
        </button>
      </div>
    </nav>
  );
}
