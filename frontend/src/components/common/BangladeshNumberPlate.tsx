// District & Metro mappings in Bangladesh
const DISTRICT_MAP: Record<string, string> = {
  "DHAKA METRO": "ঢাকা মেট্রো",
  "DHAKA-METRO": "ঢাকা মেট্রো",
  "D.M": "ঢাকা মেট্রো",
  "DM METRO": "ঢাকা মেট্রো",
  "DM": "ঢাকা মেট্রো",
  "DHAKA": "ঢাকা",
  "DHK": "ঢাকা",
  "CHATTA METRO": "চট্টগ্রাম মেট্রো",
  "CHATTOGRAM METRO": "চট্টগ্রাম মেট্রো",
  "CHITTAGONG METRO": "চট্টগ্রাম মেট্রো",
  "CTG METRO": "চট্টগ্রাম মেট্রো",
  "CHATTA": "চট্টগ্রাম",
  "CHATTOGRAM": "চট্টগ্রাম",
  "CHITTAGONG": "চট্টগ্রাম",
  "CTG": "চট্টগ্রাম",
  "SYLHET METRO": "সিলেট মেট্রো",
  "SYLHET": "সিলেট",
  "RAJSHAHI METRO": "রাজশাহী মেট্রো",
  "RAJSHAHI": "রাজশাহী",
  "KHULNA METRO": "খুলনা মেট্রো",
  "KHULNA": "খুলনা",
  "BARISAL METRO": "বরিশাল মেট্রো",
  "BARISHAL METRO": "বরিশাল মেট্রো",
  "BARISAL": "বরিশাল",
  "BARISHAL": "বরিশাল",
  "RANGPUR METRO": "রংপুর মেট্রো",
  "RANGPUR": "রংপুর",
  "MYMENSINGH METRO": "ময়মনসিংহ মেট্রো",
  "MYMENSINGH": "ময়মনসিংহ",
  "GAZIPUR": "গাজীপুর",
  "NARAYANGANJ": "নারায়ণগঞ্জ",
  "COMILLA": "কুমিল্লা",
  "CUMILLA": "কুমিল্লা",
  "BOGRA": "বগুড়া",
  "BOGURA": "বগুড়া",
  "JESSORE": "যশোর",
  "JASHORE": "যশোর",
  "PABNA": "পাবনা",
  "KUSHTIA": "কুষ্টিয়া",
  "TANGAIL": "টাঙ্গাইল",
  "FARIDPUR": "ফরিদপুর",
  "NOAKHALI": "নোয়াখালী",
  "FENI": "ফেনী",
  "COXS BAZAR": "কক্সবাজার",
  "COX'S BAZAR": "কক্সবাজার",
  "COX BAZAR": "কক্সবাজার",
  "BRAHMANBARIA": "ব্রাহ্মণবাড়িয়া",
  "SIRAJGANJ": "সিরাজগঞ্জ",
  "DINAJPUR": "দিনাজপুর",
};

// BRTA Vehicle Class Letters mapping
const CLASS_MAP: Record<string, string> = {
  GA: "গ",   // Private car 1301-1800cc
  GHA: "ঘ",  // SUV / Jeep / Microbus
  KHA: "খ",  // Private car <=1300cc
  KA: "ক",   // Private car <1000cc
  CHA: "চ",  // Microbus
  CHHA: "ছ", // Human hauler / Laguna
  HA: "হ",   // Motorcycle 50-100cc
  LA: "ল",   // Motorcycle 101-150cc
  MA: "ম",   // Motorcycle >150cc
  DA: "দ",   // Private car
  DHA: "ধ",  // Private car
  BA: "ব",   // Inter-district Bus
  BHA: "ভ",  // Ambulance
  JA: "জ",   // Minibus
  JHA: "ঝ",  // Bus
  TA: "ট",   // Truck
  THA: "থ",  // CNG Auto-rickshaw
  NA: "ন",   // Pickup / Delivery van
  PA: "প",   // Taxi
  PHA: "ফ",  // Taxi
  YA: "য",   // Prime mover
  SA: "স",   // Special vehicle
  SHA: "শ",  // Special vehicle
  E: "ই",    // Electric vehicle
  G: "গ",
  K: "ক",
  H: "হ",
  L: "ল",
  M: "ম",
  D: "দ",
  B: "ব",
  J: "জ",
  T: "ট",
  N: "ন",
  P: "প",
  S: "স",
};

