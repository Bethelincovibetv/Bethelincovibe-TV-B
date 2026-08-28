/**
 * Platform Feature Pricing Engine
 * Centralizes pricing management for all monetizable features on Bethelincovibe TV.
 * Supports Admin overrides, local cache synchronization, and real-time fee calculation.
 */

export interface FeaturePricing {
  id: string;
  name: string;
  category: "analytics" | "marketing" | "branding" | "marketplace" | "ai_tools";
  priceNaira: number;
  description: string;
  unit: string;
  isFreeByDefault?: boolean;
  firstUseFree?: boolean;
  iconName: string;
  badge?: string;
}

export const DEFAULT_PLATFORM_PRICING: Record<string, FeaturePricing> = {
  startup_calculator: {
    id: "startup_calculator",
    name: "Startup & Business Viability Calculator",
    category: "analytics",
    priceNaira: 200, // Explicitly set to 200 NGN as mandated
    description: "Deep AI financial model, 12-month cash runway, breakeven projections, and Nigeria-specific growth strategy.",
    unit: "per analysis",
    isFreeByDefault: false,
    firstUseFree: true,
    iconName: "Calculator",
    badge: "Core SME Tool",
  },
  sales_page_publish: {
    id: "sales_page_publish",
    name: "Custom High-Converting Sales Page",
    category: "marketing",
    priceNaira: 500,
    description: "Publish a bespoke sales page with lead capture form, WhatsApp buy buttons, and analytics.",
    unit: "per page publish",
    isFreeByDefault: false,
    firstUseFree: true,
    iconName: "FileText",
    badge: "Most Popular",
  },
  verified_badge: {
    id: "verified_badge",
    name: "Official Verified Supplier Badge",
    category: "branding",
    priceNaira: 2500,
    description: "365-day blue verified merchant seal across directory, map pins, product listings, and chat threads.",
    unit: "per year",
    isFreeByDefault: false,
    firstUseFree: false,
    iconName: "ShieldCheck",
    badge: "Trust Booster",
  },
  queen_business_boost: {
    id: "queen_business_boost",
    name: "Queen Engine Full Listing Automation & Boost",
    category: "ai_tools",
    priceNaira: 1500,
    description: "Automated 30-day sponsored boost, professional catalog layout, AI flyer creatives, and WhatsApp community setup.",
    unit: "per 30 days",
    isFreeByDefault: false,
    firstUseFree: false,
    iconName: "Crown",
    badge: "AI Powered",
  },
  whatsapp_status_ad: {
    id: "whatsapp_status_ad",
    name: "WhatsApp Status Broadcast Ad Network",
    category: "marketing",
    priceNaira: 1000,
    description: "Broadcast your product or business to top verified WhatsApp status influencers in Lagos.",
    unit: "per campaign",
    isFreeByDefault: false,
    firstUseFree: false,
    iconName: "MessageCircle",
    badge: "High Conversion",
  },
  featured_directory_listing: {
    id: "featured_directory_listing",
    name: "Top-Tier Directory Hero Placement",
    category: "marketing",
    priceNaira: 2000,
    description: "Guaranteed top position on the business directory with golden badge and direct call action chips.",
    unit: "per 14 days",
    isFreeByDefault: false,
    firstUseFree: false,
    iconName: "Sparkles",
    badge: "Visibility",
  },
  ai_sales_copy_generator: {
    id: "ai_sales_copy_generator",
    name: "Executive AI Sales Copy & Ad Script Engine",
    category: "ai_tools",
    priceNaira: 100,
    description: "Generate 5 high-converting Nigerian WhatsApp closing scripts, Instagram captions, and email templates.",
    unit: "per generation",
    isFreeByDefault: false,
    firstUseFree: true,
    iconName: "Wand2",
    badge: "Instant AI",
  },
};

const STORAGE_KEY = "bethel_platform_feature_pricing_v1";

/**
 * Retrieves the current pricing configuration with local overrides or defaults.
 */
export function getPlatformPricing(): Record<string, FeaturePricing> {
  if (typeof window === "undefined") return DEFAULT_PLATFORM_PRICING;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PLATFORM_PRICING;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PLATFORM_PRICING, ...parsed };
  } catch (err) {
    console.warn("Failed to parse cached pricing, returning defaults", err);
    return DEFAULT_PLATFORM_PRICING;
  }
}

/**
 * Gets the price in Naira for a specific feature ID.
 */
export function getFeaturePrice(featureId: string): number {
  const all = getPlatformPricing();
  const feat = all[featureId];
  if (!feat) return 0;
  return feat.priceNaira;
}

/**
 * Updates a specific feature price (Admin only)
 */
export function updateFeaturePrice(featureId: string, updates: Partial<FeaturePricing>): Record<string, FeaturePricing> {
  const current = getPlatformPricing();
  if (!current[featureId]) {
    current[featureId] = {
      id: featureId,
      name: featureId,
      category: "ai_tools",
      priceNaira: 0,
      description: "",
      unit: "per use",
      iconName: "Zap",
      ...updates,
    };
  } else {
    current[featureId] = { ...current[featureId], ...updates };
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent("platform_pricing_updated", { detail: current }));
  }
  return current;
}

/**
 * Resets all prices back to platform defaults
 */
export function resetPricingToDefaults(): Record<string, FeaturePricing> {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("platform_pricing_updated", { detail: DEFAULT_PLATFORM_PRICING }));
  }
  return DEFAULT_PLATFORM_PRICING;
}
