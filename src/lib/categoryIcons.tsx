import type { ComponentType, SVGProps } from "react";

/**
 * Flat-design SVG category icons. White line-art on transparent background
 * so they look crisp on the purple gradient cards.
 *
 * Each icon accepts standard SVG props + className so callers can size it
 * exactly like a Lucide icon (e.g. className="h-7 w-7").
 */

type IconProps = SVGProps<SVGSVGElement> & { className?: string };
export type CategoryIcon = ComponentType<IconProps>;

const base = (props: IconProps) => ({
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export const AgricultureIcon: CategoryIcon = (p) => (
  <svg {...base(p)}>
    <path d="M12 21V11" />
    <path d="M12 11c-3 0-6-2-6-6 3 0 6 2 6 6Z" fill="currentColor" fillOpacity=".18" />
    <path d="M12 13c3 0 6-2 6-6-3 0-6 2-6 6Z" fill="currentColor" fillOpacity=".18" />
    <path d="M5 21h14" />
  </svg>
);

export const AutomobileIcon: CategoryIcon = (p) => (
  <svg {...base(p)}>
    <path d="M3 13l2-5a3 3 0 0 1 3-2h8a3 3 0 0 1 3 2l2 5" />
    <rect x="3" y="13" width="18" height="6" rx="2" />
    <circle cx="7.5" cy="19" r="1.5" fill="currentColor" />
    <circle cx="16.5" cy="19" r="1.5" fill="currentColor" />
  </svg>
);

export const BeautyIcon: CategoryIcon = (p) => (
  <svg {...base(p)}>
    <circle cx="6" cy="7" r="3" />
    <circle cx="6" cy="17" r="3" />
    <path d="M8.5 8.5 20 17" />
    <path d="M8.5 15.5 20 7" />
  </svg>
);

export const ConstructionIcon: CategoryIcon = (p) => (
  <svg {...base(p)}>
    <path d="M4 17h16v3H4z" />
    <path d="M5 17a7 7 0 0 1 14 0" />
    <path d="M12 6v4" />
    <path d="M10 6h4" />
  </svg>
);

export const DigitalServicesIcon: CategoryIcon = (p) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="11" rx="2" />
    <path d="M2 20h20" />
    <path d="M9 9.5l-2 2 2 2" />
    <path d="M15 9.5l2 2-2 2" />
  </svg>
);

export const EducationIcon: CategoryIcon = (p) => (
  <svg {...base(p)}>
    <path d="M2 9l10-4 10 4-10 4Z" fill="currentColor" fillOpacity=".18" />
    <path d="M6 11v5c2 2 10 2 12 0v-5" />
    <path d="M22 9v5" />
  </svg>
);

export const EventsIcon: CategoryIcon = (p) => (
  <svg {...base(p)}>
    <rect x="9" y="3" width="6" height="12" rx="3" fill="currentColor" fillOpacity=".18" />
    <path d="M5 11a7 7 0 0 0 14 0" />
    <path d="M12 18v3" />
    <path d="M9 21h6" />
  </svg>
);

export const FashionIcon: CategoryIcon = (p) => (
  <svg {...base(p)}>
    <path d="M8 4a4 4 0 0 0 8 0" />
    <path d="M16 4l5 4-3 3-2-1v9H8v-9l-2 1-3-3 5-4" fill="currentColor" fillOpacity=".18" />
  </svg>
);

export const FinanceIcon: CategoryIcon = (p) => (
  <svg {...base(p)}>
    <ellipse cx="12" cy="6" rx="7" ry="3" />
    <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
    <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
  </svg>
);

export const FoodIcon: CategoryIcon = (p) => (
  <svg {...base(p)}>
    <path d="M6 3v8M6 3a2 2 0 0 1 2 2v4a2 2 0 0 1-4 0V5a2 2 0 0 1 2-2Z" />
    <path d="M6 11v10" />
    <path d="M17 3c2 0 3 2 3 5s-1 4-3 4v9" />
  </svg>
);

export const HealthIcon: CategoryIcon = (p) => (
  <svg {...base(p)}>
    <rect x="5" y="3" width="14" height="18" rx="3" fill="currentColor" fillOpacity=".18" />
    <path d="M12 8v8" />
    <path d="M8 12h8" />
  </svg>
);

export const HospitalityIcon: CategoryIcon = (p) => (
  <svg {...base(p)}>
    <path d="M3 18v-7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3" />
    <path d="M3 14h18v4H3z" fill="currentColor" fillOpacity=".18" />
    <circle cx="8" cy="11" r="2" />
    <path d="M3 21v-1M21 21v-1" />
  </svg>
);

export const LogisticsIcon: CategoryIcon = (p) => (
  <svg {...base(p)}>
    <rect x="2" y="7" width="11" height="9" rx="1" fill="currentColor" fillOpacity=".18" />
    <path d="M13 10h5l3 3v3h-8z" />
    <circle cx="7" cy="18" r="2" />
    <circle cx="17" cy="18" r="2" />
  </svg>
);

export const ProfessionalIcon: CategoryIcon = (p) => (
  <svg {...base(p)}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    <path d="M3 13h18" />
    <path d="M11 12v3h2v-3" fill="currentColor" />
  </svg>
);

export const RealEstateIcon: CategoryIcon = (p) => (
  <svg {...base(p)}>
    <path d="M3 11l9-7 9 7" />
    <path d="M5 10v10h14V10" fill="currentColor" fillOpacity=".18" />
    <path d="M10 20v-5h4v5" />
  </svg>
);

export const RetailIcon: CategoryIcon = (p) => (
  <svg {...base(p)}>
    <path d="M5 7h14l-1 13H6Z" fill="currentColor" fillOpacity=".18" />
    <path d="M9 7a3 3 0 0 1 6 0" />
  </svg>
);

export const TechIcon: CategoryIcon = (p) => (
  <svg {...base(p)}>
    <rect x="7" y="7" width="10" height="10" rx="1" fill="currentColor" fillOpacity=".18" />
    <path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4" />
  </svg>
);

export const TravelIcon: CategoryIcon = (p) => (
  <svg {...base(p)}>
    <path d="M2 13l8-1 4-7 2 1-2 7 7-1 1 2-7 3-3 7-2-1 1-7Z" fill="currentColor" fillOpacity=".18" />
  </svg>
);

export const GenericIcon: CategoryIcon = (p) => (
  <svg {...base(p)}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M9 12h6M12 9v6" />
  </svg>
);

export const RULES: Array<{ test: RegExp; icon: CategoryIcon; key: string }> = [
  { test: /agric|farm/i, icon: AgricultureIcon, key: "agric" },
  { test: /auto|car|vehicle/i, icon: AutomobileIcon, key: "auto" },
  { test: /beauty|salon|spa/i, icon: BeautyIcon, key: "beauty" },
  { test: /construct|build/i, icon: ConstructionIcon, key: "construction" },
  { test: /digital/i, icon: DigitalServicesIcon, key: "digital" },
  { test: /educat|train|school|tutor/i, icon: EducationIcon, key: "education" },
  { test: /event|entertain/i, icon: EventsIcon, key: "events" },
  { test: /fashion|cloth|apparel/i, icon: FashionIcon, key: "fashion" },
  { test: /finance|insur|bank/i, icon: FinanceIcon, key: "finance" },
  { test: /food|restaur|cater|eat/i, icon: FoodIcon, key: "food" },
  { test: /health|pharma|medic|clinic|hospital(?!ity)/i, icon: HealthIcon, key: "health" },
  { test: /hospitality|hotel|lodg/i, icon: HospitalityIcon, key: "hospitality" },
  { test: /logist|deliver|courier|transport/i, icon: LogisticsIcon, key: "logistics" },
  { test: /professional|consult|legal|account/i, icon: ProfessionalIcon, key: "professional" },
  { test: /real estate|property|realty/i, icon: RealEstateIcon, key: "realestate" },
  { test: /retail|shop|market|store/i, icon: RetailIcon, key: "retail" },
  { test: /tech|software|it\b|computer/i, icon: TechIcon, key: "tech" },
  { test: /travel|tour|flight/i, icon: TravelIcon, key: "travel" },
];

export interface CategoryTheme {
  key: string;
  name: string;
  gradient: string;
  glowColor: string;
  borderClass: string;
  badgeBg: string;
  symbol: string;
  tagline: string;
}

export const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  agric: {
    key: "agric",
    name: "Agriculture & Agro-Tech",
    gradient: "from-emerald-500 via-green-600 to-teal-700",
    glowColor: "rgba(16, 185, 129, 0.4)",
    borderClass: "border-emerald-500/30 hover:border-emerald-500",
    badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    symbol: "🌱",
    tagline: "Farming, Livestock & Supply Chain",
  },
  auto: {
    key: "auto",
    name: "Automotive & Logistics",
    gradient: "from-blue-600 via-cyan-600 to-indigo-800",
    glowColor: "rgba(59, 130, 246, 0.4)",
    borderClass: "border-blue-500/30 hover:border-blue-500",
    badgeBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    symbol: "🚗",
    tagline: "Cars, Parts, Maintenance & Rentals",
  },
  beauty: {
    key: "beauty",
    name: "Beauty & Wellness",
    gradient: "from-pink-500 via-rose-500 to-purple-700",
    glowColor: "rgba(244, 63, 94, 0.4)",
    borderClass: "border-rose-500/30 hover:border-rose-500",
    badgeBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    symbol: "✨",
    tagline: "Salons, Cosmetics, Skincare & Spa",
  },
  construction: {
    key: "construction",
    name: "Construction & Engineering",
    gradient: "from-amber-500 via-orange-600 to-yellow-700",
    glowColor: "rgba(245, 158, 11, 0.4)",
    borderClass: "border-amber-500/30 hover:border-amber-500",
    badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    symbol: "🏗️",
    tagline: "Building Materials, Civil Works & Architecture",
  },
  digital: {
    key: "digital",
    name: "Digital Services & Media",
    gradient: "from-indigo-500 via-purple-600 to-violet-800",
    glowColor: "rgba(99, 102, 241, 0.4)",
    borderClass: "border-indigo-500/30 hover:border-indigo-500",
    badgeBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    symbol: "🌐",
    tagline: "Design, Branding, SEO & Ads",
  },
  education: {
    key: "education",
    name: "Education & Academy",
    gradient: "from-blue-700 via-indigo-600 to-sky-500",
    glowColor: "rgba(37, 99, 235, 0.4)",
    borderClass: "border-blue-500/30 hover:border-blue-500",
    badgeBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    symbol: "🎓",
    tagline: "Courses, Certifications & Tutorials",
  },
  events: {
    key: "events",
    name: "Events & Entertainment",
    gradient: "from-fuchsia-600 via-pink-600 to-purple-800",
    glowColor: "rgba(192, 38, 211, 0.4)",
    borderClass: "border-fuchsia-500/30 hover:border-fuchsia-500",
    badgeBg: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
    symbol: "🎉",
    tagline: "Venues, MCs, Sound & Production",
  },
  fashion: {
    key: "fashion",
    name: "Fashion & Lifestyle",
    gradient: "from-rose-600 via-red-500 to-pink-700",
    glowColor: "rgba(225, 29, 72, 0.4)",
    borderClass: "border-rose-500/30 hover:border-rose-500",
    badgeBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    symbol: "👗",
    tagline: "Apparel, Native Wears & Accessories",
  },
  finance: {
    key: "finance",
    name: "Finance & Investment",
    gradient: "from-emerald-600 via-teal-600 to-cyan-700",
    glowColor: "rgba(5, 150, 105, 0.4)",
    borderClass: "border-emerald-500/30 hover:border-emerald-500",
    badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    symbol: "💰",
    tagline: "Accounting, Microfinance & Wealth",
  },
  food: {
    key: "food",
    name: "Food & Catering",
    gradient: "from-orange-500 via-red-500 to-amber-600",
    glowColor: "rgba(249, 115, 22, 0.4)",
    borderClass: "border-orange-500/30 hover:border-orange-500",
    badgeBg: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    symbol: "🍲",
    tagline: "Restaurants, Pastries & Event Chow",
  },
  health: {
    key: "health",
    name: "Healthcare & Pharmacy",
    gradient: "from-teal-500 via-cyan-600 to-blue-700",
    glowColor: "rgba(20, 184, 166, 0.4)",
    borderClass: "border-teal-500/30 hover:border-teal-500",
    badgeBg: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    symbol: "🩺",
    tagline: "Clinics, Medicine, Diagnostics & Fitness",
  },
  hospitality: {
    key: "hospitality",
    name: "Hospitality & Hotels",
    gradient: "from-yellow-600 via-amber-600 to-orange-700",
    glowColor: "rgba(217, 119, 6, 0.4)",
    borderClass: "border-amber-500/30 hover:border-amber-500",
    badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    symbol: "🏨",
    tagline: "Shortlets, Resorts & Luxury Suites",
  },
  logistics: {
    key: "logistics",
    name: "Logistics & Delivery",
    gradient: "from-cyan-600 via-blue-600 to-indigo-700",
    glowColor: "rgba(6, 182, 212, 0.4)",
    borderClass: "border-cyan-500/30 hover:border-cyan-500",
    badgeBg: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    symbol: "📦",
    tagline: "Interstate Courier, Dispatch & Cargo",
  },
  professional: {
    key: "professional",
    name: "Professional & Legal",
    gradient: "from-slate-700 via-indigo-900 to-slate-900",
    glowColor: "rgba(71, 85, 105, 0.4)",
    borderClass: "border-slate-500/30 hover:border-slate-500",
    badgeBg: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
    symbol: "⚖️",
    tagline: "Corporate Law, CAC, Audits & Consulting",
  },
  realestate: {
    key: "realestate",
    name: "Real Estate & Property",
    gradient: "from-violet-600 via-purple-600 to-indigo-700",
    glowColor: "rgba(139, 92, 246, 0.4)",
    borderClass: "border-violet-500/30 hover:border-violet-500",
    badgeBg: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    symbol: "🏡",
    tagline: "Lands, Apartments & Commercial Sales",
  },
  retail: {
    key: "retail",
    name: "Retail & E-commerce",
    gradient: "from-pink-600 via-rose-500 to-orange-500",
    glowColor: "rgba(236, 72, 153, 0.4)",
    borderClass: "border-pink-500/30 hover:border-pink-500",
    badgeBg: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
    symbol: "🛍️",
    tagline: "Supermarkets, Electronics & Wholesale",
  },
  tech: {
    key: "tech",
    name: "Technology & Software",
    gradient: "from-sky-500 via-blue-600 to-purple-600",
    glowColor: "rgba(14, 165, 233, 0.4)",
    borderClass: "border-sky-500/30 hover:border-sky-500",
    badgeBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    symbol: "💻",
    tagline: "AI, Mobile Apps, SaaS & Hardware",
  },
  travel: {
    key: "travel",
    name: "Travel & Tours",
    gradient: "from-teal-600 via-emerald-600 to-cyan-700",
    glowColor: "rgba(13, 148, 136, 0.4)",
    borderClass: "border-teal-500/30 hover:border-teal-500",
    badgeBg: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    symbol: "✈️",
    tagline: "Visas, Flight Bookings & Vacation Packages",
  },
};

