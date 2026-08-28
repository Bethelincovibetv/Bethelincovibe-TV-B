import {
  PipelineBriefInput,
  ParsedBrief,
  LayoutArchetypeKey,
  FontPairingKey,
  ColorThemeKey,
  MaskShapeKey,
} from "./types";

/**
 * Normalizes Nigerian currency text into crisp, high-status badges
 * Examples: "25000" -> "₦25,000", "50% off" -> "🔥 50% OFF FLASH SALE"
 */
export function formatNairaPrice(rawPrice?: string): string | null {
  if (!rawPrice || !rawPrice.trim()) return null;
  let clean = rawPrice.trim();

  // Percentage discount handling
  if (/\d+%\s*(off|discount)?/i.test(clean)) {
    const match = clean.match(/(\d+%\s*(off|discount)?)/i);
    if (match) {
      return match[0].toUpperCase();
    }
  }

  // Raw numeric detection e.g. "45000" or "45k"
  const kMatch = clean.match(/^(\d+)\s*k$/i);
  if (kMatch) {
    const num = parseInt(kMatch[1], 10) * 1000;
    return `₦${num.toLocaleString()}`;
  }

  // Strip non-digit chars except commas if numeric
  const numericOnly = clean.replace(/[^\d]/g, "");
  if (numericOnly && numericOnly.length >= 3 && !clean.toLowerCase().includes("off")) {
    const num = parseInt(numericOnly, 10);
    return `₦${num.toLocaleString()}`;
  }

  if (!clean.startsWith("₦") && !clean.includes("%") && !clean.toLowerCase().includes("free")) {
    clean = `₦${clean}`;
  }

  return clean.toUpperCase();
}

/**
 * Normalizes Nigerian Phone / WhatsApp contact formats
 */
export function formatNigerianPhone(rawPhone?: string): string {
  if (!rawPhone || !rawPhone.trim()) return "+234 800 000 0000";
  let clean = rawPhone.trim().replace(/[^\d+]/g, "");

  if (clean.startsWith("0") && clean.length === 11) {
    clean = "+234 " + clean.slice(1, 4) + " " + clean.slice(4, 7) + " " + clean.slice(7);
  } else if (clean.startsWith("234") && clean.length === 13) {
    clean = "+234 " + clean.slice(3, 6) + " " + clean.slice(6, 9) + " " + clean.slice(9);
  } else if (clean.startsWith("+234") && clean.length === 14) {
    clean = "+234 " + clean.slice(4, 7) + " " + clean.slice(7, 10) + " " + clean.slice(10);
  }
  return clean;
}

/**
 * Automatically infers the best layout archetype and visual mood based on the brief content
 */
export function inferLayoutArchetype(
  category: string,
  headline: string,
  formatKey?: string
): LayoutArchetypeKey {
  const cat = (category || "").toLowerCase();
  const head = (headline || "").toLowerCase();

  if (cat.includes("food") || cat.includes("restaurant") || cat.includes("catering") || cat.includes("bakery") || cat.includes("chef")) {
    return "food_gourmet_spotlight";
  }

  if (cat.includes("event") || cat.includes("seminar") || cat.includes("conference") || cat.includes("church") || head.includes("webinar") || head.includes("summit")) {
    return "event_masterpiece";
  }

  if (cat.includes("tech") || cat.includes("gadget") || cat.includes("software") || cat.includes("phone") || cat.includes("crypto") || cat.includes("solar")) {
    return "tech_minimalist_dark";
  }

  if (cat.includes("fashion") || cat.includes("luxury") || cat.includes("boutique") || cat.includes("beauty") || cat.includes("spa")) {
    return "magazine_editorial";
  }

  if (cat.includes("real estate") || cat.includes("property") || cat.includes("architecture") || cat.includes("mansion")) {
    return "luxury_center_portal";
  }

  if (cat.includes("corporate") || cat.includes("finance") || cat.includes("legal") || cat.includes("consulting") || cat.includes("logistics")) {
    return "corporate_executive";
  }

  if (head.includes("sale") || head.includes("discount") || head.includes("promo") || head.includes("offer") || head.includes("buy")) {
    return "bold_commercial_retail";
  }

  return "split_asymmetric_hero";
}

/**
 * Resolves optimal font pairing based on layout archetype and mood
 */
export function inferFontPairing(archetype: LayoutArchetypeKey, category: string): FontPairingKey {
  switch (archetype) {
    case "magazine_editorial":
      return "editorial_vogue";
    case "luxury_center_portal":
      return "royal_prestige";
    case "food_gourmet_spotlight":
      return "gourmet_bistro";
    case "event_masterpiece":
      return "royal_prestige";
    case "tech_minimalist_dark":
      return "tech_forward";
    case "bold_commercial_retail":
      return "high_impact_retail";
    case "corporate_executive":
      return "corporate_trust";
    default:
      return "modern_commercial";
  }
}

/**
 * Resolves optimal color theme based on category and archetype
 */
