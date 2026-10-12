import { getGoogleDriveDirectDownloadUrl } from "../utils/googleDrive";

export const CURRENT_APP_BUILD = "1.0.0";
export const APK_DRIVE_URL_STORAGE_KEY = "lifenest_android_apk_drive_url";
export const APK_VERSION_STORAGE_KEY = "lifenest_android_apk_version";
export const APK_RELEASE_NOTES_STORAGE_KEY = "lifenest_android_apk_release_notes";
export const INSTALLED_VERSION_STORAGE_KEY = "lifenest_installed_apk_version";
export const DISMISSED_VERSION_STORAGE_KEY = "lifenest_dismissed_update_version";

export interface ApkUpdateConfig {
  driveUrl: string;
  latestVersion: string;
  releaseNotes: string;
}

export interface ApkUpdateStatus {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  downloadUrl: string;
  rawDriveUrl: string;
  releaseNotes: string;
}

/**
 * Get current configured APK distribution settings
 */
export function getApkConfig(): ApkUpdateConfig {
  try {
    const driveUrl = localStorage.getItem(APK_DRIVE_URL_STORAGE_KEY) || "";
    const latestVersion = localStorage.getItem(APK_VERSION_STORAGE_KEY) || "1.0.0";
    const releaseNotes =
      localStorage.getItem(APK_RELEASE_NOTES_STORAGE_KEY) ||
      "New features, performance enhancements, and bug fixes.";
    return { driveUrl, latestVersion, releaseNotes };
  } catch {
    return { driveUrl: "", latestVersion: "1.0.0", releaseNotes: "" };
  }
}

/**
 * Save APK distribution settings and broadcast update event
 */
export function saveApkConfig(
  driveUrl: string,
  latestVersion: string,
  releaseNotes = "",
): void {
  try {
    localStorage.setItem(APK_DRIVE_URL_STORAGE_KEY, driveUrl.trim());
    localStorage.setItem(APK_VERSION_STORAGE_KEY, latestVersion.trim() || "1.0.0");
    localStorage.setItem(APK_RELEASE_NOTES_STORAGE_KEY, releaseNotes.trim());
    window.dispatchEvent(new CustomEvent("lifenest:apk-config-updated"));
  } catch (err) {
    console.error("Failed to save APK configuration:", err);
  }
}

/**
 * Compare two semver/build version strings (e.g. "1.1.0" > "1.0.0")
 */
export function isNewerVersion(remoteVersion: string, localVersion: string): boolean {
  if (!remoteVersion || !localVersion) return false;
  const cleanRemote = remoteVersion.replace(/^v/i, "").trim();
  const cleanLocal = localVersion.replace(/^v/i, "").trim();

  if (cleanRemote === cleanLocal) return false;

  const remoteParts = cleanRemote.split(".").map((n) => parseInt(n, 10) || 0);
  const localParts = cleanLocal.split(".").map((n) => parseInt(n, 10) || 0);

  const length = Math.max(remoteParts.length, localParts.length);
  for (let i = 0; i < length; i++) {
    const r = remoteParts[i] || 0;
    const l = localParts[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }

  return cleanRemote !== cleanLocal;
}

/**
 * Detect if running on an Android device, WebView, or standalone installed app
 */
export function isAndroidOrApkEnvironment(): boolean {
  try {
    const ua = navigator.userAgent.toLowerCase();
    const isAndroid = /android/i.test(ua);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes("android-app://") ||
      /wv|version\/[0-9.]+/i.test(ua);
    return isAndroid || isStandalone;
  } catch {
    return false;
  }
}

/**
 * Check if a newer APK version is available on the configured Google Drive
 */
export function checkForApkUpdate(ignoreDismissed = false): ApkUpdateStatus {
  const config = getApkConfig();
  const currentVersion =
    localStorage.getItem(INSTALLED_VERSION_STORAGE_KEY) || CURRENT_APP_BUILD;

  if (!config.driveUrl) {
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: config.latestVersion,
      downloadUrl: "",
      rawDriveUrl: "",
      releaseNotes: config.releaseNotes,
    };
  }

  // Check if dismissed in this session
  if (!ignoreDismissed) {
    const dismissedVersion = sessionStorage.getItem(DISMISSED_VERSION_STORAGE_KEY);
    if (dismissedVersion === config.latestVersion) {
      return {
        hasUpdate: false,
        currentVersion,
        latestVersion: config.latestVersion,
        downloadUrl: "",
        rawDriveUrl: config.driveUrl,
        releaseNotes: config.releaseNotes,
      };
    }
  }

  const hasUpdate = isNewerVersion(config.latestVersion, currentVersion);
  const downloadUrl = getGoogleDriveDirectDownloadUrl(config.driveUrl);

  return {
    hasUpdate,
    currentVersion,
    latestVersion: config.latestVersion,
    downloadUrl,
    rawDriveUrl: config.driveUrl,
    releaseNotes: config.releaseNotes,
  };
}

/**
 * Automatically trigger download of the APK from Google Drive
 */
export function downloadApkFromConfiguredDrive(): boolean {
  const config = getApkConfig();
  if (!config.driveUrl) return false;

  const directUrl = getGoogleDriveDirectDownloadUrl(config.driveUrl);
  if (!directUrl) return false;

  try {
    const a = document.createElement("a");
    a.href = directUrl;
    a.download = `LifeNest-v${config.latestVersion || "latest"}.apk`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Save installed version marker so user isn't repeatedly prompted after downloading
    localStorage.setItem(INSTALLED_VERSION_STORAGE_KEY, config.latestVersion);
    return true;
  } catch {
    window.open(directUrl, "_blank");
    return true;
  }
}

/**
 * Dismiss the current update prompt for the session
 */
export function dismissCurrentUpdate(version: string): void {
  try {
    sessionStorage.setItem(DISMISSED_VERSION_STORAGE_KEY, version);
  } catch {}
}
