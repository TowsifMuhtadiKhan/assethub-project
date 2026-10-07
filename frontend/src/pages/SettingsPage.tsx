import { useEffect, useState } from "react";
import { HardDrive, Save } from "lucide-react";
import { getUserSettings, saveUserSettings } from "../services/settingsService";
import { getUserEmail } from "../services/api";
import type { UserSettings } from "../types";

export function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    fullName: "",
    whatsappNumber: "",
    countryCode: "+880",
    whatsappEnabled: true,
    reminderDaysBefore: 7,
    googleDriveFolderId: "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getUserSettings().then((s) => {
      setSettings(s);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await saveUserSettings(settings);
    setSettings(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600">
            LifeNest Settings
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Account & System Preferences
          </h1>
          <p className="text-sm text-slate-600">
            Manage your personal profile, Google Drive storage link, and security preferences.
          </p>
        </div>
      </div>

      <div className="max-w-2xl space-y-6">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Profile Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Primary Profile</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Account Email</label>
                <input
                  disabled
                  value={getUserEmail()}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-sm text-slate-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Full Name</label>
                <input
                  value={settings.fullName}
                  onChange={(e) => setSettings({ ...settings, fullName: e.target.value })}
                  placeholder="Your legal name"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">WhatsApp Contact Number</label>
                <input
                  value={settings.whatsappNumber}
                  onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                  placeholder="017..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Storage Provider Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">Cloud File Storage</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Files and PDFs are secured in your isolated cloud vault. You can also connect a Google Drive folder.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Google Drive Folder ID (Optional)
                </label>
                <input
                  value={settings.googleDriveFolderId || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, googleDriveFolderId: e.target.value })
                  }
                  placeholder="e.g. 1a2B3c4D_google_drive_folder_id"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:border-cyan-500"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  When configured, uploaded files will also mirror directly into your Google Drive personal archive.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500"
            >
              <Save className="h-4 w-4" /> Save Settings
            </button>
            {saved && (
              <span className="text-sm font-medium text-emerald-600">
                Settings saved!
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
