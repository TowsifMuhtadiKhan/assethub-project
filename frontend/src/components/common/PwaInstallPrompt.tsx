import { useState, useEffect } from "react";
import { Download, X, Share2, PlusSquare } from "lucide-react";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already running in standalone / installed mode
    const isApp =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    if (isApp) {
      setIsStandalone(true);
      return;
    }

    // Check if dismissed previously this session
    const wasDismissed = sessionStorage.getItem("lifenest_pwa_prompt_dismissed") === "true";
    if (wasDismissed) {
      setDismissed(true);
    }

    // Detect iOS devices (iPhone/iPad/iPod)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Capture Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const handleOpenPrompt = () => {
      setDismissed(false);
      if (deferredPrompt) {
        deferredPrompt.prompt();
      } else {
        setShowIosGuide(true);
      }
    };

    window.addEventListener("lifenest:open-install-prompt", handleOpenPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("lifenest:open-install-prompt", handleOpenPrompt);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else if (isIos) {
      setShowIosGuide(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("lifenest_pwa_prompt_dismissed", "true");
  };

  // If already installed or dismissed, do not render banner
  if (isStandalone || dismissed) {
    return null;
  }

  // Only show if deferredPrompt is ready (Android/Chrome) OR on iOS Safari
  if (!deferredPrompt && !isIos) {
    return null;
  }

  return (
    <>
      {/* Floating Bottom Prompt Banner for Mobile */}
      <div className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-bottom duration-300">
        <div className="rounded-2xl border border-slate-700/80 bg-slate-900/95 backdrop-blur-md p-3.5 shadow-2xl text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/logo.png"
              alt="LifeNest"
              className="h-10 w-10 shrink-0 rounded-xl object-contain shadow-md shadow-blue-500/20"
            />
            <div className="min-w-0">
              <div className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
                Install LifeNest App
                <span className="rounded bg-indigo-500/30 text-indigo-300 px-1 py-0.2 text-[9px] font-semibold border border-indigo-400/30">
                  {isIos ? "iOS" : "Android"}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 truncate">
                Add to Home Screen for fast offline access
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-orange-500/30 hover:bg-orange-600 transition cursor-pointer active:scale-95"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Install</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss install banner"
              className="rounded-lg p-1 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIosGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setShowIosGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <img
                  src="/logo.png"
                  alt="LifeNest"
                  className="h-8 w-8 rounded-xl object-contain shadow-xs"
                />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Add to iPhone / iPad
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Install LifeNest in 2 simple steps:
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-700">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Share2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">1. Tap the Share button</div>
                  <div className="text-[11px] text-slate-500">
                    At the bottom of your Safari browser bar (square with arrow pointing up).
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <PlusSquare className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">2. Select "Add to Home Screen"</div>
                  <div className="text-[11px] text-slate-500">
                    Scroll down and tap <strong>Add to Home Screen</strong>, then tap <strong>Add</strong> at top right.
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="mt-4 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