export function toBengaliNumerals(str: string): string {
  const bnDigits: Record<string, string> = {
    "0": "০", "1": "১", "2": "২", "3": "৩", "4": "৪",
    "5": "৫", "6": "৬", "7": "৭", "8": "৮", "9": "৯",
  };
  return str.replace(/[0-9]/g, (d) => bnDigits[d] || d);
}

export interface ParsedBdNumberPlate {
  topLine: string;     // e.g. "ঢাকা মেট্রো-গ"
  bottomLine: string;  // e.g. "৩৩-৩৬১৭"
  series: string;      // e.g. "৩৩"
  number: string;      // e.g. "৩৬১৭"
  district: string;    // e.g. "ঢাকা মেট্রো"
  classLetter: string; // e.g. "গ"
  isBengali: boolean;
}

export function parseBangladeshPlate(rawReg?: string): ParsedBdNumberPlate {
  const s = (rawReg || "").trim();
  if (!s) {
    return {
      topLine: "ঢাকা মেট্রো-গ",
      bottomLine: "৩৩-৩৬১৭",
      series: "৩৩",
      number: "৩৬১৭",
      district: "ঢাকা মেট্রো",
      classLetter: "গ",
      isBengali: false,
    };
  }

  // Check if string is already mostly in Bengali
  const hasBengali = /[\u0980-\u09FF]/.test(s);
  if (hasBengali) {
    const digitMatch = s.match(/([০-৯]{1,2})\s*[-–]\s*([০-৯]{3,4})/);
    let bottom = "৩৩-৩৬১৭";
    let top = s;
    let series = "৩৩";
    let number = "৩৬১৭";

    if (digitMatch) {
      series = digitMatch[1];
      number = digitMatch[2];
      bottom = `${series}-${number}`;
      top = s.replace(digitMatch[0], "").replace(/[-_]/g, " ").trim();
    }

    // Format top with clean hyphen if missing
    top = top.replace(/\s+/g, " ");
    const parts = top.split(" ");
    let formattedTop = top;
    if (parts.length >= 2) {
      const last = parts.pop()!;
      formattedTop = `${parts.join(" ")}-${last}`;
    }

    return {
      topLine: formattedTop || "ঢাকা মেট্রো-গ",
      bottomLine: bottom,
      series,
      number,
      district: formattedTop.split("-")[0] || "ঢাকা মেট্রো",
      classLetter: formattedTop.split("-")[1] || "গ",
      isBengali: true,
    };
  }

  // Parse English string: e.g. "DHAKA METRO GA 33-3617" or "D.M-GA 33-3617"
  const digitMatch = s.match(/([0-9]{1,2})\s*[-–]\s*([0-9]{3,4})/);
  let series = "৩৩";
  let number = "৩৬১৭";
  let prefix = s;

  if (digitMatch) {
    series = toBengaliNumerals(digitMatch[1]);
    number = toBengaliNumerals(digitMatch[2]);
    prefix = s.slice(0, digitMatch.index).trim();
  } else {
    // Look for any continuous 5-6 digits
    const anyDigits = s.match(/([0-9]{5,6})/);
    if (anyDigits) {
      const raw = anyDigits[1];
      series = toBengaliNumerals(raw.slice(0, 2));
      number = toBengaliNumerals(raw.slice(2));
      prefix = s.replace(anyDigits[0], "").trim();
    }
  }

  const bottomLine = `${series}-${number}`;

  // Normalize prefix for district & vehicle class letter
  const cleanPrefix = prefix
    .toUpperCase()
    .replace(/[-_.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  let district = "ঢাকা মেট্রো";
  let classLetter = "গ";

  const sortedDistrictKeys = Object.keys(DISTRICT_MAP).sort((a, b) => b.length - a.length);
  const foundDistKey = sortedDistrictKeys.find((k) => cleanPrefix.startsWith(k));

  if (foundDistKey) {
    district = DISTRICT_MAP[foundDistKey];
    const rem = cleanPrefix.slice(foundDistKey.length).replace(/[^A-Z]/g, "").trim();
    if (rem && CLASS_MAP[rem]) {
      classLetter = CLASS_MAP[rem];
    } else if (rem) {
      classLetter = CLASS_MAP[rem[0]] || "গ";
    }
  } else {
    // Fallback: search for any class letter at the end
    const words = cleanPrefix.split(" ").filter(Boolean);
    if (words.length > 0) {
      const lastWord = words[words.length - 1];
      if (CLASS_MAP[lastWord]) {
        classLetter = CLASS_MAP[lastWord];
        words.pop();
      }
      if (words.length > 0) {
        const potentialDist = words.join(" ");
        district = DISTRICT_MAP[potentialDist] || potentialDist;
      }
    }
  }

  const topLine = `${district}-${classLetter}`;

  return {
    topLine,
    bottomLine,
    series,
    number,
    district,
    classLetter,
    isBengali: false,
  };
}

interface BangladeshNumberPlateProps {
  registrationNumber?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  isCommercial?: boolean; // green plate for commercial vehicles
  showReflectiveGlaze?: boolean;
}

export function BangladeshNumberPlate({
  registrationNumber,
  className = "",
  size = "md",
  isCommercial = false,
  showReflectiveGlaze = true,
}: BangladeshNumberPlateProps) {
  const parsed = parseBangladeshPlate(registrationNumber);

  // Size variations
  const sizeStyles = {
    sm: {
      container: "w-[170px] h-[82px] p-[5px] rounded-xl border-[2.5px]",
      innerBorder: "rounded-lg border-[1.5px] p-[3px]",
      bolt: "h-2 w-2",
      topText: "text-[12px] tracking-wide",
      bottomText: "text-[21px] tracking-widest",
      hologram: "h-4 w-4",
      screwInset: "top-1.5",
    },
    md: {
      container: "w-[230px] h-[112px] p-[7px] rounded-2xl border-[3px]",
      innerBorder: "rounded-xl border-[2px] p-[5px]",
      bolt: "h-2.5 w-2.5",
      topText: "text-[16px] tracking-wide",
      bottomText: "text-[29px] tracking-widest",
      hologram: "h-6 w-6",
      screwInset: "top-2.5",
    },
    lg: {
      container: "w-[290px] h-[140px] p-[8px] rounded-2xl border-[3.5px]",
      innerBorder: "rounded-xl border-[2.5px] p-[7px]",
      bolt: "h-3.5 w-3.5",
      topText: "text-[20px] tracking-wider",
      bottomText: "text-[38px] tracking-widest",
      hologram: "h-7 w-7",
      screwInset: "top-3",
    },
  }[size];

  // Colors: Private = White retroreflective with black embossed text
  // Commercial = Bangladesh green retroreflective with white embossed text
  const colorStyles = isCommercial
    ? {
        plateBg: "bg-gradient-to-b from-[#005f42] via-[#006a4e] to-[#00553a]",
        outerBorder: "border-[#003827]",
        innerBorder: "border-white/90",
        textColor: "text-white",
        textShadow: "drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]",
        plateShadow: "shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_6px_14px_rgba(0,0,0,0.2)]",
      }
    : {
        plateBg: "bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0]",
        outerBorder: "border-slate-800",
        innerBorder: "border-slate-900",
        textColor: "text-slate-950",
        textShadow: "drop-shadow-[0_1px_0.5px_rgba(255,255,255,0.9)] [text-shadow:0_1px_1px_rgba(0,0,0,0.25)]",
        plateShadow: "shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_6px_14px_rgba(15,23,42,0.18)]",
      };

  return (
    <div
      className={`relative inline-block select-none overflow-hidden transition-transform duration-200 hover:scale-[1.02] ${sizeStyles.container} ${colorStyles.plateBg} ${colorStyles.outerBorder} ${colorStyles.plateShadow} ${className}`}
      style={{
        fontFamily: "'Kalpurush', 'Vrinda', 'SolaimanLipi', 'Nirmala UI', 'Segoe UI', system-ui, sans-serif",
      }}
      title={`BRTA Retroreflective Digital Number Plate: ${registrationNumber || "DHAKA METRO GA 33-3617"}`}
    >
      {/* Retroreflective Micro-Honeycomb / Metal Sheen Texture */}
      {showReflectiveGlaze && (
        <>
          <div
            className="absolute inset-0 opacity-15 pointer-events-none mix-blend-overlay"
            style={{
              backgroundImage:
                "radial-gradient(#000 0.8px, transparent 0.8px), radial-gradient(#000 0.8px, transparent 0.8px)",
              backgroundSize: "6px 6px",
              backgroundPosition: "0 0, 3px 3px",
            }}
          />
          {/* Diagonal retroreflective light gleam */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />
        </>
      )}

      {/* Hex Mounting Screws / Bolts */}
      <div
        className={`absolute left-3 ${sizeStyles.screwInset} ${sizeStyles.bolt} rounded-full bg-gradient-to-tr from-slate-400 via-slate-200 to-white border border-slate-600 shadow-xs flex items-center justify-center z-10`}
      >
        <div className="h-[2px] w-[2px] rounded-full bg-slate-700/80" />
      </div>
      <div
        className={`absolute right-3 ${sizeStyles.screwInset} ${sizeStyles.bolt} rounded-full bg-gradient-to-tr from-slate-400 via-slate-200 to-white border border-slate-600 shadow-xs flex items-center justify-center z-10`}
      >
        <div className="h-[2px] w-[2px] rounded-full bg-slate-700/80" />
      </div>

      {/* Embossed Inner Frame */}
      <div
        className={`relative h-full w-full flex flex-col items-center justify-between ${sizeStyles.innerBorder} ${colorStyles.innerBorder}`}
      >
        {/* Line 1: District Circle & Vehicle Class Letter (e.g. "ঢাকা মেট্রো-গ") */}
        <div className="w-full text-center pt-0.5">
          <span
            className={`block font-extrabold leading-none ${sizeStyles.topText} ${colorStyles.textColor} ${colorStyles.textShadow}`}
            style={{ fontWeight: 800 }}
          >
            {parsed.topLine}
          </span>
        </div>

        {/* Line 2: Bengali Numerals & Center BRTA Security Hologram Seal */}
        <div className="relative w-full flex items-center justify-center pb-0.5">
          {/* BRTA Stamped Iridescent Security Hologram Watermark (Between Series & Number) */}
          <div
            className={`absolute top-1/2 left-[36%] -translate-x-1/2 -translate-y-1/2 ${sizeStyles.hologram} rounded-full border border-amber-300/80 shadow-xs opacity-85 z-0 flex items-center justify-center overflow-hidden pointer-events-none`}
            style={{
              background:
                "radial-gradient(circle at 35% 35%, rgba(254, 240, 138, 0.95), rgba(56, 189, 248, 0.7) 45%, rgba(167, 139, 250, 0.6) 75%, rgba(16, 185, 129, 0.8) 100%)",
            }}
            title="BRTA Security Hologram"
          >
            <div className="h-[60%] w-[60%] rounded-full border border-white/60 bg-white/20 flex items-center justify-center">
              <span className="text-[6px] font-mono font-bold text-slate-800 leading-none">
                BD
              </span>
            </div>
          </div>

          {/* Embossed Stamped Numbers (e.g. "৩৩-৩৬১৭") */}
          <span
            className={`relative z-1 font-black leading-none ${sizeStyles.bottomText} ${colorStyles.textColor} ${colorStyles.textShadow}`}
            style={{ fontWeight: 900 }}
          >
            {parsed.bottomLine}
          </span>
        </div>
      </div>
    </div>
  );
}
