import {
  LocalGraphicOptions,
  GraphicDesignFormatKey,
  LayoutArchetypeKey,
  FontPairingKey,
  GraphicThemeStyle,
  StockPhotoAsset,
  CURATED_STOCK_CATALOG,
  searchStockPhotos,
  resolveBestStockPhoto,
  parseNaturalLanguageDesignPrompt,
  renderLocalGraphicDesign,
} from "./localGraphicEngine";

export interface AgentChatMessage {
  id: string;
  sender: "user" | "agent";
  text: string;
  timestamp: number;
  previewImage?: string; // Data URL of the generated flyer preview!
  formatKey?: GraphicDesignFormatKey;
  layoutArchetype?: LayoutArchetypeKey;
  themeStyle?: GraphicThemeStyle;
  headline?: string;
  priceTag?: string;
  actionBadges?: { label: string; icon?: string; type?: "theme" | "layout" | "price" | "contact" | "asset" | "format" }[];
  suggestedActions?: { label: string; prompt: string; icon?: string }[];
  appliedChanges?: Partial<LocalGraphicOptions>;
}

/**
 * Highly Intelligent Creative Agent Intent Parser & Commercial Reasoning Engine
 */
export function processAgentUserMessage(
  userText: string,
  currentOptions: LocalGraphicOptions,
  userName?: string
): {
  updatedOptions: LocalGraphicOptions;
  agentReply: string;
  actionBadges: { label: string; icon?: string; type?: "theme" | "layout" | "price" | "contact" | "asset" | "format" }[];
  suggestedActions: { label: string; prompt: string; icon?: string }[];
  appliedChanges: Partial<LocalGraphicOptions>;
} {
  const text = (userText || "").trim();
  const lower = text.toLowerCase();
  const changes: Partial<LocalGraphicOptions> = {};
  const actionBadges: { label: string; icon?: string; type?: "theme" | "layout" | "price" | "contact" | "asset" | "format" }[] = [];
  const explanations: string[] = [];
  const designTips: string[] = [];

  // 1. Detect Colors & Themes
  if (lower.includes("gold") || lower.includes("royal") || lower.includes("yellow") || lower.includes("prestige") || lower.includes("luxury gold")) {
    changes.themeStyle = "royal_gold";
    actionBadges.push({ label: "24K Royal Gold", type: "theme" });
    explanations.push("switched to 24K Royal Gold with Obsidian Black backdrop for high-end luxury appeal");
    designTips.push("Obsidian and Gold maximize visual contrast, creating an executive feel favored by top African luxury brands.");
  } else if (lower.includes("emerald") || lower.includes("green") || lower.includes("mint") || lower.includes("nature") || lower.includes("jade")) {
    changes.themeStyle = "emerald_luxury";
    actionBadges.push({ label: "Emerald Luxury", type: "theme" });
    explanations.push("applied Royal Emerald & Jade Green accents");
    designTips.push("Emerald green builds customer trust and signals prosperity, freshness, and sustainable quality.");
  } else if (lower.includes("ruby") || lower.includes("crimson") || lower.includes("red") || lower.includes("rose") || lower.includes("pink") || lower.includes("velvet")) {
    changes.themeStyle = "crimson_ruby";
    actionBadges.push({ label: "Crimson Ruby", type: "theme" });
    explanations.push("infused Velvet Crimson Ruby tones with high-energy urgency");
    designTips.push("Crimson red triggers immediate appetite and buying impulse, ideal for beauty, food, and clearance events.");
  } else if (lower.includes("sapphire") || lower.includes("blue") || lower.includes("ocean") || lower.includes("corporate") || lower.includes("navy")) {
    changes.themeStyle = "ocean_corporate";
    actionBadges.push({ label: "Ocean Sapphire", type: "theme" });
    explanations.push("updated to Enterprise Ocean Sapphire Blue");
    designTips.push("Deep navy and sapphire blue communicate corporate stability, institutional security, and authority.");
  } else if (lower.includes("cyber") || lower.includes("tech") || lower.includes("neon") || lower.includes("electric") || lower.includes("purple") || lower.includes("violet")) {
    changes.themeStyle = "cyber_tech";
    actionBadges.push({ label: "Cyber Tech", type: "theme" });
    explanations.push("enabled Cyber Tech Neon Matrix styling");
    designTips.push("Electric violet and neon matrix gradients command attention in high-tech, solar, and crypto niches.");
  } else if (lower.includes("sunset") || lower.includes("orange") || lower.includes("amber") || lower.includes("warm") || lower.includes("coral")) {
    changes.themeStyle = "sunset_vibrant";
    actionBadges.push({ label: "Sunset Vibrant", type: "theme" });
    explanations.push("warmed up with a vibrant Sunset Amber gradient");
    designTips.push("Warm amber and coral create an inviting, energetic atmosphere that boosts click-through rates.");
  } else if (lower.includes("dark") || lower.includes("minimal") || lower.includes("black") || lower.includes("clean") || lower.includes("obsidian") || lower.includes("monochrome")) {
    changes.themeStyle = "minimal_dark";
    actionBadges.push({ label: "Obsidian Minimal", type: "theme" });
    explanations.push("streamlined with Obsidian Minimal high-contrast styling");
  }

  // 2. Detect Layout Archetype & Style Intent
  if (lower.includes("magazine") || lower.includes("editorial") || lower.includes("vogue") || lower.includes("fashion cover") || lower.includes("lookbook")) {
    changes.layoutArchetype = "magazine_editorial";
    changes.fontPairing = "editorial_vogue";
    actionBadges.push({ label: "Magazine Editorial", type: "layout" });
    explanations.push("activated Luxury Magazine Editorial layout with framed arch composition");
  } else if (lower.includes("portal") || lower.includes("center") || lower.includes("circle") || lower.includes("luxury frame") || lower.includes("pedestal")) {
    changes.layoutArchetype = "luxury_center_portal";
    changes.fontPairing = "royal_prestige";
    actionBadges.push({ label: "Center Portal", type: "layout" });
    explanations.push("set Concentric Metallic Center Portal focal point");
  } else if (lower.includes("retail") || lower.includes("flash sale") || lower.includes("promo") || lower.includes("bold sale") || lower.includes("discount promo") || lower.includes("clearance") || lower.includes("black friday")) {
    changes.layoutArchetype = "bold_commercial_retail";
    changes.fontPairing = "high_impact_retail";
    actionBadges.push({ label: "Bold Retail Promo", type: "layout" });
    explanations.push("styled high-converting Bold Retail Promo with 3D price tag container");
  } else if (lower.includes("event") || lower.includes("seminar") || lower.includes("church") || lower.includes("conference") || lower.includes("ticket") || lower.includes("summit") || lower.includes("worship") || lower.includes("concert")) {
    changes.layoutArchetype = "event_masterpiece";
    changes.fontPairing = "royal_prestige";
    actionBadges.push({ label: "Event Masterpiece", type: "layout" });
    explanations.push("arranged Gold Ticket Event & Seminar shield layout with VIP credentials");
  } else if (lower.includes("grid") || lower.includes("specs") || lower.includes("developer") || lower.includes("solar specs") || lower.includes("technical")) {
    changes.layoutArchetype = "tech_minimalist_dark";
    changes.fontPairing = "tech_forward";
    actionBadges.push({ label: "Tech Precision Grid", type: "layout" });
    explanations.push("applied Tech Precision Coordinates Grid with architectural specs");
  } else if (lower.includes("food") || lower.includes("bistro") || lower.includes("gourmet") || lower.includes("restaurant") || lower.includes("dish") || lower.includes("menu") || lower.includes("catering") || lower.includes("kitchen")) {
    changes.layoutArchetype = "food_gourmet_spotlight";
    changes.fontPairing = "gourmet_bistro";
    actionBadges.push({ label: "Gourmet Bistro", type: "layout" });
    explanations.push("framed Gourmet Bistro culinary dish presentation with warm spotlighting");
  } else if (lower.includes("corporate") || lower.includes("executive") || lower.includes("consulting") || lower.includes("law") || lower.includes("finance") || lower.includes("agency")) {
    changes.layoutArchetype = "corporate_executive";
    changes.fontPairing = "corporate_trust";
    actionBadges.push({ label: "Corporate Executive", type: "layout" });
    explanations.push("structured Corporate Executive credential layout with institutional typography");
  } else if (lower.includes("split") || lower.includes("hero") || lower.includes("diagonal") || lower.includes("modern dynamic")) {
    changes.layoutArchetype = "split_asymmetric_hero";
    changes.fontPairing = "modern_commercial";
    actionBadges.push({ label: "Split-Hero Dynamic", type: "layout" });
    explanations.push("aligned 45° Split-Hero Dynamic commercial mask");
  }

  // 3. Format & Aspect Ratio Detection
  if (lower.includes("status") || lower.includes("story") || lower.includes("tiktok") || lower.includes("reel") || lower.includes("9:16") || lower.includes("vertical") || lower.includes("phone size")) {
    changes.formatKey = "whatsapp_status";
    actionBadges.push({ label: "WhatsApp Status (9:16)", type: "format" });
    explanations.push("resized to WhatsApp Status & TikTok 9:16 Vertical Story format (1080×1920px)");
  } else if (lower.includes("square") || lower.includes("instagram post") || lower.includes("1:1") || lower.includes("flyer") || lower.includes("feed post")) {
    changes.formatKey = "business_flyer";
    actionBadges.push({ label: "Square Flyer (1:1)", type: "format" });
    explanations.push("formatted for High-Res Square 1:1 Flyer (1200×1200px)");
  } else if (lower.includes("banner") || lower.includes("landscape") || lower.includes("facebook cover") || lower.includes("16:9") || lower.includes("header")) {
    changes.formatKey = "display_banner";
    actionBadges.push({ label: "Landscape Banner (16:9)", type: "format" });
    explanations.push("expanded to 16:9 Landscape Commercial Banner (1920×1080px)");
  } else if (lower.includes("business card") || lower.includes("complimentary card") || lower.includes("contact card")) {
    changes.formatKey = "business_card";
    actionBadges.push({ label: "Business Card", type: "format" });
    explanations.push("proportioned for 3.5×2 inch High-Res Business Card (1050×600px)");
  } else if (lower.includes("a4") || lower.includes("handbill") || lower.includes("poster") || lower.includes("print")) {
    changes.formatKey = "a4_print_flyer";
    actionBadges.push({ label: "A4 Print Poster", type: "format" });
    explanations.push("calibrated for A4 300-DPI Print Flyer & Poster (1240×1754px)");
  }

  // 4. Price & Discount Extraction
  const discountMatch = text.match(/(\d+%\s*off|\d+%\s*discount|\bhalf\s*price\b|\bbuy\s*1\s*get\s*1\b)/i);
  if (discountMatch) {
    changes.priceTag = `🔥 ${discountMatch[0].toUpperCase()}`;
    actionBadges.push({ label: changes.priceTag, type: "price" });
    explanations.push(`highlighted "${changes.priceTag}" promotional tag`);
  }

  const nairaMatch = text.match(/(₦\s*[\d,]+|naira\s*[\d,]+|\b\d+\s*k\b|\b\d+\s*million\b|\b\d+\s*m\b)/i);
  if (nairaMatch) {
    let cleanNaira = nairaMatch[0].replace(/naira/i, "₦").trim();
    if (/^\d+\s*k$/i.test(cleanNaira)) {
      const kVal = parseInt(cleanNaira, 10) * 1000;
      cleanNaira = `₦${kVal.toLocaleString()}`;
    } else if (/^\d+\s*m(illion)?$/i.test(cleanNaira)) {
      const mVal = parseInt(cleanNaira, 10) * 1000000;
      cleanNaira = `₦${mVal.toLocaleString()}`;
    }
    if (!cleanNaira.startsWith("₦")) cleanNaira = `₦${cleanNaira}`;
    changes.priceTag = cleanNaira;
    actionBadges.push({ label: cleanNaira, type: "price" });
    explanations.push(`updated price badge to ${cleanNaira}`);
  }

  // 5. Phone & WhatsApp Extraction
  const phoneMatch = text.match(/(\+?234[\d\s-]{10,14}|0[789][01]\d{8})/);
  if (phoneMatch) {
    const rawNum = phoneMatch[0].replace(/[\s-]/g, "");
    changes.phone = rawNum;
    changes.whatsapp = rawNum;
    actionBadges.push({ label: `Tel: ${rawNum}`, type: "contact" });
    explanations.push(`verified contact number as ${rawNum}`);
  }

  // 6. Explicit Headline or Quote extraction
  const quoteMatch = text.match(/"([^"]+)"|'([^']+)'/);
  if (quoteMatch) {
    const extractedQuote = (quoteMatch[1] || quoteMatch[2]).trim();
    if (extractedQuote.length > 3) {
      changes.headline = extractedQuote;
      explanations.push(`crafted custom headline "${extractedQuote}"`);
    }
  } else if (lower.includes("headline to ") || lower.includes("title to ") || lower.includes("change title to ") || lower.includes("heading to ") || lower.includes("name to ")) {
    const afterTitle = text.replace(/.*(?:headline to|title to|change title to|heading to|name to)\s+/i, "").trim();
    if (afterTitle) {
      changes.headline = afterTitle;
      explanations.push(`set headline to "${afterTitle}"`);
    }
  }

  // 7. Subtitle / Tagline extraction
  if (lower.includes("subtitle to ") || lower.includes("tagline to ") || lower.includes("subheading to ")) {
    const afterSub = text.replace(/.*(?:subtitle to|tagline to|subheading to)\s+/i, "").trim();
    if (afterSub) {
      changes.subheadline = afterSub;
      explanations.push(`customized subheadline to "${afterSub}"`);
    }
  }

  // 8. Badge Text extraction
  if (lower.includes("badge to ") || lower.includes("set badge ") || lower.includes("add badge ") || lower.includes("tag to ")) {
    const afterBadge = text.replace(/.*(?:badge to|set badge|add badge|tag to)\s+/i, "").trim();
    if (afterBadge) {
      changes.badgeText = `👑 ${afterBadge.toUpperCase()}`;
      actionBadges.push({ label: changes.badgeText, type: "layout" });
      explanations.push(`customized badge banner to "${changes.badgeText}"`);
    }
  }

  // 9. CTA Text extraction
  if (lower.includes("cta to ") || lower.includes("button to ") || lower.includes("change button to ") || lower.includes("action to ")) {
    const afterCta = text.replace(/.*(?:cta to|button to|change button to|action to)\s+/i, "").trim();
    if (afterCta) {
      changes.ctaText = afterCta.toUpperCase();
      explanations.push(`updated call-to-action button to "${changes.ctaText}"`);
    }
  }

  // 10. Address / Location extraction
  const locationMatch = text.match(/(in|at|located at|address:?)\s+([A-Za-z0-9\s,.-]+(Lagos|Abuja|Ibadan|Port Harcourt|Kano|Enugu|Lekki|Ikeja|Ikoyi|Victoria Island|Surulere|Yaba|Maitama|Wuse|Gwarinpa|GRA))/i);
  if (locationMatch && locationMatch[2]) {
    changes.address = locationMatch[2].trim();
    actionBadges.push({ label: `📍 ${changes.address}`, type: "contact" });
    explanations.push(`located business at ${changes.address}`);
  }

  // 11. Stock Asset Keyword Matching
  let matchedStock: StockPhotoAsset | null = null;
  if (lower.includes("food") || lower.includes("rice") || lower.includes("jollof") || lower.includes("chef") || lower.includes("cake") || lower.includes("catering") || lower.includes("suya") || lower.includes("shawarma") || lower.includes("pastry") || lower.includes("grill") || lower.includes("small chops")) {
    matchedStock = resolveBestStockPhoto("food", text);
  } else if (lower.includes("fashion") || lower.includes("dress") || lower.includes("model") || lower.includes("suit") || lower.includes("cloth") || lower.includes("boutique") || lower.includes("ankara") || lower.includes("lace") || lower.includes("streetwear")) {
    matchedStock = resolveBestStockPhoto("fashion", text);
  } else if (lower.includes("house") || lower.includes("real estate") || lower.includes("mansion") || lower.includes("duplex") || lower.includes("land") || lower.includes("apartment") || lower.includes("shortlet") || lower.includes("property")) {
    matchedStock = resolveBestStockPhoto("realestate", text);
  } else if (lower.includes("phone") || lower.includes("tech") || lower.includes("laptop") || lower.includes("iphone") || lower.includes("gadget") || lower.includes("software") || lower.includes("macbook") || lower.includes("crypto")) {
    matchedStock = resolveBestStockPhoto("tech", text);
  } else if (lower.includes("beauty") || lower.includes("spa") || lower.includes("hair") || lower.includes("wig") || lower.includes("braids") || lower.includes("skincare") || lower.includes("cosmetics") || lower.includes("makeup") || lower.includes("salon")) {
    matchedStock = resolveBestStockPhoto("beauty", text);
  } else if (lower.includes("solar") || lower.includes("inverter") || lower.includes("battery") || lower.includes("panel") || lower.includes("power") || lower.includes("generator")) {
    matchedStock = resolveBestStockPhoto("solar", text);
  } else if (lower.includes("delivery") || lower.includes("car") || lower.includes("logistics") || lower.includes("truck") || lower.includes("dispatch") || lower.includes("cargo") || lower.includes("auto")) {
    matchedStock = resolveBestStockPhoto("logistics", text);
  } else if (lower.includes("church") || lower.includes("seminar") || lower.includes("stage") || lower.includes("conference") || lower.includes("speaker") || lower.includes("summit") || lower.includes("worship") || lower.includes("concert")) {
    matchedStock = resolveBestStockPhoto("events", text);
  }

  if (matchedStock) {
    changes.stockAsset = matchedStock;
    changes.stockImageUrl = undefined; // clear custom URL to use selected asset
    actionBadges.push({ label: matchedStock.title, icon: "📸", type: "asset" });
    explanations.push(`matched curated commercial asset "${matchedStock.title}"`);
  }

  // 12. Highlights / Value Propositions
  if (lower.includes("delivery") || lower.includes("free delivery") || lower.includes("nationwide") || lower.includes("pay on delivery")) {
    const curH = changes.highlights || currentOptions.highlights || [];
    if (!curH.some((h) => h.toLowerCase().includes("delivery"))) {
      changes.highlights = [
        ...curH.slice(0, 2),
        "⚡ Express Nationwide Delivery & Invoicing",
      ];
    }
  }

  if (lower.includes("warranty") || lower.includes("guarantee") || lower.includes("original")) {
    const curH = changes.highlights || currentOptions.highlights || [];
    if (!curH.some((h) => h.toLowerCase().includes("warranty") || h.toLowerCase().includes("original"))) {
      changes.highlights = [
        ...curH.slice(0, 2),
        "🛡️ 100% Original Quality Guarantee",
      ];
    }
  }

  // 13. If this was a fresh, holistic request (e.g. "Create a luxury flyer for Lekki salon...")
  if (explanations.length === 0 || lower.includes("create") || lower.includes("make a") || lower.includes("design a") || lower.includes("generate") || lower.includes("build")) {
    const fullParsed = parseNaturalLanguageDesignPrompt(text);
    Object.assign(changes, fullParsed);

    if (fullParsed.category) {
      changes.category = fullParsed.category;
      actionBadges.push({ label: fullParsed.category, type: "layout" });
    }
    if (fullParsed.headline && !changes.headline) {
      changes.headline = fullParsed.headline;
    }
    if (fullParsed.priceTag && !changes.priceTag) {
      changes.priceTag = fullParsed.priceTag;
      actionBadges.push({ label: fullParsed.priceTag, type: "price" });
    }
    if (fullParsed.themeStyle && !changes.themeStyle) {
      changes.themeStyle = fullParsed.themeStyle;
    }
    if (fullParsed.layoutArchetype && !changes.layoutArchetype) {
      changes.layoutArchetype = fullParsed.layoutArchetype;
    }
    if (!matchedStock && fullParsed.category) {
      const autoAsset = resolveBestStockPhoto(fullParsed.category, text);
      changes.stockAsset = autoAsset;
      actionBadges.push({ label: autoAsset.title, icon: "📸", type: "asset" });
    }
  }

  // Merge with current options
  const updatedOptions: LocalGraphicOptions = {
    ...currentOptions,
    ...changes,
  };

  // Compose Maya's Senior AI Creative Director response with design reasoning
  let agentReply = "";
  const nameSalute = userName ? ` for ${userName}` : "";

  if (explanations.length > 0) {
    const mainAction = explanations.join(", ");
    agentReply = `I've refined your commercial campaign${nameSalute}! ✨\n\nI ${mainAction}.\n\nYour graphic preview is live below. I've structured the optical hierarchy so prospective customers in the Nigerian market immediately lock onto your offer and contact credentials.`;
  } else if (lower.includes("clean") || lower.includes("simple") || lower.includes("professional") || lower.includes("polish")) {
    agentReply = `I gave your graphic an executive director's polish${nameSalute}! 🎯\n\nDrawing from 40+ years of creative standards, I balanced the negative margins, tightened the typography scale, and amplified the WhatsApp CTA button for maximum conversion.`;
  } else {
    agentReply = `I've analyzed your brief and crafted this high-impact commercial flyer${nameSalute}! 🎨\n\nI've calibrated this design for the Nigerian market with bold visual contrast, 300 DPI print-ready clarity, and instant WhatsApp ordering credentials.`;
  }

  // Ask strategic follow-up question for continuous creative direction
  if (!lower.includes("price") && !lower.includes("discount") && !lower.includes("₦")) {
    agentReply += `\n\n💬 **Creative Director's Recommendation**: Would you like me to add a specific price tag (e.g. *₦15,000*) or a limited-time flash discount badge to create higher purchase urgency?`;
  } else if (!lower.includes("status") && !lower.includes("9:16") && !lower.includes("story")) {
    agentReply += `\n\n💬 **Format Suggestion**: Would you also like a vertical 9:16 WhatsApp Status version of this design for your daily stories?`;
  }

  if (designTips.length > 0) {
    agentReply += `\n\n💡 **Maya's Tip**: ${designTips[0]}`;
  }

  // Dynamic Suggestion Chips based on current state
  const suggestedActions: { label: string; prompt: string; icon?: string }[] = [];

  if (updatedOptions.themeStyle !== "royal_gold") {
    suggestedActions.push({ label: "👑 24K Royal Gold", prompt: "Make the theme 24K Royal Gold with luxury status" });
  } else {
    suggestedActions.push({ label: "💎 Emerald Luxury", prompt: "Switch theme to Royal Emerald Luxury" });
  }

  if (updatedOptions.formatKey !== "whatsapp_status") {
    suggestedActions.push({ label: "📱 WhatsApp Story (9:16)", prompt: "Make this a WhatsApp Status and TikTok 9:16 Story" });
  } else {
    suggestedActions.push({ label: "🖼️ Square Post (1:1)", prompt: "Convert back to a 1:1 Square Flyer" });
  }

  if (!updatedOptions.priceTag?.includes("%")) {
    suggestedActions.push({ label: "🔥 25% Flash Discount", prompt: "Add a 25% OFF Limited Time Flash Discount tag" });
  } else {
    suggestedActions.push({ label: "💰 Set ₦20,000 Price", prompt: "Set the price tag to ₦20,000" });
  }

  if (updatedOptions.layoutArchetype !== "bold_commercial_retail") {
    suggestedActions.push({ label: "⚡ High Conversion Sale", prompt: "Apply bold commercial retail promo layout with 3D price card" });
  } else {
    suggestedActions.push({ label: "📰 Luxury Magazine Cover", prompt: "Change to luxury magazine editorial vogue layout" });
  }

  return {
    updatedOptions,
    agentReply,
    actionBadges,
    suggestedActions,
    appliedChanges: changes,
  };
}