const DEFAULT_THEME: CategoryTheme = {
  key: "generic",
  name: "General Business",
  gradient: "from-primary via-purple-600 to-indigo-700",
  glowColor: "rgba(147, 51, 234, 0.4)",
  borderClass: "border-primary/30 hover:border-primary",
  badgeBg: "bg-primary/10 text-primary",
  symbol: "🚀",
  tagline: "Enterprise, Trade & Commerce",
};

export function getCategoryTheme(name?: string | null): CategoryTheme {
  if (!name) return DEFAULT_THEME;
  for (const r of RULES) {
    if (r.test.test(name)) {
      return CATEGORY_THEMES[r.key] || DEFAULT_THEME;
    }
  }
  return DEFAULT_THEME;
}

export function getCategoryIcon(name?: string | null): CategoryIcon {
  if (!name) return GenericIcon;
  for (const r of RULES) if (r.test.test(name)) return r.icon;
  return GenericIcon;
}

/**
 * 3D AI-Rendered Category Visual Component with dimensional shadows,
 * glass reflection, and vibrant dynamic industry color scheme
 */
export function Category3DVisual({
  name,
  size = "md",
  className = "",
}: {
  name?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const theme = getCategoryTheme(name);
  const IconComp = getCategoryIcon(name);

  const sizeDimensions = {
    sm: "w-8 h-8 rounded-xl text-xs",
    md: "w-11 h-11 rounded-2xl text-base",
    lg: "w-16 h-16 rounded-3xl text-2xl",
    xl: "w-20 h-20 rounded-[2rem] text-3xl",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-8 h-8",
    xl: "w-10 h-10",
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 ${sizeDimensions[size]} ${className}`}
      style={{
        boxShadow: `0 10px 25px -5px ${theme.glowColor}, 0 4px 6px -2px rgba(0,0,0,0.1)`,
      }}
    >
      {/* 3D Volumetric Gradient Orb */}
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} rounded-[inherit] shadow-inner`} />

      {/* Top Gloss Highlight for 3D depth */}
      <div className="absolute inset-x-1.5 top-1 h-[40%] bg-gradient-to-b from-white/40 to-transparent rounded-t-[inherit] pointer-events-none" />

      {/* Bottom Ambient Reflection */}
      <div className="absolute inset-x-2 bottom-1 h-2 bg-black/20 rounded-b-[inherit] blur-[1px] pointer-events-none" />

      {/* Center 3D Icon & Symbol */}
      <div className="relative z-10 flex items-center justify-center text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]">
        <IconComp className={iconSizes[size]} />
      </div>
    </div>
  );
}

