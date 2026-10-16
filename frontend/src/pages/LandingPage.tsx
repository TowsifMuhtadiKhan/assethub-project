import { useState } from "react";
import {
  FileText,
  Car,
  Wallet,
  Building2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Lock,
  Users,
  Smartphone,
  CheckCircle2,
} from "lucide-react";
import { AuthPage } from "./AuthPage";

interface LandingPageProps {
  onOpenAuth?: (mode: "sign-in" | "sign-up") => void;
}

export function LandingPage({ onOpenAuth }: LandingPageProps) {
  // If user clicks Sign Up or Sign In on web, we show the Auth view
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up" | null>(null);

  if (authMode) {
    return (
      <div className="relative">
        {/* Floating return to landing button */}
        <div className="fixed top-4 left-4 z-50">
          <button
            type="button"
            onClick={() => setAuthMode(null)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm border border-slate-200/80 hover:bg-white hover:text-slate-900 transition cursor-pointer"
          >
            ← ফিরে যান / Back to Home
          </button>
        </div>
        <AuthPage
          initialMode={authMode}
          onSwitchMode={(m) => setAuthMode(m)}
          onBackToLanding={() => setAuthMode(null)}
        />
      </div>
    );
  }

  const handleStart = (mode: "sign-in" | "sign-up") => {
    if (onOpenAuth) {
      onOpenAuth(mode);
    } else {
      setAuthMode(mode);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6faf7] text-slate-900 flex flex-col selection:bg-emerald-200 selection:text-emerald-950">
      {/* 1. Header Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md safe-area-top">
        <div className="max-w-7xl mx-auto flex h-14 sm:h-16 items-center justify-between px-3 sm:px-6 lg:px-8">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img
              src="/logo.png"
              alt="Likhe Rakho"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl object-contain shadow-xs shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <div className="text-[15px] sm:text-[17px] font-extrabold tracking-tight leading-tight flex items-center gap-1">
                <span className="text-[#064e3b]">Likhe</span>
                <span className="text-[#00a859]">Rakho</span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.2 rounded-full ml-1 hidden sm:inline">
                  লিখে রাখো
                </span>
              </div>
              <div className="hidden sm:block text-[11px] font-semibold text-[#064e3b]/85 leading-none mt-0.5 truncate">
                মনে রাখার ঝামেলা শেষ, লিখে রাখো।
              </div>
            </div>
          </div>

          {/* Action Buttons (Responsive with clean single-line labels on mobile) */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleStart("sign-in")}
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <span className="sm:hidden">লগইন</span>
              <span className="hidden sm:inline">লগইন / Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => handleStart("sign-up")}
              className="inline-flex items-center gap-1 sm:gap-1.5 rounded-xl bg-gradient-to-tr from-[#064e3b] to-[#0d825c] px-3 sm:px-5 py-1.5 sm:py-2 text-xs font-bold text-white shadow-sm shadow-emerald-950/20 hover:from-[#073f30] hover:to-[#0b6e4e] active:scale-95 transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <span className="sm:hidden">সাইন আপ</span>
              <span className="hidden sm:inline">সাইন আপ / Sign Up</span>
              <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-10 pb-16 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24 border-b border-slate-200/70 bg-gradient-to-b from-white via-[#f6faf7] to-[#ebf7f0]/40">
        {/* Ambient background glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-gradient-to-tr from-emerald-200/40 via-teal-200/30 to-transparent blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 xl:gap-12 items-center">
            {/* Left Column: Value Proposition, Headlines & CTAs */}
            <div className="lg:col-span-6 xl:col-span-7 text-center lg:text-left">
              {/* Tagline Pill Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/90 bg-emerald-50/80 px-4 py-1.5 text-xs font-bold text-[#064e3b] shadow-2xs mb-5">
                <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>সব হিসাব আর নথিপত্র এক নিরাপদ ছাদের নিচে</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-5xl xl:text-6xl font-black tracking-tight text-slate-900 leading-[1.15]">
                মনে রাখার <br className="hidden sm:inline" />
                ঝামেলা শেষ, <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#064e3b] via-[#0d825c] to-[#00a859]">
                  লিখে রাখো।
                </span>
              </h1>

              {/* Subtitle Description */}
              <p className="mt-4 sm:mt-5 text-sm sm:text-base lg:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                জরুরি কাগজপত্র, গাড়ি-বাইক ও বিআরটিএ ডেডলাইন, বাড়ি ও ফ্ল্যাট
                ভাড়া, ডেইলি খরচ, ব্যাংক ইএমআই এবং গ্যাজেট ওয়ারেন্টি—সবকিছু
                গুছিয়ে রাখুন সহজেই এবং মেয়াদ ফুরিয়ে যাওয়ার আগেই পান স্মার্ট
                নোটিফিকেশন।
              </p>

              {/* Primary Action Buttons */}
              <div className="mt-7 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5">
                <button
                  type="button"
                  onClick={() => handleStart("sign-up")}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-tr from-[#064e3b] to-[#0d825c] px-7 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-950/20 hover:from-[#073f30] hover:to-[#0b6e4e] active:scale-98 transition cursor-pointer"
                >
                  <span>বিনামূল্যে খাতা খুলুন (Sign Up Free)</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleStart("sign-in")}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 active:scale-98 transition cursor-pointer"
                >
                  <Lock className="h-4 w-4 text-slate-500" />
                  <span>লগইন করুন (Sign In)</span>
                </button>
              </div>

              {/* Highlights Checklist */}
              <div className="mt-7 flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-6 text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>১০০% এনক্রিপ্টেড ও সুরক্ষিত</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>ফ্যামিলি শেয়ার্ড সুবিধা</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>মোবাইল ও ওয়েব সিংক</span>
                </div>
              </div>
            </div>

            {/* Right Column: Animated Hero Marketing Mockup */}
            <div className="lg:col-span-6 xl:col-span-5 relative mt-6 lg:mt-0">
              {/* Pulsing ambient glow */}
              <div className="absolute -inset-3 bg-gradient-to-tr from-emerald-400/20 via-teal-300/20 to-emerald-200/20 rounded-3xl blur-2xl animate-pulse-glow pointer-events-none" />

              {/* Floating interactive card */}
              <div className="relative animate-float-gentle">
                <div className="relative rounded-3xl p-2.5 sm:p-3.5 bg-gradient-to-b from-white via-emerald-50/40 to-white shadow-2xl shadow-emerald-950/20 border border-emerald-100/90 backdrop-blur-md group overflow-hidden transition-all duration-300 hover:shadow-emerald-950/25">
                  <img
                    src="/marketing/marketing-mobile-app.png"
                    alt="Likhe Rakho Mobile App Mockup - লিখে রাখো মোবাইল অ্যাপ্লিকেশন"
                    className="w-full rounded-2xl object-cover shadow-xs group-hover:scale-[1.015] transition-transform duration-500"
                  />
                  <div className="mt-3 sm:mt-0 sm:absolute sm:-bottom-3 sm:left-1/2 sm:-translate-x-1/2 bg-white/95 backdrop-blur-md px-4 sm:px-5 py-2 rounded-full border border-emerald-200/90 shadow-md flex items-center justify-center gap-2 text-[11px] sm:text-xs font-bold text-[#064e3b] whitespace-nowrap">
                    <Smartphone className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      অ্যান্ড্রয়েড স্মার্টফোন ও ওয়েবে রিয়েল-টাইম সিংক
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Core Features Grid */}
      <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            দৈনন্দিন জীবনের সব গুরুত্বপূর্ণ হিসাব এখন এক ছাতার নিচে
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-500">
            কাগজপত্র হারিয়ে যাওয়া বা ডেডলাইন ভুলে জরিমানা দেওয়ার দিন শেষ।
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Feature 1: Document Vault */}
          <div className="p-6 rounded-3xl border border-slate-200/90 bg-white shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-[#064e3b] flex items-center justify-center">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              জরুরি কাগজপত্র ও দলিল (Document Vault)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              জাতীয় পরিচয়পত্র (NID), পাসপোর্ট, জন্ম নিবন্ধন, ড্রাইভিং লাইসেন্স
              ও জমির দলিলের মেয়াদ শেষ হওয়ার আগেই স্বয়ংক্রিয় নোটিফিকেশন।
            </p>
          </div>

          {/* Feature 2: Vehicles & BRTA */}
          <div className="p-6 rounded-3xl border border-slate-200/90 bg-white shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-teal-50 border border-teal-100 text-[#0d825c] flex items-center justify-center">
              <Car className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              গাড়ি, মোটরসাইকেল ও বিআরটিএ (Vehicles)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              গাড়ি বা বাইকের ট্যাক্স টোকেন, ফিটনেস সার্টিফিকেট, রুট পারমিট ও
              ইন্স্যুরেন্স শেষ হওয়ার ডেট ট্র্যাকিং এবং তেল/মেরামত খরচ।
            </p>
          </div>

          {/* Feature 3: Expenses, Loans & EMIs */}
          <div className="p-6 rounded-3xl border border-slate-200/90 bg-white shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-[#064e3b] flex items-center justify-center">
              <Wallet className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              প্রতিদিনের খরচ ও ইএমআই (Daily Expenses & EMIs)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              দৈনিক বাজার ও পার্সোনাল খরচ এন্ট্রি, ক্রেডিট কার্ড বিল, লোন কিস্তি
              এবং ডিপিএস/সঞ্চয়পত্রের জমা ও অবশিষ্ট হিসেব।
            </p>
          </div>

          {/* Feature 4: House & Rentals */}
          <div className="p-6 rounded-3xl border border-slate-200/90 bg-white shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-[#0d825c] flex items-center justify-center">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              বাড়ি ও ফ্ল্যাট ভাড়া (Houses & Rentals)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              ভাড়াটিয়ার বিবরণ, এগ্রিমেন্ট পেপার, প্রতি মাসের ভাড়া আদায় ও বকেয়া
              হিসেব এক ক্লিকেই ম্যানেজ করুন।
            </p>
          </div>

          {/* Feature 5: Warranty Cards */}
          <div className="p-6 rounded-3xl border border-slate-200/90 bg-white shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              ওয়ারেন্টি ও গ্যারান্টি কার্ড (Warranty Cards)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              টিভি, ফ্রিজ, এসি বা ফোনের মেমো ও ওয়ারেন্টি পেপার হারানো বন্ধ।
              মেয়াদ কতদিন বাকি সরাসরি হোম স্ক্রিনেই দেখতে পাবেন।
            </p>
          </div>

          {/* Feature 6: Family Workspace & PIN Security */}
          <div className="p-6 rounded-3xl border border-slate-200/90 bg-white shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700 flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              ফ্যামিলি শেয়ার্ড অ্যাকাউন্ট ও পিন লক
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              পরিবারের সদস্যদের যুক্ত করুন নির্দিষ্ট অ্যাক্সেস সুবিধাসহ। যার যার
              ব্যক্তিগত খরচ সুরক্ষিত থাকবে ৪-ডিজিটের পার্সোনাল পিনে।
            </p>
          </div>
        </div>
      </section>

      {/* 4. Lifestyle & Real-World Branding Showcase */}
      <section className="py-16 sm:py-24 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 sm:space-y-24">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/70 px-3.5 py-1 text-xs font-bold text-[#064e3b]">
              <span>বাস্তব জীবনের প্রতিদিনের নির্ভরযোগ্য খাতা</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              পরিবার, চাকরি কিংবা ব্যবসা—সব হিসাব এক জায়গায়
            </h2>
            <p className="text-xs sm:text-base text-slate-600">
              কাগজে-কলমে লিখে হারিয়ে ফেলার দিন শেষ। যেকোনো স্মার্টফোন বা
              কম্পিউটার থেকে ব্যবহার করুন নিশ্চিন্তে।
            </p>
          </div>

          {/* Story 1: Family & Couple */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-200/90 group">
              <img
                src="/marketing/marketing-family-couple.png"
                alt="Likhe Rakho for Families - সুখী পরিবারের গোছানো সংসার"
                className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-500"
              />
            </div>
            <div className="space-y-4">
              <span className="text-xs font-bold tracking-wider uppercase text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-3 py-1 rounded-full">
                সুখী পরিবারের গোছানো সংসার
              </span>
              <h3 className="text-xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                মাসিক বাজার খরচ, বাড়ি ভাড়া ও সঞ্চয়ের স্বচ্ছ হিসাব
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                সংসারের টুকিটাকি বাজার খরচ, ডিপিএস জমার তারিখ কিংবা সন্তানের
                স্কুলের ফি—মাস শেষে হিসাব না মেলার দিন শেষ। পরিবারের সবাইকে
                যুক্ত করুন তাদের ব্যক্তিগত গোপনীয়তা রক্ষা করেই।
              </p>
              <div className="space-y-2.5 pt-2 text-xs sm:text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>৪-ডিজিটের গোপন পিনে ব্যক্তিগত দৈনিক খরচ সুরক্ষিত</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    কাটা-ছেঁড়া ছাড়াই প্রতি মাসের ক্যাটাগরি অনুযায়ী রিপোর্ট
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    ফ্যামিলি মেম্বারদের জন্য কাস্টমাইজড পারমিশন ও এক্সেস
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Story 2: Professional & Busy Individuals */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="order-2 lg:order-1 space-y-4">
              <span className="text-xs font-bold tracking-wider uppercase text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-3 py-1 rounded-full">
                পেশাজীবী ও ব্যবসায়ীদের জন্য
              </span>
              <h3 className="text-xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                গাড়ির ডেডলাইন, ব্যাংক লোন কিস্তি ও গুরুত্বপূর্ণ দলিল
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                ব্যস্ততার মাঝে গাড়ির ট্যাক্স টোকেন বা ফিটনেসের ডেট ভুলে গিয়ে
                অতিরিক্ত জরিমানা দেওয়া বন্ধ করুন। লাইসেন্স, পাসপোর্ট বা চুক্তির
                মেয়াদ শেষ হওয়ার আগেই লিখে রাখো আপনাকে জানিয়ে দেবে।
              </p>
              <div className="space-y-2.5 pt-2 text-xs sm:text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    বিআরটিএ ফিটনেস, ট্যাক্স টোকেন ও ইন্স্যুরেন্স এক্সপায়ারি
                    ট্র্যাকিং
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    ব্যাংক লোন ও ইএমআই কিস্তির সময়মতো অটোমেটিক রিমাইন্ডার
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    ডিজিটাল এনক্রিপ্টেড পেপার ভল্ট—ডকুমেন্ট কখনোই হারাবে না
                  </span>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2 relative rounded-3xl overflow-hidden shadow-xl border border-slate-200/90 group">
              <img
                src="/marketing/marketing-professional.png"
                alt="Likhe Rakho for Professionals - পেশাজীবীদের নির্ভরযোগ্য সঙ্গী"
                className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-500"
              />
            </div>
          </div>

          {/* Story 3: Mobile Experience Everywhere */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-200/90 group">
              <img
                src="/marketing/marketing-mobile-features.png"
                alt="Likhe Rakho Mobile Experience - মোবাইল অ্যাপে সব ফিচার"
                className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-500"
              />
            </div>
            <div className="space-y-4">
              <span className="text-xs font-bold tracking-wider uppercase text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-3 py-1 rounded-full">
                যেকোনো সময়, যেকোনো স্থান থেকে
              </span>
              <h3 className="text-xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                পকেটের ফোনেই আপনার সম্পূর্ণ লাইফ ড্যাশবোর্ড
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                বাজারে কেনাকাটার সময় বা যাত্রাপথে—কয়েক সেকেন্ডেই খরচের হিসাব
                তুলুন অথবা গাড়ির পেপারের ছবি দেখে নিন। ইন্টারনেট স্লো থাকলেও
                মসৃণ অভিজ্ঞতা।
              </p>
              <div className="space-y-2.5 pt-2 text-xs sm:text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>অফলাইন সাপোর্ট ও দ্রুত লোডিং স্পিড</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>ক্লিন ইন্টারফেস ও সহজ বাংলা/ইংরেজি ভাষা সমর্থন</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>কমপ্লিট ক্লাউড সিংক—ফোন হারালেও ডেটা নিরাপদ</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Bottom Call-To-Action Banner */}
      <section className="bg-gradient-to-tr from-[#064e3b] to-[#0d825c] text-white py-14 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto space-y-5 relative z-10">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            আজই শুরু করুন, মনে রাখার ঝামেলা শেষ হোক।
          </h2>
          <p className="text-xs sm:text-base text-emerald-100/90 leading-relaxed max-w-xl mx-auto">
            Likhe Rakho-তে আপনার পরিবার ও ব্যক্তিগত সব গুরুত্বপূর্ণ রেকর্ড
            সাজিয়ে রাখুন সম্পূর্ণ বিনামূল্যে।
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => handleStart("sign-up")}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white text-[#064e3b] font-bold text-sm shadow-xl hover:bg-emerald-50 active:scale-95 transition cursor-pointer"
            >
              সাইন আপ করুন (Create Free Account)
            </button>
            <button
              type="button"
              onClick={() => handleStart("sign-in")}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl border border-emerald-400/40 bg-emerald-900/40 text-white font-semibold text-sm hover:bg-emerald-900/60 transition cursor-pointer"
            >
              আগের একাউন্টে লগইন
            </button>
          </div>
        </div>
      </section>

      {/* 5. Footer */}
      <footer className="border-t border-slate-200/90 bg-white py-8 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Likhe Rakho"
              className="h-6 w-6 object-contain"
            />
            <span className="font-bold text-slate-800">
              Likhe Rakho (লিখে রাখো)
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-[#064e3b] font-medium">
              মনে রাখার ঝামেলা শেষ, লিখে রাখো।
            </span>
          </div>
          <div>
            &copy; {new Date().getFullYear()} Likhe Rakho. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
