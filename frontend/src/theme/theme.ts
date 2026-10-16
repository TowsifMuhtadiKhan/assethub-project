/**
 * Likhe Rakho Global Theme Configuration
 * 
 * Central source of truth for branding, colors, and design tokens.
 * Modifying colors here and in index.css will dynamically update:
 * - Tabs (segmented, pills, underline)
 * - FilterChips & Badges
 * - ConfirmationModals (dialogs, CTA buttons)
 * - Drawers (action sheets, slide-overs)
 * - Brand Loaders & Accents
 */

export const THEME_CONFIG = {
  name: "Likhe Rakho Emerald Fintech",
  colors: {
    // Brand Primary Palette
    primary: "#064e3b",         // Deep Emerald
    primaryHover: "#073f30",
    primaryLight: "#00a859",    // Vibrant Green
    primaryDark: "#022c22",     // Deep Forest
    primarySurface: "#f0fdf4",  // Soft Emerald Tint
    primaryBorder: "#a7f3d0",   // Subtle Emerald Border
    gradient: "linear-gradient(135deg, #064e3b 0%, #0d825c 100%)",

    // Background & Surfaces
    bgApp: "#f6faf7",
    cardSurface: "#ffffff",
    borderSubtle: "#e2e8f0",

    // State / Alerts
    danger: "#e11d48",
    dangerSurface: "#fff1f2",
    dangerBorder: "#fecdd3",

    warning: "#d97706",
    warningSurface: "#fffbeb",
    warningBorder: "#fde68a",

    success: "#059669",
    successSurface: "#ecfdf5",
    successBorder: "#a7f3d0",

    info: "#0284c7",
    infoSurface: "#f0f9ff",
    infoBorder: "#bae6fd",
  },

  // Centralized Tailwind Class Presets
  classes: {
    btnPrimary: "bg-gradient-to-tr from-[#064e3b] to-[#0d825c] hover:from-[#073f30] hover:to-[#0b6e4e] text-white shadow-xs",
    btnPrimaryFlat: "bg-[#064e3b] hover:bg-[#073f30] text-white shadow-xs",
    btnSecondary: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs",
    badgePrimary: "bg-[#064e3b] text-white",
    badgeSecondary: "bg-slate-100 text-slate-600",
    tabSegmentedContainer: "bg-slate-100 p-1 rounded-full",
    tabSegmentedActive: "bg-white text-slate-900 shadow-xs font-bold",
    tabSegmentedInactive: "text-slate-500 hover:text-slate-800",
    chipActive: "bg-[#064e3b] text-white shadow-xs font-bold",
    chipInactive: "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80",
    chipCountActive: "bg-emerald-800 text-white",
    chipCountInactive: "bg-slate-100 text-slate-600",
  },
} as const;

export type ThemeColors = typeof THEME_CONFIG.colors;
export type ThemeClasses = typeof THEME_CONFIG.classes;