export function inferThemeStyle(category: string, archetype: LayoutArchetypeKey): ColorThemeKey {
  const cat = (category || "").toLowerCase();

  if (cat.includes("real estate") || cat.includes("property") || cat.includes("agriculture")) {
    return "emerald_luxury";
  }
  if (cat.includes("tech") || cat.includes("software") || cat.includes("solar")) {
    return "cyber_tech";
  }
  if (cat.includes("food") || cat.includes("restaurant") || cat.includes("catering")) {
    return "sunset_vibrant";
  }
  if (cat.includes("corporate") || cat.includes("finance") || cat.includes("legal") || cat.includes("logistics")) {
    return "ocean_corporate";
  }
  if (cat.includes("beauty") || cat.includes("salon") || cat.includes("spa") || cat.includes("cosmetics")) {
    return "crimson_ruby";
  }
  if (cat.includes("fashion") || cat.includes("luxury") || cat.includes("boutique")) {
    return "royal_gold";
  }
  if (archetype === "tech_minimalist_dark") {
    return "minimal_dark";
  }

  return "royal_gold";
}

/**
 * Resolves mask shape for the stock photo based on the layout archetype
 */
export function getMaskShapeForArchetype(archetype: LayoutArchetypeKey): MaskShapeKey {
  switch (archetype) {
    case "magazine_editorial":
      return "arch_frame";
    case "luxury_center_portal":
      return "circle_portal";
    case "bold_commercial_retail":
      return "rounded_card_layer";
    case "tech_minimalist_dark":
      return "angled_diagonal";
    case "food_gourmet_spotlight":
      return "circle_portal";
    case "event_masterpiece":
      return "diamond_shield";
    case "corporate_executive":
      return "rounded_card_layer";
    case "split_asymmetric_hero":
    default:
      return "angled_diagonal";
  }
}

/**
 * Master Brief Parser (Stage 1 of Design Pipeline)
 */
export function parseDesignBrief(input: PipelineBriefInput): ParsedBrief {
  const rawHeadline = (input.headline || "Transform Your Business with Premium Excellence").trim();
  const rawSubhead = (input.subheadline || "Experience industry-leading quality, fast nationwide turnaround, and dedicated customer fulfillment.").trim();

  // Inferred decisions
  const archetype = input.layoutArchetype || inferLayoutArchetype(input.category, rawHeadline, input.formatKey);
  const fontPairing = input.fontPairing || inferFontPairing(archetype, input.category);
  const themeStyle = input.themeStyle || inferThemeStyle(input.category, archetype);
  const maskShape = getMaskShapeForArchetype(archetype);

  // Price Tag formatting
  const cleanPriceTag = formatNairaPrice(input.priceTag);

  // Top Badge text
  let cleanBadgeText = (input.badgeText || "").trim();
  if (!cleanBadgeText) {
    if (archetype === "magazine_editorial") {
      cleanBadgeText = "👑 EXCLUSIVE EDITORIAL COLLECTION";
    } else if (archetype === "food_gourmet_spotlight") {
      cleanBadgeText = "✨ CHEF'S SIGNATURE SPECIAL • FRESH DAILY";
    } else if (archetype === "event_masterpiece") {
      cleanBadgeText = "★ OFFICIAL INVITATION & ANNOUNCEMENT ★";
    } else if (archetype === "tech_minimalist_dark") {
      cleanBadgeText = "⚡ NEXT-GEN INNOVATION & SMART TECH";
    } else if (archetype === "bold_commercial_retail") {
      cleanBadgeText = "🔥 LIMITED TIME PROMO • SAVE BIG TODAY";
    } else {
      cleanBadgeText = "👑 QUEEN VIP VERIFIED BUSINESS";
    }
  }

  // CTA Text
  let cleanCtaText = (input.ctaText || "").trim();
  if (!cleanCtaText) {
    if (archetype === "event_masterpiece") {
      cleanCtaText = "RESERVE VIP SEAT ON WHATSAPP";
    } else if (archetype === "food_gourmet_spotlight") {
      cleanCtaText = "ORDER DELICIOUS MEAL NOW";
    } else if (archetype === "bold_commercial_retail") {
      cleanCtaText = "CLAIM YOUR DISCOUNT ON WHATSAPP";
    } else if (archetype === "corporate_executive") {
      cleanCtaText = "BOOK CONSULTATION ON WHATSAPP";
    } else {
      cleanCtaText = "ORDER DIRECT ON WHATSAPP";
    }
  }

  // Contact Info
  const formattedPhone = formatNigerianPhone(input.phone);
  const formattedWhatsapp = formatNigerianPhone(input.whatsapp || input.phone);
  const formattedAddress = (input.address || "Lagos, Nigeria").trim();

  // Highlights / Value Points
  let formattedHighlights = input.highlights && input.highlights.length > 0
    ? input.highlights.map((h) => h.replace(/^✓\s*/, "").trim())
    : [
        "100% Quality & Satisfaction Guaranteed",
        "Fast Nationwide Turnaround & Invoicing",
        "Direct Instant WhatsApp Order & Support",
      ];

  return {
    cleanHeadline: rawHeadline,
    headlineLines: [], // populated during typography rendering
    cleanSubheadline: rawSubhead,
    subheadlineLines: [],
    cleanPriceTag,
    cleanBadgeText,
    cleanCtaText,
    formattedPhone,
    formattedWhatsapp,
    formattedAddress,
    formattedHighlights,
    primaryIndustry: input.category || "General Commerce",
    inferredMood: archetype,
    layoutArchetype: archetype,
    fontPairing,
    themeStyle,
    maskShape,
  };
}
