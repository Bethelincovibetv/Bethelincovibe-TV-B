import {
  GraphicDesignFormatKey,
  GraphicDimension,
  LayoutArchetypeKey,
  FontPairingKey,
  ColorThemeKey,
  MaskShapeKey,
  PipelineBriefInput,
  ParsedBrief,
  StockPhotoAsset,
} from "./designPipeline/types";
import { executeDesignPipeline, PIPELINE_GRAPHIC_FORMATS } from "./designPipeline/pipelineRenderer";
import {
  CURATED_STOCK_CATALOG,
  searchStockPhotos,
  resolveBestStockPhoto,
} from "./designPipeline/stockPhotoService";
import { FONT_PAIRINGS } from "./designPipeline/typographyEngine";
import { COLOR_THEMES } from "./designPipeline/backgroundEngine";
import { parseDesignBrief } from "./designPipeline/contentParser";

export type GraphicThemeStyle = ColorThemeKey;

export interface GraphicThemeConfig {
  id: GraphicThemeStyle;
  name: string;
  primaryAccent: string;
  secondaryAccent: string;
  badgeBg: string;
  badgeTextColor: string;
  highlightText: string;
  ctaBg: string;
  ctaTextColor: string;
  borderColor: string;
  bgGradientFrom: string;
  bgGradientVia: string;
  bgGradientTo: string;
}

export const GRAPHIC_FORMATS = PIPELINE_GRAPHIC_FORMATS;
export const GRAPHIC_THEMES = COLOR_THEMES;

export interface LocalGraphicOptions {
  formatKey?: GraphicDesignFormatKey;
  layoutArchetype?: LayoutArchetypeKey;
  fontPairing?: FontPairingKey;
  themeStyle?: GraphicThemeStyle;
  customWidth?: number;
  customHeight?: number;
  businessName: string;
  category: string;
  tagline?: string;
  logoUrl?: string | null;
  headline: string;
  subheadline?: string;
  priceTag?: string; // e.g. "₦25,000" or "30% OFF"
  badgeText?: string; // e.g. "👑 QUEEN VIP VERIFIED"
  highlights?: string[];
  ctaText?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  website?: string;
  stockImageUrl?: string;
  stockAsset?: StockPhotoAsset;
  showWatermark?: boolean;
  showQrCode?: boolean;
  exportScale?: number;
}

export {
  CURATED_STOCK_CATALOG,
  searchStockPhotos,
  resolveBestStockPhoto,
  FONT_PAIRINGS,
  COLOR_THEMES,
  executeDesignPipeline,
};

export type {
  GraphicDesignFormatKey,
  GraphicDimension,
  LayoutArchetypeKey,
  FontPairingKey,
  ColorThemeKey,
  MaskShapeKey,
  PipelineBriefInput,
  ParsedBrief,
  StockPhotoAsset,
};

/**
 * Gets the best stock image URL for category
 */
export function getStockImageForCategory(category: string): string {
  const asset = resolveBestStockPhoto(category, "");
  return asset.url;
}

/**
 * Renders a full high-resolution graphic design using the 6-stage Commercial Design Pipeline
 */
export async function renderLocalGraphicDesign(
  options: LocalGraphicOptions
): Promise<string> {
  const result = await executeDesignPipeline({
    formatKey: options.formatKey || "business_flyer",
    layoutArchetype: options.layoutArchetype,
    fontPairing: options.fontPairing,
    themeStyle: options.themeStyle || "royal_gold",
    businessName: options.businessName || "My Business",
    category: options.category || "General",
    tagline: options.tagline,
    logoUrl: options.logoUrl,
    headline: options.headline || "High Converting Commercial Creative",
    subheadline: options.subheadline,
    priceTag: options.priceTag,
    badgeText: options.badgeText,
    highlights: options.highlights,
    ctaText: options.ctaText,
    phone: options.phone,
    whatsapp: options.whatsapp,
    address: options.address,
    website: options.website,
    stockImageUrl: options.stockImageUrl,
    stockAsset: options.stockAsset,
    showWatermark: options.showWatermark,
    showQrCode: options.showQrCode,
    customWidth: options.customWidth,
    customHeight: options.customHeight,
    exportScale: options.exportScale || 1,
  });

  return result.dataUrl;
}

/**
 * AI "Improve Design" presets that mathematically and optically optimize contrast,
 * hierarchy, typography balance, palette selection, and CTA visibility.
 */
export type AIImprovementPresetKey =
  | "make_professional"
  | "make_premium"
  | "make_cleaner"
  | "easy_to_read"
  | "strong_cta"
  | "make_modern"
  | "less_crowded"
  | "make_attractive";

