import { Crown, Sparkles, X, Check, ArrowRight } from "lucide-react";
import { type PlanTier, PLAN_LIMITS } from "../../services/subscriptionService";

interface PlanUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  currentTier: PlanTier;
  recommendedTier?: PlanTier;
  currentCount?: number;
  maxLimit?: number;
  customMessage?: string;
}

export function PlanUpgradeModal({
  isOpen,
  onClose,
  featureName,
  currentTier,
  recommendedTier = "Family",
  currentCount,
  maxLimit,
  customMessage,
}: PlanUpgradeModalProps) {
  if (!isOpen) return null;

  const currentPlan = PLAN_LIMITS[currentTier] || PLAN_LIMITS.Free;
  const upgradePlan = PLAN_LIMITS[recommendedTier] || PLAN_LIMITS.Family;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-3xl border border-emerald-100 bg-white p-6 shadow-2xl text-slate-900 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-[#064e3b] to-[#0d825c] flex items-center justify-center text-white shadow-sm shadow-emerald-950/20">
              <Crown className="h-5 w-5 fill-amber-400 text-amber-300" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                প্ল্যান লিমিট নোটিফিকেশন
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                {featureName} লিমিট পূর্ণ হয়েছে
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Message */}
        <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5 text-xs text-slate-600 leading-relaxed">
          {customMessage || (
            <>
              আপনার বর্তমান প্ল্যানে (<strong>{currentPlan.label}</strong>) সর্বোচ্চ{" "}
              <strong>{maxLimit ?? currentPlan.maxVehicles}টি</strong> {featureName} যুক্ত করার
              সুবিধা রয়েছে
              {currentCount !== undefined && ` (বর্তমান ব্যবহার: ${currentCount}টি)`}।
            </>
          )}
        </div>

        {/* Recommended Upgrade Card */}
        <div className="mt-4 rounded-2xl border-2 border-emerald-600 bg-emerald-50/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-emerald-700" />
              <span className="text-xs font-bold text-[#064e3b]">
                সুপারিশকৃত প্ল্যান: {upgradePlan.label}
              </span>
            </div>
            <span className="text-xs font-black text-emerald-800">
              ৳{upgradePlan.priceMonthlyBdt}/মাস
            </span>
          </div>

          <ul className="space-y-1.5 text-[11px] text-slate-700 font-medium">
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>
                ১০টি পর্যন্ত গাড়ি ও প্রোপার্টি, ৫০০টি পর্যন্ত ডকুমেন্ট
              </span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>DPS, FDR এবং ব্যাংক লোন EMI ফুল ট্র্যাকিং</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>৫ জন ফ্যামিলি মেম্বারদের সাথে ডেটা শেয়ারিং</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>৫ GB সুপার-ফাস্ট ক্লাউড স্টোরেজ ও নোটিফিকেশন</span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              window.open(
                "https://wa.me/8801700000000?text=Hello%20Likhe%20Rakho%20Admin,%20I%20would%20like%20to%20upgrade%20my%20plan",
                "_blank"
              );
            }}
            className="w-full py-3 rounded-xl bg-gradient-to-tr from-[#064e3b] to-[#0d825c] text-xs font-bold text-white shadow-md shadow-emerald-950/20 hover:from-[#073f30] hover:to-[#0b6e4e] active:scale-98 transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>প্ল্যান আপগ্রেড করুন / যোগাযোগ</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            পরে করব (Close)
          </button>
        </div>
      </div>
    </div>
  );
}
