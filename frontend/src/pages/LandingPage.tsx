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
  Check,
  CreditCard,
  Crown,
  ChevronDown,
} from "lucide-react";
import { AuthPage } from "./AuthPage";

interface LandingPageProps {
  onOpenAuth?: (mode: "sign-in" | "sign-up") => void;
}

export function LandingPage({ onOpenAuth }: LandingPageProps) {
  // If user clicks Sign Up or Sign In on web, we show the Auth view
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up" | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  if (authMode) {
    return (
      <AuthPage
        initialMode={authMode}
        onSwitchMode={(m) => setAuthMode(m)}
        onBackToLanding={() => setAuthMode(null)}
      />
    );
  }

  const handleStart = (mode: "sign-in" | "sign-up") => {
    if (onOpenAuth) {
      onOpenAuth(mode);
    } else {
      setAuthMode(mode);
    }
  };

  const toggleFaq = (index: number) => {
    setFaqOpen(faqOpen === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#f6faf7] text-slate-900 flex flex-col selection:bg-emerald-200 selection:text-emerald-950 font-sans">
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

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <a href="#solutions" className="hover:text-emerald-700 transition">
              কেন প্রয়োজন?
            </a>
            <a href="#features" className="hover:text-emerald-700 transition">
              ফিচারসমূহ
            </a>
            <a href="#pricing" className="hover:text-emerald-700 transition font-bold text-emerald-800">
              প্ল্যান ও প্রাইসিং
            </a>
            <a href="#property-pro" className="hover:text-emerald-700 transition">
              বাড়িওয়ালা স্পেশাল
            </a>
            <a href="#faq" className="hover:text-emerald-700 transition">
              প্রশ্নোত্তর
            </a>
          </nav>

          {/* Action Buttons */}
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
              <span className="sm:hidden">ফ্রি শুরু করুন</span>
              <span className="hidden sm:inline">বিনামূল্যে শুরু করুন</span>
              <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section: Digital Life Management Platform */}
      <section className="relative overflow-hidden pt-10 pb-16 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24 border-b border-slate-200/70 bg-gradient-to-b from-white via-[#f6faf7] to-[#ebf7f0]/40">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-gradient-to-tr from-emerald-200/40 via-teal-200/30 to-transparent blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 xl:gap-12 items-center">
            {/* Left Column */}
            <div className="lg:col-span-6 xl:col-span-7 text-center lg:text-left">
              {/* Category Positioning Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/90 bg-emerald-50/90 px-4 py-1.5 text-xs font-bold text-[#064e3b] shadow-2xs mb-5">
                <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>বাংলাদেশের পরিবারের ডিজিটাল লাইফ ম্যানেজমেন্ট প্ল্যাটফর্ম</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-5xl xl:text-6xl font-black tracking-tight text-slate-900 leading-[1.18]">
                জীবনের জরুরি সব হিসাব, <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#064e3b] via-[#0d825c] to-[#00a859]">
                  এক অ্যাপেই।
                </span>
              </h1>

              {/* Subtitle Value Proposition */}
              <p className="mt-4 sm:mt-5 text-sm sm:text-base lg:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                গাড়ি, বাড়ি, জমির দলিল, গুরুত্বপূর্ণ ডকুমেন্ট, আয়-ব্যয়, কিস্তি আর মেয়াদ শেষ হওয়ার রিমাইন্ডার—সবকিছু গুছিয়ে রাখুন এক জায়গায়।
              </p>

              {/* Strongest Selling Point Callout */}
              <div className="mt-4 py-2 px-3.5 bg-emerald-100/50 border border-emerald-200/80 rounded-xl inline-block max-w-xl text-xs sm:text-sm font-semibold text-[#064e3b]">
                💡 মনে রাখার ঝামেলা শেষ, লিখে রাখো। আপনার জীবন, আপনার হিসাব, আপনার নিয়ন্ত্রণ।
              </div>

              {/* Primary Action Buttons */}
              <div className="mt-7 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5">
                <button
                  type="button"
                  onClick={() => handleStart("sign-up")}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-tr from-[#064e3b] to-[#0d825c] px-7 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-950/20 hover:from-[#073f30] hover:to-[#0b6e4e] active:scale-98 transition cursor-pointer"
                >
                  <span>বিনামূল্যে খাতা খুলুন (Start Free)</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <a
                  href="#pricing"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 active:scale-98 transition cursor-pointer"
                >
                  <CreditCard className="h-4 w-4 text-emerald-700" />
                  <span>প্ল্যান ও খরচ দেখুন (View Pricing)</span>
                </a>
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
                  <span>বিকাশ ও নগদে সহজ সাবস্ক্রিপশন</span>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Visual Showcase */}
            <div className="lg:col-span-6 xl:col-span-5 relative mt-6 lg:mt-0">
              <div className="absolute -inset-3 bg-gradient-to-tr from-emerald-400/20 via-teal-300/20 to-emerald-200/20 rounded-3xl blur-2xl animate-pulse-glow pointer-events-none" />
              <div className="relative animate-float-gentle">
                <div className="relative rounded-3xl p-2.5 sm:p-3.5 bg-gradient-to-b from-white via-emerald-50/40 to-white shadow-2xl shadow-emerald-950/20 border border-emerald-100/90 backdrop-blur-md group overflow-hidden transition-all duration-300 hover:shadow-emerald-950/25">
                  <img
                    src="/marketing/marketing-mobile-app.png"
                    alt="Likhe Rakho Mobile App Mockup - লিখে রাখো মোবাইল অ্যাপ্লিকেশন"
                    className="w-full rounded-2xl object-cover shadow-xs group-hover:scale-[1.015] transition-transform duration-500"
                  />
                  <div className="mt-3 sm:mt-0 sm:absolute sm:-bottom-3 sm:left-1/2 sm:-translate-x-1/2 bg-white/95 backdrop-blur-md px-4 sm:px-5 py-2 rounded-full border border-emerald-200/90 shadow-md flex items-center justify-center gap-2 text-[11px] sm:text-xs font-bold text-[#064e3b] whitespace-nowrap">
                    <Smartphone className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>অ্যান্ড্রয়েড স্মার্টফোন ও ওয়েবে রিয়েল-টাইম সিংক</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Why People in Bangladesh Would Pay (Problem vs Marketing Message) */}
      <section id="solutions" className="py-16 sm:py-20 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3.5 py-1 rounded-full">
              বাস্তব জীবনের বাস্তব সমাধান
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              যেসব সমস্যার মুখোমুখি আমরা প্রতিদিন হই
            </h2>
            <p className="text-xs sm:text-base text-slate-600">
              কাগজপত্র হারিয়ে যাওয়া বা ডেডলাইন ভুলে আর্থিক জরিমানা দেওয়ার দিন এবার শেষ।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                problem: "BRTA documents expire",
                title: "গাড়ির কাগজপত্র ও জরিমানা",
                banglaMessage: "গাড়ির ট্যাক্স টোকেন, ফিটনেস বা ইন্স্যুরেন্সের মেয়াদ ভুলে যাবেন না",
                detail: "পুলিশের মামলা, রেকারিং ফি আর বিআরটিএ-র জরিমানা থেকে রেহাই পান সময়মতো রিমাইন্ডারে।",
                icon: Car,
                color: "text-amber-600 bg-amber-50 border-amber-200",
              },
              {
                problem: "Property rent records become confusing",
                title: "বাড়িভাড়া ও বকেয়া আদায়",
                banglaMessage: "কোন ভাড়াটিয়া কত টাকা দিল, কত বাকি—সব হিসাব এক জায়গায়",
                detail: "ভাড়ার খাতা হারিয়ে যাওয়ার বা ভাড়াটিয়ার সাথে হিসাবের গরমিল হওয়ার আর কোনো সুযোগ নেই।",
                icon: Building2,
                color: "text-indigo-600 bg-indigo-50 border-indigo-200",
              },
              {
                problem: "Important documents are misplaced",
                title: "দলিল ও প্রয়োজনীয় পেপার্স",
                banglaMessage: "প্রয়োজনীয় ডকুমেন্ট খুঁজতে আর ফাইলের পর ফাইল ঘাঁটতে হবে না",
                detail: "পাসপোর্ট, এনআইডি, জমির খতিয়ান বা সার্টিফিকেট থাকবে আপনার পকেটের নিরাপদ ভল্টে।",
                icon: FileText,
                color: "text-emerald-600 bg-emerald-50 border-emerald-200",
              },
              {
                problem: "DPS or EMI due dates are forgotten",
                title: "ডিপিএস ও ব্যাংক লোনের কিস্তি",
                banglaMessage: "মাসিক কিস্তি ও সঞ্চয়ের সময়সূচি সহজে ট্র্যাক করুন",
                detail: "কিস্তির তারিখ ভুলে ব্যাংকের পেনাল্টি চার্জ দেওয়া বন্ধ করুন। লাভ ও জমার হিসাব পরিষ্কার।",
                icon: Wallet,
                color: "text-rose-600 bg-rose-50 border-rose-200",
              },
              {
                problem: "Warranty paperwork gets lost",
                title: "গ্যাজেট ও ফার্নিচার ওয়ারেন্টি",
                banglaMessage: "পণ্যের ওয়ারেন্টি ও মেয়াদ সংরক্ষণ করুন",
                detail: "এসি, ফ্রিজ বা ল্যাপটপ নষ্ট হলে মেমো না পেয়ে পকেট থেকে টাকা দেওয়ার দিন শেষ।",
                icon: ShieldCheck,
                color: "text-teal-600 bg-teal-50 border-teal-200",
              },
              {
                problem: "Family records are scattered",
                title: "পরিবারের জরুরি নথিপত্র",
                banglaMessage: "পরিবারের জরুরি তথ্য গুছিয়ে রাখুন, প্রয়োজনমতো শেয়ার করুন",
                detail: "জরুরি মুহূর্তে রক্তের গ্রুপ, এনআইডি বা হেলথ রেকর্ড খুঁজে পেতে এক সেকেন্ডও লাগবে না।",
                icon: Users,
                color: "text-purple-600 bg-purple-50 border-purple-200",
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 bg-[#f8faf9] p-5 hover:bg-white hover:border-emerald-300 hover:shadow-sm transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${item.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-900">{item.title}</span>
                    </div>
                    <h3 className="text-sm font-bold text-[#064e3b] leading-snug">
                      "{item.banglaMessage}"
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {item.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Core Features Grid */}
      <section id="features" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/70 px-3.5 py-1 text-xs font-bold text-[#064e3b] mb-3">
            <span>এক অ্যাপ, অসংখ্য সুবিধা</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            দৈনন্দিন জীবনের সব গুরুত্বপূর্ণ হিসাব এখন এক ছাতার নিচে
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-500">
            One app to manage the important things in your life, built specifically for Bangladesh.
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
              জাতীয় পরিচয়পত্র (NID), পাসপোর্ট, জন্ম নিবন্ধন, ড্রাইভিং লাইসেন্স ও জমির দলিলের মেয়াদ শেষ হওয়ার আগেই স্বয়ংক্রিয় নোটিফিকেশন।
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
              গাড়ি বা বাইকের ট্যাক্স টোকেন, ফিটনেস সার্টিফিকেট, রুট পারমিট ও ইন্স্যুরেন্স শেষ হওয়ার ডেট ট্র্যাকিং এবং তেল/মেরামত খরচ।
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
              দৈনিক বাজার ও পার্সোনাল খরচ এন্ট্রি, ক্রেডিট কার্ড বিল, লোন কিস্তি এবং ডিপিএস/সঞ্চয়পত্রের জমা ও অবশিষ্ট হিসেব।
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
              ভাড়াটিয়ার বিবরণ, এগ্রিমেন্ট পেপার, প্রতি মাসের ভাড়া আদায় ও বকেয়া হিসেব এক ক্লিকেই ম্যানেজ করুন।
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
              টিভি, ফ্রিজ, এসি বা ফোনের মেমো ও ওয়ারেন্টি পেপার হারানো বন্ধ। মেয়াদ কতদিন বাকি সরাসরি হোম স্ক্রিনেই দেখতে পাবেন।
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
              পরিবারের সদস্যদের যুক্ত করুন নির্দিষ্ট অ্যাক্সেস সুবিধাসহ। যার যার ব্যক্তিগত খরচ সুরক্ষিত থাকবে ৪-ডিজিটের পার্সোনাল পিনে।
            </p>
          </div>
        </div>
      </section>

      {/* 5. PRICING PLANS SECTION (The Core Update) */}
      <section id="pricing" className="py-16 sm:py-24 bg-gradient-to-b from-[#f2f8f4] via-white to-[#f6faf7] border-y border-slate-200/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-10">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/90 px-3.5 py-1 text-xs font-bold text-[#064e3b]">
              <span>SIMPLE & AFFORDABLE · সহজ ও সাশ্রয়ী</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              আপনার প্রয়োজন অনুযায়ী সঠিক প্ল্যানটি বেছে নিন
            </h2>
            <p className="text-xs sm:text-base text-slate-600">
              নিজের জন্য, পরিবারের জন্য কিংবা বাড়ি-গাড়ি ও সম্পত্তি ব্যবস্থাপনায়—লিখে রাখো আছে আপনার পাশে।
            </p>

            {/* Monthly / Yearly Billing Toggle */}
            <div className="pt-4 flex items-center justify-center">
              <div className="inline-flex items-center p-1 rounded-2xl border border-slate-200 bg-white shadow-xs">
                <button
                  type="button"
                  onClick={() => setBillingCycle("monthly")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    billingCycle === "monthly"
                      ? "bg-emerald-800 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  মাসিক বিলিং (Monthly)
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("yearly")}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    billingCycle === "yearly"
                      ? "bg-emerald-800 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>বার্ষিক বিলিং (Yearly)</span>
                  <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-extrabold">
                    ২ মাস ফ্রি!
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Pricing Cards Grid (Free, Personal, Family, Premium) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {/* 1. FREE TIER */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  আগে ব্যবহার করে দেখি
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">Free</h3>
                <p className="text-xs text-slate-500 mt-1">Try the essentials</p>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-900">৳০</span>
                    <span className="text-xs text-slate-500 font-medium">/চিরদিনের জন্য</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">কোনো হিডেন ফি নেই</p>
                </div>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>১ জন</strong> ইউজার অ্যাকাউন্ট</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>বেসিক টাস্ক ও খরচ ট্র্যাকিং</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>১০টি পর্যন্ত স্টোর করা ডকুমেন্ট</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>১টি গাড়ি অথবা ১টি প্রোপার্টি</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>বেসিক ইন-অ্যাপ রিমাইন্ডার</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>১০০ MB সুরক্ষিত ক্লাউড স্টোরেজ</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleStart("sign-up")}
                  className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
                >
                  ফ্রি শুরু করুন (Start Free)
                </button>
              </div>
            </div>

            {/* 2. PERSONAL TIER */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                  শুধু আমার জন্য
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">Personal</h3>
                <p className="text-xs text-slate-500 mt-1">Stay organized every day</p>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-900">
                      {billingCycle === "yearly" ? "৳৯৯৯" : "৳৯৯"}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {billingCycle === "yearly" ? "/বছর" : "/মাস"}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                    {billingCycle === "yearly" ? "≈ ৳৮৩/মাস (বার্ষিক বিলিং)" : "মাসিক বিলিং"}
                  </p>
                </div>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>১ জন</strong> একক ইউজার</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>আনলিমিটেড</strong> টাস্ক ও খরচ এন্ট্রি</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>১০০টি পর্যন্ত স্টোর করা ডকুমেন্ট</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>৩টি পর্যন্ত গাড়ি বা প্রোপার্টি রেকর্ড</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>খরচের অ্যানালিটিক্স ও ক্যাটাগরি চার্ট</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>১ GB দ্রুতগতির ক্লাউড স্টোরেজ</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>রিনিউয়াল ও পেমেন্ট রিমাইন্ডার</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleStart("sign-up")}
                  className="w-full py-2.5 rounded-xl border border-emerald-600 text-xs font-bold text-emerald-800 hover:bg-emerald-50 transition cursor-pointer"
                >
                  পার্সোনাল বেছে নিন
                </button>
              </div>
            </div>

            {/* 3. FAMILY TIER (PRIMARY HERO CONSUMER PLAN) */}
            <div className="relative rounded-3xl border-2 border-emerald-600 bg-white p-6 shadow-xl shadow-emerald-950/10 flex flex-col justify-between">
              {/* Highlight Ribbon */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#064e3b] to-[#0d825c] text-white text-[10px] font-extrabold uppercase px-3.5 py-1 rounded-full shadow-sm tracking-wide">
                ⭐ সেরা চয়েস · Most Popular
              </div>

              <div>
                <span className="text-[11px] font-bold text-[#064e3b] uppercase tracking-wider">
                  আমার পরিবারের জন্য
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-1.5">
                  <span>Family</span>
                  <Crown className="h-4 w-4 text-amber-500 fill-amber-400" />
                </h3>
                <p className="text-xs text-slate-500 mt-1">Keep your family in sync</p>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-[#064e3b]">
                      {billingCycle === "yearly" ? "৳১,৯৯৯" : "৳১৯৯"}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {billingCycle === "yearly" ? "/বছর" : "/মাস"}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                    {billingCycle === "yearly" ? "≈ ৳১৬৭/মাস (বার্ষিক বিলিং)" : "মাসিক বিলিং"}
                  </p>
                </div>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-700 font-medium">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>৫ জন পর্যন্ত</strong> ফ্যামিলি মেম্বার এক্সেস</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>৫০০টি পর্যন্ত স্টোর করা ডকুমেন্ট</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>১০টি পর্যন্ত গাড়ি বা প্রোপার্টি</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>DPS, FDR এবং EMI লোন</strong> ফুল ম্যানেজমেন্ট</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>ফ্যামিলি শেয়ারিং ও প্রাইভেসি পারমিশন কন্ট্রোল</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>৫ GB</strong> সুপার-ফাস্ট ক্লাউড স্টোরেজ</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>অ্যাডভান্সড ট্রেন্ডস, অ্যালার্ট ও রিপোর্ট</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleStart("sign-up")}
                  className="w-full py-3 rounded-xl bg-gradient-to-tr from-[#064e3b] to-[#0d825c] text-xs font-bold text-white shadow-md shadow-emerald-950/20 hover:from-[#073f30] hover:to-[#0b6e4e] active:scale-98 transition cursor-pointer"
                >
                  ফ্যামিলি প্ল্যান শুরু করুন
                </button>
              </div>
            </div>

            {/* 4. PREMIUM TIER */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  বিশাল অ্যাসেট ও দায়িত্ব
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">Premium</h3>
                <p className="text-xs text-slate-500 mt-1">Manage more assets and records</p>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-900">
                      {billingCycle === "yearly" ? "৳৩,৯৯৯" : "৳৩৯৯"}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {billingCycle === "yearly" ? "/বছর" : "/মাস"}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                    {billingCycle === "yearly" ? "≈ ৳৩৩৩/মাস (বার্ষিক বিলিং)" : "মাসিক বিলিং"}
                  </p>
                </div>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>১০ জন পর্যন্ত</strong> মেম্বার এক্সেস</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>হায়ার ডকুমেন্ট ও অ্যাসেট লিমিট</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>২৫ GB</strong> হাই-ক্যাপাসিটি ক্লাউড স্পেস</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>প্রোপার্টি, ভাড়াটিয়া ও রেন্ট ইনসাইটস</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>কমপ্রিহেনসিভ ফাইনান্সিয়াল অ্যানালিটিক্স</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>অ্যাডভান্সড PDF / Excel রিপোর্ট এক্সপোর্ট</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>প্রায়োরিটি কাস্টমার সাপোর্ট</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleStart("sign-up")}
                  className="w-full py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-50 transition cursor-pointer"
                >
                  প্রিমিয়াম প্ল্যান বেছে নিন
                </button>
              </div>
            </div>
          </div>

          {/* DEDICATED PLAN FOR LANDLORDS & PROPERTY OWNERS */}
          <div id="property-pro" className="mt-14 rounded-3xl border-2 border-emerald-800/80 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/20 p-6 sm:p-10 shadow-lg">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-800 text-white px-3.5 py-1 text-xs font-bold">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>বাড়িওয়ালা ও প্রোপার্টি ওনার্স স্পেশাল · For Landlords</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Likhe Rakho Property Pro (আমার সম্পত্তির জন্য)
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
                  যাঁরা একাধিক ফ্ল্যাট বা দোকান ভাড়া দেন—শুধু স্টোরেজ নয়, ভাড়া আদায়, বকেয়া হিসাব, ভাড়াটিয়া চুক্তি ও মেইনটেন্যান্স খরচের স্বয়ংক্রিয় সমাধান।
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span>৩০টি পর্যন্ত ভাড়াযোগ্য ইউনিট (ফ্ল্যাট/দোকান)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span>ভাড়াটিয়ার প্রোফাইল ও চুক্তিপত্র সংরক্ষণ</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span>মাসিক ভাড়া আদায় ও বকেয়া ট্র্যাকিং</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span>মেইনটেন্যান্স খরচ লগ ও ট্রেন্ড গ্রাফ</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span>ভাড়ার ডিজিটাল মানি রিসিট ও রিপোর্ট এক্সপোর্ট</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span>ম্যানেজার বা কেয়ারটেকারের জন্য সীমাবদ্ধ পারমিশন</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 bg-white rounded-2xl border border-emerald-200/90 p-6 text-center shadow-sm">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  প্রোপার্টি প্রো প্ল্যান
                </span>
                <div className="mt-2 flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-black text-[#064e3b]">
                    {billingCycle === "yearly" ? "৳৫,৯৯৯" : "৳৫৯৯"}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    {billingCycle === "yearly" ? "/বছর" : "/মাস"}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                  {billingCycle === "yearly" ? "≈ ৳৪৯৯/মাস (বার্ষিক বিলিংয়ে সেভ করুন)" : "মাসিক সহজ পেমেন্ট"}
                </p>

                <button
                  type="button"
                  onClick={() => handleStart("sign-up")}
                  className="mt-6 w-full py-3 rounded-xl bg-gradient-to-tr from-[#064e3b] to-[#0d825c] text-xs font-bold text-white shadow-md shadow-emerald-950/20 hover:from-[#073f30] hover:to-[#0b6e4e] active:scale-95 transition cursor-pointer"
                >
                  প্রোপার্টি প্রো শুরু করুন
                </button>
                <p className="text-[10px] text-slate-400 mt-2">
                  * ৩০টির বেশি ইউনিটের জন্য কাস্টমাইজড এন্টারপ্রাইজ প্ল্যান উপলব্ধ
                </p>
              </div>
            </div>
          </div>

          {/* 6. Feature Comparison Table */}
          <div className="mt-16 overflow-x-auto rounded-3xl border border-slate-200/90 bg-white shadow-2xs">
            <div className="p-5 border-b border-slate-100 bg-slate-50/70">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                বিস্তারিত ফিচার তুলনা (Feature Matrix Comparison)
              </h3>
              <p className="text-xs text-slate-500">কোন প্ল্যানে কী কী সুবিধা পাচ্ছেন এক নজরে দেখে নিন</p>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 bg-slate-50/30">
                  <th className="py-3 px-4 font-bold text-slate-900">সুবিধাসমূহ / Capability</th>
                  <th className="py-3 px-3 text-center font-bold">Free (৳০)</th>
                  <th className="py-3 px-3 text-center font-bold">Personal (৳৯৯)</th>
                  <th className="py-3 px-3 text-center font-bold text-emerald-800 bg-emerald-50/40">
                    Family (৳১৯৯)
                  </th>
                  <th className="py-3 px-3 text-center font-bold">Premium (৳৩৯৯)</th>
                  <th className="py-3 px-3 text-center font-bold">Property Pro (৳৫৯৯)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="py-3 px-4 font-medium">টাস্ক ও রিমাইন্ডার ম্যানেজমেন্ট</td>
                  <td className="py-3 px-3 text-center text-emerald-600 font-bold">✓</td>
                  <td className="py-3 px-3 text-center text-emerald-600 font-bold">✓</td>
                  <td className="py-3 px-3 text-center text-emerald-600 font-bold bg-emerald-50/40">✓</td>
                  <td className="py-3 px-3 text-center text-emerald-600 font-bold">✓</td>
                  <td className="py-3 px-3 text-center text-emerald-600 font-bold">✓</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">দৈনিক আয়-ব্যয় ট্র্যাকিং</td>
                  <td className="py-3 px-3 text-center">বেসিক</td>
                  <td className="py-3 px-3 text-center text-emerald-600 font-bold">আনলিমিটেড</td>
                  <td className="py-3 px-3 text-center text-emerald-600 font-bold bg-emerald-50/40">আনলিমিটেড</td>
                  <td className="py-3 px-3 text-center text-emerald-600 font-bold">আনলিমিটেড</td>
                  <td className="py-3 px-3 text-center text-emerald-600 font-bold">আনলিমিটেড</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">খরচের বিশদ চার্ট ও ট্রেন্ড অ্যানালিটিক্স</td>
                  <td className="py-3 px-3 text-center text-slate-300">—</td>
                  <td className="py-3 px-3 text-center text-emerald-600 font-bold">✓</td>
                  <td className="py-3 px-3 text-center text-emerald-600 font-bold bg-emerald-50/40">✓ অ্যাডভান্সড</td>
                  <td className="py-3 px-3 text-center text-emerald-600 font-bold">✓ ফুল স্যুট</td>
                  <td className="py-3 px-3 text-center text-emerald-600 font-bold">✓ প্রোপার্টি ড্যাশবোর্ড</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">সুরক্ষিত ক্লাউড ডকুমেন্ট স্টোরেজ</td>
                  <td className="py-3 px-3 text-center font-semibold">১০০ MB</td>
                  <td className="py-3 px-3 text-center font-semibold">১ GB</td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-800 bg-emerald-50/40">৫ GB</td>
                  <td className="py-3 px-3 text-center font-bold">২৫ GB</td>
                  <td className="py-3 px-3 text-center font-bold">২৫ GB</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">গাড়ি ও প্রোপার্টি রেকর্ড সংখ্যা</td>
                  <td className="py-3 px-3 text-center">১টি</td>
                  <td className="py-3 px-3 text-center">৩টি</td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-800 bg-emerald-50/40">১০টি</td>
                  <td className="py-3 px-3 text-center font-bold">উচ্চ লিমিট</td>
                  <td className="py-3 px-3 text-center font-bold text-indigo-700">৩০টি ইউনিট</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">DPS, FDR ও ব্যাংক লোন EMI ট্র্যাকার</td>
                  <td className="py-3 px-3 text-center text-slate-400">সীমিত</td>
                  <td className="py-3 px-3 text-center text-emerald-600 font-bold">✓</td>
                  <td className="py-3 px-3 text-center text-emerald-600 font-bold bg-emerald-50/40">✓ সম্পূর্ণ</td>
                  <td className="py-3 px-3 text-center text-emerald-600 font-bold">✓ সম্পূর্ণ</td>
                  <td className="py-3 px-3 text-center text-emerald-600 font-bold">✓ সম্পূর্ণ</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">ফ্যামিলি মেম্বার যুক্ত করার সুবিধা</td>
                  <td className="py-3 px-3 text-center text-slate-300">—</td>
                  <td className="py-3 px-3 text-center text-slate-300">—</td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-800 bg-emerald-50/40">৫ জন সদস্য</td>
                  <td className="py-3 px-3 text-center font-bold">১০ জন সদস্য</td>
                  <td className="py-3 px-3 text-center font-bold">৫ জন + ম্যানেজার</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">কাস্টম পারমিশন কন্ট্রোল ও পিন লক</td>
                  <td className="py-3 px-3 text-center text-slate-300">—</td>
                  <td className="py-3 px-3 text-center">ব্যক্তিগত পিন</td>
                  <td className="py-3 px-3 text-center text-emerald-600 font-bold bg-emerald-50/40">রোল-ভিত্তিক</td>
                  <td className="py-3 px-3 text-center text-emerald-600 font-bold">অ্যাডভান্সড</td>
                  <td className="py-3 px-3 text-center text-emerald-600 font-bold">স্টাফ/ম্যানেজার রোল</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">PDF ও Excel রিপোর্ট এক্সপোর্ট</td>
                  <td className="py-3 px-3 text-center text-slate-300">—</td>
                  <td className="py-3 px-3 text-center">বেসিক</td>
                  <td className="py-3 px-3 text-center text-emerald-600 font-bold bg-emerald-50/40">অ্যাডভান্সড</td>
                  <td className="py-3 px-3 text-center text-emerald-600 font-bold">ফুল এক্সপোর্ট</td>
                  <td className="py-3 px-3 text-center text-emerald-600 font-bold">ভাড়ার রশিদ + রিপোর্ট</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">কাস্টমার সাপোর্ট</td>
                  <td className="py-3 px-3 text-center">কমিউনিটি</td>
                  <td className="py-3 px-3 text-center">স্ট্যান্ডার্ড</td>
                  <td className="py-3 px-3 text-center bg-emerald-50/40">স্ট্যান্ডার্ড</td>
                  <td className="py-3 px-3 text-center text-emerald-700 font-bold">প্রায়োরিটি</td>
                  <td className="py-3 px-3 text-center text-emerald-700 font-bold">ডেডিকেটেড VIP</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 7. Bangladeshi Payment Methods Supported */}
          <div className="mt-12 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs text-center space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              বাংলাদেশের সহজ ও জনপ্রিয় পেমেন্ট মেথড সমর্থিত
            </h4>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 pt-1">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 font-bold text-xs">
                <span>বিকাশ (bKash)</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 font-bold text-xs">
                <span>নগদ (Nagad)</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-800 font-bold text-xs">
                <span>রকেট (Rocket)</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 font-bold text-xs">
                <span>ইসলামিক ও লোকাল ব্যাংক ট্রান্সফার</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 font-bold text-xs">
                <span>Visa / Mastercard / NRB Cards</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              * বিকাশ অটো-রিনিউয়াল অথবা বাৎসরিক এককালীন পেমেন্ট—যেকোনো উপায়ে নিশ্চিন্তে রিচার্জ করুন।
            </p>
          </div>
        </div>
      </section>

      {/* 6. Lifestyle & Real-World Branding Showcase */}
      <section className="py-16 sm:py-24 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 sm:space-y-24">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/70 px-3.5 py-1 text-xs font-bold text-[#064e3b]">
              <span>বাস্তব জীবনের প্রতিদিনের নির্ভরযোগ্য সঙ্গী</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              পরিবার, চাকরি কিংবা ব্যবসা—সব হিসাব এক জায়গায়
            </h2>
            <p className="text-xs sm:text-base text-slate-600">
              কাগজে-কলমে লিখে হারিয়ে ফেলার দিন শেষ। যেকোনো স্মার্টফোন বা কম্পিউটার থেকে ব্যবহার করুন নিশ্চিন্তে।
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
                সংসারের টুকিটাকি বাজার খরচ, ডিপিএস জমার তারিখ কিংবা সন্তানের স্কুলের ফি—মাস শেষে হিসাব না মেলার দিন শেষ। পরিবারের সবাইকে যুক্ত করুন তাদের ব্যক্তিগত গোপনীয়তা রক্ষা করেই।
              </p>
              <div className="space-y-2.5 pt-2 text-xs sm:text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>৪-ডিজিটের গোপন পিনে ব্যক্তিগত দৈনিক খরচ সুরক্ষিত</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>কাটা-ছেঁড়া ছাড়াই প্রতি মাসের ক্যাটাগরি অনুযায়ী রিপোর্ট</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>ফ্যামিলি মেম্বারদের জন্য কাস্টমাইজড পারমিশন ও এক্সেস</span>
                </div>
              </div>
            </div>
          </div>

          {/* Story 2: Professional & Busy Individuals */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="order-2 lg:order-1 space-y-4">
              <span className="text-xs font-bold tracking-wider uppercase text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-3 py-1 rounded-full">
                পেশাজীবী ও গাড়ির মালিকদের জন্য
              </span>
              <h3 className="text-xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                গাড়ির ডেডলাইন, ব্যাংক লোন কিস্তি ও গুরুত্বপূর্ণ দলিল
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                ব্যস্ততার মাঝে গাড়ির ট্যাক্স টোকেন বা ফিটনেসের ডেট ভুলে গিয়ে অতিরিক্ত জরিমানা দেওয়া বন্ধ করুন। লাইসেন্স, পাসপোর্ট বা চুক্তির মেয়াদ শেষ হওয়ার আগেই লিখে রাখো আপনাকে জানিয়ে দেবে।
              </p>
              <div className="space-y-2.5 pt-2 text-xs sm:text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>বিআরটিএ ফিটনেস, ট্যাক্স টোকেন ও ইন্স্যুরেন্স এক্সপায়ারি ট্র্যাকিং</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>ব্যাংক লোন ও ইএমআই কিস্তির সময়মতো অটোমেটিক রিমাইন্ডার</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>ডিজিটাল এনক্রিপ্টেড পেপার ভল্ট—ডকুমেন্ট কখনোই হারাবে না</span>
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
        </div>
      </section>

      {/* 7. Security & Data Ownership Assurance */}
      <section className="py-14 sm:py-20 bg-[#f4faf6] border-b border-slate-200/90">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            আপনার নথিপত্র ও ব্যক্তিগত তথ্য ১০০% সুরক্ষিত
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
            জাতীয় পরিচয়পত্র, পাসপোর্ট বা দলিলের মতো স্পর্শকাতর তথ্য আপনার অনুমতি ছাড়া কেউ দেখতে পারবে না। আমরা ব্যবহার করি ব্যাংক-লেভেল এনক্রিপশন ও লোকাল সিকিউরিটি পিন ভল্ট।
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs font-semibold text-slate-700">
            <div className="p-4 rounded-2xl bg-white border border-emerald-100 shadow-2xs">
              🔒 ৪-ডিজিটের মাস্টার পিন সুরক্ষা
            </div>
            <div className="p-4 rounded-2xl bg-white border border-emerald-100 shadow-2xs">
              🛡️ কোনো থার্ড-পার্টি বিজ্ঞাপন বা ট্র্যাকার নেই
            </div>
            <div className="p-4 rounded-2xl bg-white border border-emerald-100 shadow-2xs">
              💾 যেকোনো সময় নিজের পুরো ডেটা এক্সপোর্ট সুবিধা
            </div>
          </div>
        </div>
      </section>

      {/* 8. Frequently Asked Questions (FAQ) */}
      <section id="faq" className="py-16 sm:py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            সাধারণ জিজ্ঞাসা (Frequently Asked Questions)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            আপনার মনে থাকা সাধারণ প্রশ্নের সহজ উত্তর
          </p>
        </div>

        <div className="space-y-3">
          {[
            {
              q: "আমি কি ফ্রিতে শুরু করতে পারব?",
              a: "হ্যাঁ, সম্পূর্ণ ফ্রিতে আপনি লিখে রাখো-তে খাতা খুলতে পারেন। বেসিক খরচ হিসাব, ১০টি পর্যন্ত জরুরি ডকুমেন্ট এবং ১টি গাড়ি/বাড়ি ফ্রিতে ট্র্যাকিং করতে পারবেন আজীবন।",
            },
            {
              q: "আমি কীভাবে সাবস্ক্রিপশন ফি পরিশোধ করতে পারব?",
              a: "আপনি আপনার বিকাশ, নগদ, রকেট ওয়ালেট অথবা যেকোনো লোকাল ও ইন্টারন্যাশনাল ব্যাংক কার্ড দিয়ে সহজে মাসিক বা বাৎসরিক ফি পরিশোধ করতে পারবেন।",
            },
            {
              q: "ফ্যামিলি প্ল্যানে পরিবারের সদস্যরা কি একে অপরের ব্যক্তিগত খরচ দেখতে পাবে?",
              a: "না। লিখে রাখো-তে প্রতিটি সদস্যের জন্য ৪-ডিজিটের সিক্রেট পিন থাকে। ব্যক্তিগত খরচ শুধুমাত্র নির্দিষ্ট সদস্য নিজেই আনলক করে দেখতে পারবেন, অন্য সদস্যরা তা দেখতে পাবেন না।",
            },
            {
              q: "আমার মোবাইল হারিয়ে গেলে বা নষ্ট হলে আমার ডেটা কি থাকবে?",
              a: "হ্যাঁ, আপনার সমস্ত ডেটা স্বয়ংক্রিয়ভাবে এনক্রিপ্টেড ক্লাউডে সুরক্ষিত থাকে। নতুন ফোনে অ্যাপ ডাউনলোড করে আগের ইমেইল/নম্বর দিয়ে লগইন করলেই সব আগের মতো পেয়ে যাবেন।",
            },
            {
              q: "বাড়িওয়ালাদের জন্য Property Pro প্ল্যান কেন আলাদা?",
              a: "Property Pro প্ল্যানে একসাথে ৩০টি পর্যন্ত ফ্ল্যাট বা দোকানের ভাড়া আদায়, বকেয়া ট্র্যাকিং, ভাড়াটিয়ার ডিজিটাল চুক্তি, মেইনটেন্যান্স খরচ এবং মাসিক ভাড়ার মানি রিসিট তৈরির ডেডিকেটেড সুবিধা রয়েছে।",
            },
          ].map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 bg-white overflow-hidden transition-all shadow-2xs"
            >
              <button
                type="button"
                onClick={() => toggleFaq(idx)}
                className="w-full py-4 px-5 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-slate-800 hover:text-emerald-800 cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${
                    faqOpen === idx ? "rotate-180 text-emerald-700" : ""
                  }`}
                />
              </button>
              {faqOpen === idx && (
                <div className="px-5 pb-4 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-50">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 9. Bottom Call-To-Action Banner */}
      <section className="bg-gradient-to-tr from-[#064e3b] to-[#0d825c] text-white py-14 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto space-y-5 relative z-10">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            আজই শুরু করুন, মনে রাখার ঝামেলা শেষ হোক।
          </h2>
          <p className="text-xs sm:text-base text-emerald-100/90 leading-relaxed max-w-xl mx-auto">
            Likhe Rakho-তে আপনার পরিবার ও ব্যক্তিগত সব গুরুত্বপূর্ণ রেকর্ড সাজিয়ে রাখুন এক নিরাপদ ছাদের নিচে।
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => handleStart("sign-up")}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white text-[#064e3b] font-bold text-sm shadow-xl hover:bg-emerald-50 active:scale-95 transition cursor-pointer"
            >
              বিনামূল্যে খাতা খুলুন (Create Free Account)
            </button>
            <a
              href="#pricing"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl border border-emerald-400/40 bg-emerald-900/40 text-white font-semibold text-sm hover:bg-emerald-900/60 transition cursor-pointer"
            >
              সব প্ল্যান দেখুন (Explore Plans)
            </a>
          </div>
        </div>
      </section>

      {/* 10. Footer */}
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
