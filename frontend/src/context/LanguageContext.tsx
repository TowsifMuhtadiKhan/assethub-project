import React, { createContext, useContext, useEffect, useState } from "react";

export type Language = "en" | "bn";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation & Layout
    nav_home: "Home",
    nav_add: "Add",
    nav_ai_help: "AI Help",
    nav_profile: "Profile",
    nav_dashboard: "Dashboard",
    nav_daily_expenses: "Daily Expenses",
    nav_tasks: "To-Do & Tasks",
    nav_calendar: "Calendar",
    nav_documents: "Document Vault",
    nav_licenses: "Licenses & IDs",
    nav_vehicles: "Vehicles & Fuel",
    nav_properties: "Properties & Rent",
    nav_warranties: "Warranty Cards",
    nav_settings: "Settings",
    nav_family: "Family Members",
    family_head: "Family Head",
    group_my_life: "Daily Life",
    group_vault: "Important Papers",
    group_assets: "Vehicles & Houses",
    item_todo: "To-Do List",
    item_expenses: "Daily Expenses",
    item_docs: "All Documents",
    item_vehicles: "Cars & Bikes",
    item_houses: "Houses, Flats & Rent",
    item_warranties: "Warranty Cards",
    
    // Header & Actions
    quick_add: "Add New",
    search_placeholder: "Search documents, cars, bills... (Ctrl+K)",
    my_profile: "My Profile & Details",
    settings: "Settings & Preferences",
    sign_out: "Sign Out",
    language: "Language",
    lang_en: "English",
    lang_bn: "বাংলা",
    
    // Common Buttons
    add_record: "Add Record",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    back: "Back",
    filter: "Filter",
    all: "All",
    history: "History",
    close: "Close",
    loading: "Loading...",
  },
  bn: {
    // Navigation & Layout
    nav_home: "হোম",
    nav_add: "নতুন",
    nav_ai_help: "সহায়তা",
    nav_profile: "প্রোফাইল",
    nav_dashboard: "ড্যাশবোর্ড",
    nav_daily_expenses: "দৈনিক খরচ",
    nav_tasks: "করণীয় ও টাস্ক",
    nav_calendar: "ক্যালেন্ডার",
    nav_documents: "ডকুমেন্ট ভল্ট",
    nav_licenses: "লাইসেন্স ও আইডি",
    nav_vehicles: "যানবাহন ও জ্বালানি",
    nav_properties: "সম্পত্তি ও ভাড়া",
    nav_warranties: "ওয়ারেন্টি কার্ড",
    nav_settings: "সেটিংস",
    nav_family: "পরিবারের সদস্যবৃন্দ",
    family_head: "পরিবার প্রধান",
    group_my_life: "দৈনন্দিন জীবন",
    group_vault: "প্রয়োজনীয় কাগজপত্র",
    group_assets: "যানবাহন ও বাড়ি",
    item_todo: "করণীয় কাজ",
    item_expenses: "দৈনিক খরচ",
    item_docs: "সকল ডকুমেন্ট",
    item_vehicles: "গাড়ি ও বাইক",
    item_houses: "বাড়ি, ফ্ল্যাট ও ভাড়া",
    item_warranties: "ওয়ারেন্টি কার্ড",
    
    // Header & Actions
    quick_add: "নতুন যোগ",
    search_placeholder: "ডকুমেন্ট, গাড়ি, বিল খুঁজুন... (Ctrl+K)",
    my_profile: "আমার প্রোফাইল ও বিবরণ",
    settings: "সেটিংস ও পছন্দসমূহ",
    sign_out: "সাইন আউট",
    language: "ভাষা",
    lang_en: "English",
    lang_bn: "বাংলা",
    
    // Common Buttons
    add_record: "রেকর্ড যোগ করুন",
    save: "সংরক্ষণ করুন",
    cancel: "বাতিল",
    edit: "সম্পাদনা",
    delete: "মুছুন",
    back: "ফিরে যান",
    filter: "ফিল্টার",
    all: "সবগুলো",
    history: "ইতিহাস",
    close: "বন্ধ করুন",
    loading: "লোড হচ্ছে...",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "lifenest_preferred_language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "bn") return saved;
    } catch {}
    return "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
  };

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "bn" : "en");
  };

  const t = (key: string, fallback?: string): string => {
    const langDict = translations[language];
    if (langDict && key in langDict) {
      return langDict[key];
    }
    // Fallback to English
    if (language !== "en" && key in translations.en) {
      return translations.en[key];
    }
    return fallback || key;
  };

  useEffect(() => {
    // Optionally set lang attribute on document
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
