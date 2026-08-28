export type GraphicDesignFormatKey =
  | "business_flyer" // 4:5 (1080x1350)
  | "instagram_post" // 1:1 (1080x1080)
  | "whatsapp_status" // 9:16 (1080x1920)
  | "display_banner" // 1.91:1 (1200x630)
  | "a4_print_flyer" // 1:1.414 (1240x1754)
  | "youtube_thumbnail" // 16:9 (1280x720)
  | "business_card" // 1.75:1 (1050x600)
  | "product_promo" // 1:1 (1080x1080)
  | "discount_sale" // 1:1 (1080x1080)
  | "event_flyer"; // 4:5 (1080x1350)

export interface GraphicDimension {
  key: GraphicDesignFormatKey;
  label: string;
  category: "social" | "business" | "events" | "promo" | "print";
  width: number;
  height: number;
  aspect: string;
  description: string;
  iconName: string;
  isPrintReady?: boolean;
}

export type LayoutArchetypeKey =
  | "split_asymmetric_hero" // High-impact diagonal / geometric split with floating offer card
  | "magazine_editorial" // Luxury editorial magazine cover with gold foil accents & serif header
  | "luxury_center_portal" // Concentric gold/platinum portal frame with centered prestige layout
  | "bold_commercial_retail" // 3D high-energy retail flyer with price callout tag & double-column badges
  | "event_masterpiece" // Seminar/Conference/Concert flyer with VIP ticket header and schedule card
  | "tech_minimalist_dark" // Obsidian cyber-grid with coordinates and sleek neon/sapphire line work
  | "food_gourmet_spotlight" // Warm foodie flyer with organic dish mask and spice/delivery badges
  | "corporate_executive"; // Clean navy/slate enterprise flyer with structured trust proof points

export interface LayoutArchetypeConfig {
  key: LayoutArchetypeKey;
  name: string;
  description: string;
  recommendedFor: string[];
  maskShape: MaskShapeKey;
  visualMood: string;
}

export type MaskShapeKey =
  | "circle_portal"
  | "angled_diagonal"
  | "rounded_card_layer"
  | "arch_frame"
  | "split_screen_bleed"
  | "pill_capsule"
  | "diamond_shield";

export type FontPairingKey =
  | "royal_prestige"
  | "modern_commercial"
  | "editorial_vogue"
  | "high_impact_retail"
  | "tech_forward"
  | "clean_minimalist"
  | "gourmet_bistro"
  | "corporate_trust";

export interface FontPairingConfig {
  key: FontPairingKey;
  name: string;
  displayFont: string;
  bodyFont: string;
  headlineStyle: "normal" | "italic";
  headlineWeight: string;
  bodyWeight: string;
  letterSpacing: number; // in em
  description: string;
}

export type ColorThemeKey =
  | "royal_gold"
  | "emerald_luxury"
  | "cyber_tech"
  | "sunset_vibrant"
  | "ocean_corporate"
  | "crimson_ruby"
  | "minimal_dark"
  | "terracotta_warm";

export interface ColorThemeConfig {
  id: ColorThemeKey;
  name: string;
  primaryAccent: string;
  secondaryAccent: string;
  tertiaryAccent: string;
  badgeBg: string;
  badgeTextColor: string;
  highlightText: string;
  ctaBg: string;
  ctaTextColor: string;
  borderColor: string;
  bgGradientFrom: string;
  bgGradientVia: string;
  bgGradientTo: string;
  cardBg: string;
  cardBorder: string;
  goldFoil: boolean;
  ambientLightColor: string;
}

export interface StockPhotoAsset {
  id: string;
  title: string;
  url: string;
  thumbUrl: string;
  author: string;
  authorUrl?: string;
  source: "pexels" | "unsplash" | "pixabay" | "curated";
  category: string;
  tags: string[];
  width: number;
  height: number;
  focalPoint: {
    x: number; // 0.0 - 1.0
    y: number; // 0.0 - 1.0
  };
}

export interface PipelineBriefInput {
  formatKey?: GraphicDesignFormatKey;
  layoutArchetype?: LayoutArchetypeKey;
  fontPairing?: FontPairingKey;
  themeStyle?: ColorThemeKey;
  businessName: string;
  category: string;
  tagline?: string;
  logoUrl?: string | null;
  headline: string;
  subheadline?: string;
  priceTag?: string; // e.g. "₦25,000" or "40% OFF"
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
  brandPrimaryColor?: string;
  brandSecondaryColor?: string;
  customWidth?: number;
  customHeight?: number;
  exportScale?: number; // 1 = 1x screen, 2 = 2x retina, 3 = 300dpi print
}

export interface ParsedBrief {
  cleanHeadline: string;
  headlineLines: string[];
  cleanSubheadline: string;
  subheadlineLines: string[];
  cleanPriceTag: string | null;
  cleanBadgeText: string;
  cleanCtaText: string;
  formattedPhone: string;
  formattedWhatsapp: string;
  formattedAddress: string;
  formattedHighlights: string[];
  primaryIndustry: string;
  inferredMood: string;
  layoutArchetype: LayoutArchetypeKey;
  fontPairing: FontPairingKey;
  themeStyle: ColorThemeKey;
  maskShape: MaskShapeKey;
}