export interface AIImprovementPreset {
  key: AIImprovementPresetKey;
  label: string;
  description: string;
  iconName: string;
  apply: (current: LocalGraphicOptions) => LocalGraphicOptions;
}

export const AI_IMPROVEMENT_PRESETS: AIImprovementPreset[] = [
  {
    key: "make_professional",
    label: "More Professional",
    description: "Refines typography hierarchy, clean alignment, and executive styling",
    iconName: "ShieldCheck",
    apply: (cur) => ({
      ...cur,
      themeStyle: "ocean_corporate",
      layoutArchetype: "corporate_executive",
      fontPairing: "corporate_trust",
      badgeText: "👑 VERIFIED PROFESSIONAL ENTERPRISE",
      ctaText: "CONTACT DIRECTLY ON WHATSAPP",
      highlights: [
        "100% Certified & Verified Service",
        "Fast Nationwide Delivery & Invoicing",
        "Direct WhatsApp Support 24/7",
      ],
    }),
  },
  {
    key: "make_premium",
    label: "More Premium & Luxury",
    description: "Applies 24k Gold accents, prestige badges, and high-status contrast",
    iconName: "Sparkles",
    apply: (cur) => ({
      ...cur,
      themeStyle: "royal_gold",
      layoutArchetype: "luxury_center_portal",
      fontPairing: "royal_prestige",
      badgeText: "👑 QUEEN VIP LUXURY SHOWCASE",
      ctaText: "RESERVE VIP ORDER ON WHATSAPP",
      highlights: [
        "Master Quality Craftsmanship",
        "VIP Express Priority Fulfillment",
        "100% Satisfaction Guaranteed",
      ],
    }),
  },
  {
    key: "make_cleaner",
    label: "Cleaner & Minimal",
    description: "Eliminates visual clutter and expands negative space",
    iconName: "Maximize2",
    apply: (cur) => ({
      ...cur,
      themeStyle: "minimal_dark",
      layoutArchetype: "tech_minimalist_dark",
      fontPairing: "clean_minimalist",
      badgeText: "OFFICIAL EXCLUSIVE OFFER",
      subheadline: cur.subheadline ? cur.subheadline.slice(0, 70) : undefined,
      highlights: [
        "Premium Quality Standard",
        "Fast & Seamless Processing",
      ],
    }),
  },
  {
    key: "easy_to_read",
    label: "High Contrast Readability",
    description: "Boosts text sharpness, adds strong backdrops, and simplifies fonts",
    iconName: "Eye",
    apply: (cur) => ({
      ...cur,
      themeStyle: "royal_gold",
      fontPairing: "modern_commercial",
      badgeText: "★ OFFICIAL VERIFIED ★",
      ctaText: "CHAT ON WHATSAPP NOW",
    }),
  },
  {
    key: "strong_cta",
    label: "High Conversion CTA",
    description: "Magnifies call-to-action button and adds conversion urgency",
    iconName: "Zap",
    apply: (cur) => ({
      ...cur,
      layoutArchetype: "bold_commercial_retail",
      fontPairing: "high_impact_retail",
      priceTag: cur.priceTag || "🔥 SPECIAL OFFER",
      badgeText: "⚡ LIMITED TIME OFFER — ACT FAST",
      ctaText: "🛒 ORDER VIA WHATSAPP NOW",
    }),
  },
  {
    key: "make_modern",
    label: "Modern Tech Aesthetic",
    description: "Applies Cyber Sapphire blue tones and sharp geometric balance",
    iconName: "Cpu",
    apply: (cur) => ({
      ...cur,
      themeStyle: "cyber_tech",
      layoutArchetype: "tech_minimalist_dark",
      fontPairing: "tech_forward",
      badgeText: "⚡ NEXT-GEN INNOVATION",
      ctaText: "GET INSTANT ACCESS",
    }),
  },
  {
    key: "less_crowded",
    label: "Less Crowded & Spaced",
    description: "Trims lengthy copy into punchy highlights and bold headers",
    iconName: "MinusCircle",
    apply: (cur) => ({
      ...cur,
      highlights: (cur.highlights || []).slice(0, 2),
      subheadline: cur.subheadline ? cur.subheadline.slice(0, 60) : undefined,
    }),
  },
  {
    key: "make_attractive",
    label: "Vibrant & Eye-Catching",
    description: "Injects warm sunset gradient glow and high-vibrancy accents",
    iconName: "Flame",
    apply: (cur) => ({
      ...cur,
      themeStyle: "sunset_vibrant",
      layoutArchetype: "split_asymmetric_hero",
      badgeText: "🔥 HOT TRENDING OFFER",
      ctaText: "CLAIM YOUR DISCOUNT NOW",
    }),
  },
];

