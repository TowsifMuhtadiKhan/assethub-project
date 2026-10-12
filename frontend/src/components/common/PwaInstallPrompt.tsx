import { useState, useEffect } from "react";
import {
  Download,
  X,
  Share2,
  PlusSquare,
  Smartphone,
  ExternalLink,
  CheckCircle2,
  HardDrive,
  Settings,
} from "lucide-react";
import { getGoogleDriveDirectDownloadUrl } from "../../utils/googleDrive";

const DEFAULT_DRIVE_APK_URL_KEY = "lifenest_android_apk_drive_url";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [deviceType, setDeviceType] = useState<"android" | "ios" | "desktop">("desktop");
  const [showModal, setShowModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [apkDriveUrl, setApkDriveUrl] = useState<string>(() => {
    return localStorage.getItem(DEFAULT_DRIVE_APK_URL_KEY) || "";
  });
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState(apkDriveUrl);
  const [savedSuccess, setSavedSuccess] = useState(false);

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

    // Detect device operating system
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/android/i.test(userAgent)) {
      setDeviceType("android");
    } else if (/iphone|ipad|ipod/i.test(userAgent)) {
      setDeviceType("ios");
    } else {
      setDeviceType("desktop");
    }

    // Capture Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const handleOpenPrompt = () => {
      setDismissed(false);
      setShowModal(true);
    };

    window.addEventListener("lifenest:open-install-prompt", handleOpenPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("lifenest:open-install-prompt", handleOpenPrompt);
    };
  }, []);

  const handlePwaInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setDeferredPrompt(null);
        setShowModal(false);
      }
    }
  };

  const handleDownloadApk = () => {
    if (apkDriveUrl) {
      const directUrl = getGoogleDriveDirectDownloadUrl(apkDriveUrl);
      window.open(directUrl, "_blank");
    } else {
      // Prompt user or open modal to set drive URL
      setShowModal(true);
      setEditingUrl(true);
    }
  };

  const handleSaveApkUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    localStorage.setItem(DEFAULT_DRIVE_APK_URL_KEY, trimmed);
    setApkDriveUrl(trimmed);
    setEditingUrl(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("lifenest_pwa_prompt_dismissed", "true");
  };

  // If already installed, do not render banner or modal unless explicitly opened
  if (isStandalone && !showModal) {
    return null;
  }

  return (
    <>
      {/* 1. Floating Bottom Prompt Banner for Mobile */}
      {!dismissed && (deferredPrompt || deviceType === "ios" || deviceType === "android") && (
        <div className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-in slide-in-from-bottom duration-300">
          <div className="rounded-2xl border border-slate-700/80 bg-slate-900/95 backdrop-blur-md p-3.5 shadow-2xl text-white flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src="/logo.png"
                alt="LifeNest"
                className="h-10 w-10 shrink-0 rounded-xl object-contain shadow-md shadow-blue-500/20"
              />
              <div className="min-w-0">
                <div className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
                  LifeNest Mobile App
                  <span className="rounded bg-indigo-500/30 text-indigo-300 px-1 py-0.2 text-[9px] font-semibold border border-indigo-400/30">
                    {deviceType === "android" ? "Android" : deviceType === "ios" ? "iOS" : "Mobile"}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 truncate">
                  {deviceType === "android"
                    ? "Install APK or Add to Home Screen"
                    : deviceType === "ios"
                      ? "Add to iPhone Home Screen"
                      : "Install on mobile or desktop"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-orange-500/30 hover:bg-orange-600 transition cursor-pointer active:scale-95"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{deviceType === "android" ? "Get App" : "Install"}</span>
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
      )}

      {/* 2. Device-Aware Install & APK Download Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl text-slate-900 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <img
                  src="/logo.png"
                  alt="LifeNest"
                  className="h-9 w-9 rounded-xl object-contain shadow-xs"
                />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {deviceType === "android"
                      ? "LifeNest for Android"
                      : deviceType === "ios"
                        ? "LifeNest for iPhone / iPad"
                        : "LifeNest App Download"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Fast, offline-ready Personal & Fleet OS
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body: Device Dependent */}
            <div className="mt-4 space-y-3.5">
              {/* --- ANDROID OPTIONS --- */}
              {deviceType === "android" && (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs">
                          APK
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            Download Android APK
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Direct installation package from Google Drive
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingUrl((v) => !v)}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Settings className="h-3 w-3" />
                        <span>{apkDriveUrl ? "Change Drive Link" : "Set Link"}</span>
                      </button>
                    </div>

                    {editingUrl ? (
                      <form onSubmit={handleSaveApkUrl} className="pt-2 space-y-2">
                        <label className="block text-[11px] font-medium text-slate-600">
                          Google Drive APK Link (Set sharing to 'Anyone with link can view'):
                        </label>
                        <input
                          type="url"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          placeholder="https://drive.google.com/file/d/..."
                          className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 font-mono"
                          required
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="submit"
                            className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer"
                          >
                            Save Link
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingUrl(false)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="pt-1">
                        {apkDriveUrl ? (
                          <button
                            type="button"
                            onClick={handleDownloadApk}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download LifeNest.apk (Google Drive)</span>
                          </button>
                        ) : (
                          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 text-xs text-amber-900 space-y-1.5">
                            <div className="font-semibold flex items-center gap-1.5">
                              <HardDrive className="h-3.5 w-3.5 text-amber-700" />
                              <span>Upload APK to Google Drive:</span>
                            </div>
                            <p className="text-[11px] text-amber-800 leading-relaxed">
                              Upload your <code className="bg-amber-100 px-1 py-0.5 rounded">LifeNest.apk</code> file to Google Drive, set permissions to <em>"Anyone with the link can view"</em>, and tap <strong>"Set Link"</strong> above to enable 1-click APK downloads!
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 1-Tap PWA Option for Android */}
                  {deferredPrompt && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-700 font-bold text-xs">
                          PWA
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            Instant Web App (No file download needed)
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Fastest 1-tap installation directly from browser
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handlePwaInstall}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer"
                      >
                        <Smartphone className="h-4 w-4" />
                        <span>Add to Home Screen (Instant Install)</span>
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* --- IOS INSTRUCTIONS --- */}
              {deviceType === "ios" && (
                <div className="space-y-3 text-xs text-slate-700">
                  <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-2.5 text-[11px] text-amber-800">
                    ℹ️ iOS (Apple) does not support .apk files. Install LifeNest directly to your Home Screen in 2 taps:
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                      <Share2 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">1. Tap the Share icon</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        In the bottom bar of Safari (the square with an arrow pointing upward).
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <PlusSquare className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">2. Tap "Add to Home Screen"</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Scroll down and select <strong>Add to Home Screen</strong>, then tap <strong>Add</strong> at top right.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* --- DESKTOP / GENERAL --- */}
              {deviceType === "desktop" && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600">
                    You can install LifeNest on your desktop browser or download the Android APK for mobile devices:
                  </p>

                  {deferredPrompt && (
                    <button
                      type="button"
                      onClick={handlePwaInstall}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Download className="h-4 w-4" />
                      <span>Install LifeNest Desktop App</span>
                    </button>
                  )}

                  {apkDriveUrl && (
                    <button
                      type="button"
                      onClick={handleDownloadApk}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
                    >
                      <ExternalLink className="h-4 w-4 text-emerald-600" />
                      <span>Download Android APK (Google Drive)</span>
                    </button>
                  )}
                </div>
              )}

              {savedSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  Google Drive APK link saved!
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="mt-4 w-full rounded-xl bg-slate-100 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