/**
 * Pre-configured Industry Quick Templates for Instant 1-Click Generation
 */
export const AGENT_INDUSTRY_STARTERS = [
  {
    id: "fashion_luxe",
    icon: "👗",
    title: "Fashion & Boutique Sale",
    prompt: "Make a luxury fashion flyer for my boutique offering 30% discount on designer dresses, Lekki Lagos with WhatsApp order",
    badge: "Most Popular",
  },
  {
    id: "food_bistro",
    icon: "🍲",
    title: "Food & Restaurant Promo",
    prompt: "Create a mouthwatering food flyer for Smoky Jollof & Grilled Turkey Combos at ₦6,500 with fast free delivery in Ikeja",
    badge: "Food & Catering",
  },
  {
    id: "real_estate",
    icon: "🏢",
    title: "Luxury Real Estate",
    prompt: "Design a prestigious real estate flyer for a 4-Bedroom Fully Detached Duplex in Ikoyi Lagos with price tag ₦180,000,000 and VIP inspection booking",
    badge: "High Value",
  },
  {
    id: "tech_solar",
    icon: "⚡",
    title: "Solar & Inverter Package",
    prompt: "Create a modern cyber tech flyer for a 5kVA Solar Inverter Complete Installation with 2-Year Warranty for ₦1,250,000",
    badge: "Tech & Energy",
  },
  {
    id: "beauty_spa",
    icon: "💅",
    title: "Beauty, Hair & Spa",
    prompt: "Design an elegant beauty flyer for Human Hair Wigs & Luxury Spa pamper packages at 20% discount in Victoria Island",
    badge: "Beauty & Luxe",
  },
  {
    id: "event_church",
    icon: "🎤",
    title: "Event & Seminar",
    prompt: "Create a gold ticket event flyer for the 2026 Lagos SME Business & Leadership Summit with free seat registration on WhatsApp",
    badge: "Seminars",
  },
];