/**
 * Natural language prompt parser to convert freeform user requests into structured design parameters
 */
export function parseNaturalLanguageDesignPrompt(prompt: string): Partial<LocalGraphicOptions> {
  const text = (prompt || "").trim();
  const lower = text.toLowerCase();

  const options: Partial<LocalGraphicOptions> = {
    headline: text.length > 50 ? text.slice(0, 48) + "..." : text,
  };

  // Format detection
  if (lower.includes("status") || lower.includes("story") || lower.includes("tiktok") || lower.includes("reel")) {
    options.formatKey = "whatsapp_status";
  } else if (lower.includes("banner") || lower.includes("landscape") || lower.includes("facebook")) {
    options.formatKey = "display_banner";
  } else if (lower.includes("card") || lower.includes("business card")) {
    options.formatKey = "business_card";
  } else if (lower.includes("thumbnail") || lower.includes("youtube")) {
    options.formatKey = "youtube_thumbnail";
  } else if (lower.includes("a4") || lower.includes("print") || lower.includes("handbill")) {
    options.formatKey = "a4_print_flyer";
  } else if (lower.includes("product") || lower.includes("item") || lower.includes("stock")) {
    options.formatKey = "product_promo";
  } else if (lower.includes("discount") || lower.includes("sale") || lower.includes("flash")) {
    options.formatKey = "discount_sale";
  } else if (lower.includes("event") || lower.includes("seminar") || lower.includes("church") || lower.includes("webinar")) {
    options.formatKey = "event_flyer";
  } else {
    options.formatKey = "business_flyer";
  }

  // Price / Discount detection
  const discountMatch = text.match(/(\d+%\s*off|\d+%\s*discount)/i);
  if (discountMatch) {
    options.priceTag = discountMatch[0].toUpperCase();
  }

  const nairaMatch = text.match(/(₦\s*[\d,]+|naira\s*[\d,]+|\d+\s*k)/i);
  if (nairaMatch) {
    options.priceTag = nairaMatch[0].replace(/naira/i, "₦").trim();
  }

  // Phone / WhatsApp detection
  const phoneMatch = text.match(/(\+?234\d{10}|0\d{10})/);
  if (phoneMatch) {
    options.phone = phoneMatch[0];
    options.whatsapp = phoneMatch[0];
  }

  // Category & Layout detection
  if (lower.includes("food") || lower.includes("restaurant") || lower.includes("catering") || lower.includes("chef") || lower.includes("jollof")) {
    options.category = "Food & Catering";
    options.themeStyle = "sunset_vibrant";
    options.layoutArchetype = "food_gourmet_spotlight";
    options.fontPairing = "gourmet_bistro";
  } else if (lower.includes("fashion") || lower.includes("boutique") || lower.includes("cloth") || lower.includes("wear") || lower.includes("luxury")) {
    options.category = "Fashion & Luxury";
    options.themeStyle = "royal_gold";
    options.layoutArchetype = "magazine_editorial";
    options.fontPairing = "editorial_vogue";
  } else if (lower.includes("tech") || lower.includes("software") || lower.includes("phone") || lower.includes("gadget") || lower.includes("crypto") || lower.includes("solar")) {
    options.category = "Tech & Gadgets";
    options.themeStyle = "cyber_tech";
    options.layoutArchetype = "tech_minimalist_dark";
    options.fontPairing = "tech_forward";
  } else if (lower.includes("beauty") || lower.includes("hair") || lower.includes("spa") || lower.includes("salon") || lower.includes("makeup")) {
    options.category = "Beauty & Cosmetics";
    options.themeStyle = "crimson_ruby";
    options.layoutArchetype = "magazine_editorial";
    options.fontPairing = "editorial_vogue";
  } else if (lower.includes("real estate") || lower.includes("property") || lower.includes("house") || lower.includes("apartment") || lower.includes("mansion")) {
    options.category = "Real Estate";
    options.themeStyle = "emerald_luxury";
    options.layoutArchetype = "luxury_center_portal";
    options.fontPairing = "royal_prestige";
  } else if (lower.includes("event") || lower.includes("conference") || lower.includes("church") || lower.includes("seminar")) {
    options.category = "Events & Conferences";
    options.themeStyle = "royal_gold";
    options.layoutArchetype = "event_masterpiece";
    options.fontPairing = "royal_prestige";
  }

  return options;
}
