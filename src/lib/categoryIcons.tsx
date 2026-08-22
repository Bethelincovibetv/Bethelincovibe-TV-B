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

const RULES: Array<{ test: RegExp; icon: CategoryIcon }> = [
  { test: /agric|farm/i, icon: AgricultureIcon },
  { test: /auto|car|vehicle/i, icon: AutomobileIcon },
  { test: /beauty|salon|spa/i, icon: BeautyIcon },
  { test: /construct|build/i, icon: ConstructionIcon },
  { test: /digital/i, icon: DigitalServicesIcon },
  { test: /educat|train|school|tutor/i, icon: EducationIcon },
  { test: /event|entertain/i, icon: EventsIcon },
  { test: /fashion|cloth|apparel/i, icon: FashionIcon },
  { test: /finance|insur|bank/i, icon: FinanceIcon },
  { test: /food|restaur|cater|eat/i, icon: FoodIcon },
  { test: /health|pharma|medic|clinic|hospital(?!ity)/i, icon: HealthIcon },
  { test: /hospitality|hotel|lodg/i, icon: HospitalityIcon },
  { test: /logist|deliver|courier|transport/i, icon: LogisticsIcon },
  { test: /professional|consult|legal|account/i, icon: ProfessionalIcon },
  { test: /real estate|property|realty/i, icon: RealEstateIcon },
  { test: /retail|shop|market|store/i, icon: RetailIcon },
  { test: /tech|software|it\b|computer/i, icon: TechIcon },
  { test: /travel|tour|flight/i, icon: TravelIcon },
];

export function getCategoryIcon(name?: string | null): CategoryIcon {
  if (!name) return GenericIcon;
  for (const r of RULES) if (r.test.test(name)) return r.icon;
  return GenericIcon;
}
