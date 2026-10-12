import { useState, useEffect } from "react";
import {
  Download,
  X,
  Sparkles,
  Smartphone,
  CheckCircle2,
} from "lucide-react";
import {
  checkForApkUpdate,
  downloadApkFromConfiguredDrive,
  dismissCurrentUpdate,
  fetchLatestApkVersion,
  type ApkUpdateStatus,
} from "../../services/appUpdateService";

export function ApkUpdateNotificationModal() {
  const [updateStatus, setUpdateStatus] = useState<ApkUpdateStatus | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [manualCheckNotice, setManualCheckNotice] = useState<string | null>(null);

  const runUpdateCheck = async (isManual = false) => {
    try {
      await fetchLatestApkVersion();
    } catch {}
    const status = checkForApkUpdate(isManual);
    setUpdateStatus(status);

    if (status.hasUpdate) {
      setDownloadStarted(false);
      setIsOpen(true);
      setManualCheckNotice(null);
    } else if (isManual) {
      if (!status.rawDriveUrl) {
        setManualCheckNotice("No Google Drive APK link configured yet. Set it in Settings > Mobile App.");
      } else {
        setManualCheckNotice(`You are running version v${status.currentVersion}.`);
      }
      setIsOpen(true);
    }
  };

  useEffect(() => {
    // Initial check on load (delayed slightly for smooth initial rendering)
    const timer = setTimeout(() => {
      runUpdateCheck(false);
    }, 1500);

    const handleConfigUpdated = () => runUpdateCheck(false);
    const handleManualCheck = () => runUpdateCheck(true);

    window.addEventListener("lifenest:apk-config-updated", handleConfigUpdated);
    window.addEventListener("lifenest:check-for-updates", handleManualCheck);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("lifenest:apk-config-updated", handleConfigUpdated);
      window.removeEventListener("lifenest:check-for-updates", handleManualCheck);
    };
  }, []);

  const handleDownload = () => {
    const success = downloadApkFromConfiguredDrive();
    if (success) {
      setDownloadStarted(true);
    }
  };

  const handleDismiss = () => {
    if (updateStatus?.latestVersion) {
      dismissCurrentUpdate(updateStatus.latestVersion);
    }
    setIsOpen(false);
    setDownloadStarted(false);
    setManualCheckNotice(null);
  };

  if (!isOpen || !updateStatus) return null;

  const isUpToDate = !updateStatus.hasUpdate && manualCheckNotice;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={handleDismiss}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl text-slate-900 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-slate-900">
                  {isUpToDate ? "App Version Check" : "LifeNest Update Available"}
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isUpToDate
                  ? `Current installed build: v${updateStatus.currentVersion}`
                  : `Version v${updateStatus.latestVersion} is ready to download`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-4 space-y-3">
          {isUpToDate ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700 flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900">{manualCheckNotice}</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  When a new APK is uploaded to your Google Drive link in Settings, you will be notified automatically.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3.5 text-xs text-emerald-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                  <span>New Android APK Ready</span>
                  <span className="ml-auto rounded-full bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-mono font-bold">
                    v{updateStatus.latestVersion}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800/80 leading-relaxed pt-1">
                  A fresh update has been published to your configured Google Drive. Download it now to install the latest features.
                </p>
              </div>

              {updateStatus.releaseNotes && (
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 text-xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    What's New in v{updateStatus.latestVersion}
                  </span>
                  <p className="text-slate-700 leading-relaxed text-[11px]">
                    {updateStatus.releaseNotes}
                  </p>
                </div>
              )}

              {downloadStarted && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 flex items-start gap-2 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Download Started!</span>
                    <span className="text-[11px] text-blue-700">
                      Check your phone's notification drawer or Downloads folder, then tap <strong>LifeNest.apk</strong> to install.
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          {isUpToDate ? (
            <div className="w-full flex items-center gap-2">
              <button
                type="button"
                onClick={handleDismiss}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{downloadStarted ? "Downloading..." : "Download APK"}</span>
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-xl px-3.5 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                Later
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/25 hover:from-emerald-700 hover:to-teal-700 transition cursor-pointer active:scale-95"
              >
                <Download className="h-4 w-4" />
                <span>{downloadStarted ? "Download Again" : "Download Update"}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
