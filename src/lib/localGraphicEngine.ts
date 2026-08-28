import { getCategoryImage } from "@/lib/categoryImages";

export type GraphicDesignFormatKey =
  | "instagram_post"
  | "business_flyer"
  | "whatsapp_status"
  | "display_banner"
  | "youtube_thumbnail"
  | "business_card"
  | "product_promo"
  | "discount_sale"
  | "event_flyer";

export interface GraphicDimension {
  key: GraphicDesignFormatKey;
  label: string;
  category: "social" | "business" | "events" | "promo";
  width: number;
  height: number;
  aspect: string;
  description: string;
  iconName: string;
}

export const GRAPHIC_FORMATS: GraphicDimension[] = [
  {
    key: "business_flyer",
    label: "Business Flyer",
    category: "business",
    width: 1080,
    height: 1350,
    aspect: "4:5",
    description: "High-impact portrait flyer for WhatsApp distribution & printing",
    iconName: "FileText",
  },
  {
    key: "instagram_post",
    label: "Instagram / Square Post",
    category: "social",
    width: 1080,
    height: 1080,
    aspect: "1:1",
    description: "Perfect square post for Instagram, Facebook & Twitter feeds",
    iconName: "Instagram",
  },
  {
    key: "whatsapp_status",
    label: "WhatsApp Status / Story",
    category: "social",
    width: 1080,
    height: 1920,
    aspect: "9:16",
    description: "Full-screen vertical story for WhatsApp Status, TikTok & Reels",
    iconName: "Smartphone",
  },
  {
    key: "display_banner",
    label: "Promotional Display Banner",
    category: "business",
    width: 1200,
    height: 630,
    aspect: "1.91:1",
    description: "Commercial horizontal banner for directory, Google & Facebook ads",
    iconName: "LayoutTemplate",
  },
  {
    key: "product_promo",
    label: "Product Showcase Card",
    category: "promo",
    width: 1080,
    height: 1080,
    aspect: "1:1",
    description: "Showcase physical items with Naira price, in-stock badge & CTA",
    iconName: "ShoppingBag",
  },
  {
    key: "discount_sale",
    label: "Flash Sale & Discount",
    category: "promo",
    width: 1080,
    height: 1080,
    aspect: "1:1",
    description: "High-urgency promotional creative with large discount badge",
    iconName: "Tag",
  },
  {
    key: "event_flyer",
    label: "Event & Seminar Flyer",
    category: "events",
    width: 1080,
    height: 1350,
    aspect: "4:5",
    description: "Elegant announcement for webinars, conferences, church & launches",
    iconName: "Calendar",
  },
  {
    key: "youtube_thumbnail",
    label: "YouTube Video Thumbnail",
    category: "social",
    width: 1280,
    height: 720,
    aspect: "16:9",
    description: "Click-worthy 16:9 video cover with bold typography",
    iconName: "PlaySquare",
  },
  {
    key: "business_card",
    label: "Digital Business Card",
    category: "business",
    width: 1050,
    height: 600,
    aspect: "1.75:1",
    description: "Executive digital card with QR placeholder & contact details",
    iconName: "CreditCard",
  },
];

export type GraphicThemeStyle =
  | "royal_gold"
  | "cyber_tech"
  | "emerald_luxury"
  | "sunset_vibrant"
  | "ocean_corporate"
  | "crimson_ruby"
  | "minimal_dark";

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

export const GRAPHIC_THEMES: Record<GraphicThemeStyle, GraphicThemeConfig> = {
  royal_gold: {
    id: "royal_gold",
    name: "Royal Gold & Onyx",
    primaryAccent: "#F59E0B",
    secondaryAccent: "#FBBF24",
    badgeBg: "#F59E0B",
    badgeTextColor: "#000000",
    highlightText: "#FEF08A",
    ctaBg: "#22C55E",
    ctaTextColor: "#FFFFFF",
    borderColor: "#F59E0B",
    bgGradientFrom: "rgba(10, 15, 29, 0.94)",
    bgGradientVia: "rgba(15, 23, 42, 0.88)",
    bgGradientTo: "rgba(5, 8, 16, 0.98)",
  },
  emerald_luxury: {
    id: "emerald_luxury",
    name: "Emerald Luxury & Jade",
    primaryAccent: "#10B981",
    secondaryAccent: "#34D399",
    badgeBg: "#10B981",
    badgeTextColor: "#FFFFFF",
    highlightText: "#A7F3D0",
    ctaBg: "#10B981",
    ctaTextColor: "#FFFFFF",
    borderColor: "#10B981",
    bgGradientFrom: "rgba(6, 30, 20, 0.94)",
    bgGradientVia: "rgba(6, 78, 59, 0.86)",
    bgGradientTo: "rgba(2, 20, 12, 0.98)",
  },
  cyber_tech: {
    id: "cyber_tech",
    name: "Cyber Sapphire & Tech",
    primaryAccent: "#3B82F6",
    secondaryAccent: "#60A5FA",
    badgeBg: "#3B82F6",
    badgeTextColor: "#FFFFFF",
    highlightText: "#BFDBFE",
    ctaBg: "#22C55E",
    ctaTextColor: "#FFFFFF",
    borderColor: "#3B82F6",
    bgGradientFrom: "rgba(11, 25, 44, 0.94)",
    bgGradientVia: "rgba(15, 23, 42, 0.88)",
    bgGradientTo: "rgba(5, 10, 25, 0.98)",
  },
  sunset_vibrant: {
    id: "sunset_vibrant",
    name: "Sunset Coral & Blaze",
    primaryAccent: "#F97316",
    secondaryAccent: "#FB923C",
    badgeBg: "#F97316",
    badgeTextColor: "#FFFFFF",
    highlightText: "#FED7AA",
    ctaBg: "#22C55E",
    ctaTextColor: "#FFFFFF",
    borderColor: "#F97316",
    bgGradientFrom: "rgba(35, 12, 10, 0.94)",
    bgGradientVia: "rgba(45, 15, 20, 0.86)",
    bgGradientTo: "rgba(15, 5, 8, 0.98)",
  },
  ocean_corporate: {
    id: "ocean_corporate",
    name: "Executive Ocean Navy",
    primaryAccent: "#0EA5E9",
    secondaryAccent: "#38BDF8",
    badgeBg: "#0EA5E9",
    badgeTextColor: "#FFFFFF",
    highlightText: "#BAE6FD",
    ctaBg: "#0EA5E9",
    ctaTextColor: "#FFFFFF",
    borderColor: "#0EA5E9",
    bgGradientFrom: "rgba(8, 28, 48, 0.94)",
    bgGradientVia: "rgba(12, 38, 64, 0.88)",
    bgGradientTo: "rgba(3, 12, 24, 0.98)",
  },
  crimson_ruby: {
    id: "crimson_ruby",
    name: "Crimson Ruby & Velvet",
    primaryAccent: "#E11D48",
    secondaryAccent: "#FB7185",
    badgeBg: "#E11D48",
    badgeTextColor: "#FFFFFF",
    highlightText: "#FECDD3",
    ctaBg: "#22C55E",
    ctaTextColor: "#FFFFFF",
    borderColor: "#E11D48",
    bgGradientFrom: "rgba(35, 8, 16, 0.94)",
    bgGradientVia: "rgba(45, 10, 22, 0.86)",
    bgGradientTo: "rgba(15, 3, 7, 0.98)",
  },
  minimal_dark: {
    id: "minimal_dark",
    name: "Minimalist Obsidian",
    primaryAccent: "#E2E8F0",
    secondaryAccent: "#CBD5E1",
    badgeBg: "#334155",
    badgeTextColor: "#F8FAFC",
    highlightText: "#F1F5F9",
    ctaBg: "#FFFFFF",
    ctaTextColor: "#0F172A",
    borderColor: "#475569",
    bgGradientFrom: "rgba(15, 23, 42, 0.96)",
    bgGradientVia: "rgba(24, 32, 47, 0.90)",
    bgGradientTo: "rgba(2, 6, 23, 0.98)",
  },
};

export interface LocalGraphicOptions {
  formatKey?: GraphicDesignFormatKey;
  customWidth?: number;
  customHeight?: number;
  businessName: string;
  category: string;
  tagline?: string;
  logoUrl?: string | null;
  headline: string;
  subheadline?: string;
  priceTag?: string; // e.g. "₦25,000" or "30% OFF"
  badgeText?: string; // e.g. "👑 QUEEN VIP VERIFIED" or "⚡ LIMITED TIME OFFER"
  highlights?: string[];
  ctaText?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  website?: string;
  stockImageUrl?: string;
  themeStyle?: GraphicThemeStyle;
  showWatermark?: boolean;
  showQrCode?: boolean;
}

// Curated stock photos by category keywords
const STOCK_PHOTOS: Record<string, string[]> = {
  fashion: [
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=80",
  ],
  tech: [
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
  ],
  food: [
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80",
  ],
  beauty: [
    "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80",
  ],
  realestate: [
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
  ],
  auto: [
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=1200&q=80",
  ],
  general: [
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80",
  ],
};

export function getStockImageForCategory(category: string): string {
  const cat = (category || "").toLowerCase();
  for (const [k, urls] of Object.entries(STOCK_PHOTOS)) {
    if (cat.includes(k)) {
      return urls[Math.floor(Math.random() * urls.length)];
    }
  }
  return getCategoryImage(category) || STOCK_PHOTOS.general[0];
}

/**
 * Loads an image safely into Canvas context
 */
function loadImageSafely(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      const fallback = new Image();
      fallback.onload = () => resolve(fallback);
      fallback.onerror = () => resolve(null);
      fallback.src = src;
    };
    img.src = src;
  });
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Wraps text into lines that do not exceed maxWidth in canvas
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return [];
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = ctx.measureText(testLine).width;
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Renders a full high-resolution graphic design onto an HTML5 Canvas and returns a PNG Data URL
 */
export async function renderLocalGraphicDesign(
  options: LocalGraphicOptions
): Promise<string> {
  const format = GRAPHIC_FORMATS.find((f) => f.key === options.formatKey) || GRAPHIC_FORMATS[0];
  const width = options.customWidth || format.width;
  const height = options.customHeight || format.height;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const theme = GRAPHIC_THEMES[options.themeStyle || "royal_gold"];
  const isLandscape = width > height;
  const isTall = height > width * 1.4;

  // 1. Background Image
  const stockUrl = options.stockImageUrl || getStockImageForCategory(options.category);
  const bgImage = await loadImageSafely(stockUrl);
  if (bgImage) {
    // Scale image maintaining aspect ratio
    const imgAspect = bgImage.width / bgImage.height;
    const canvasAspect = width / height;
    let renderW = width;
    let renderH = height;
    let offsetX = 0;
    let offsetY = 0;

    if (imgAspect > canvasAspect) {
      renderW = height * imgAspect;
      offsetX = -(renderW - width) / 2;
    } else {
      renderH = width / imgAspect;
      offsetY = -(renderH - height) / 2;
    }

    ctx.drawImage(bgImage, offsetX, offsetY, renderW, renderH);
  } else {
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(0, 0, width, height);
  }

  // 2. Overlay Gradients (Mathematical light suppression for WCAG AAA contrast)
  const overlay = ctx.createLinearGradient(0, 0, 0, height);
  overlay.addColorStop(0, theme.bgGradientFrom);
  overlay.addColorStop(0.45, theme.bgGradientVia);
  overlay.addColorStop(1, theme.bgGradientTo);
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, width, height);

  // 3. Frame Borders with Double Inset Precision
  ctx.save();
  ctx.strokeStyle = theme.borderColor;
  ctx.lineWidth = Math.max(6, Math.round(width * 0.008));
  ctx.strokeRect(18, 18, width - 36, height - 36);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(28, 28, width - 56, height - 56);
  ctx.restore();

  // 4. Top Header & Branding Section
  let curY = Math.max(48, height * 0.05);

  // Top Badge (e.g. "👑 QUEEN VIP VERIFIED")
  const badgeText = options.badgeText || "👑 OFFICIAL BUSINESS SHOWCASE";
  ctx.save();
  ctx.font = "900 13px 'Plus Jakarta Sans', system-ui, sans-serif";
  const badgeMetrics = ctx.measureText(badgeText);
  const badgeW = badgeMetrics.width + 44;
  const badgeH = 36;
  const badgeX = isLandscape ? 50 : (width - badgeW) / 2;

  ctx.fillStyle = theme.badgeBg;
  roundRectPath(ctx, badgeX, curY, badgeW, badgeH, 18);
  ctx.fill();

  ctx.fillStyle = theme.badgeTextColor;
  ctx.textAlign = "center";
  ctx.fillText(badgeText, badgeX + badgeW / 2, curY + 23);
  ctx.restore();

  // Price / Discount Tag if in header for landscape
  if (options.priceTag) {
    ctx.save();
    ctx.font = "900 14px 'Plus Jakarta Sans', system-ui, sans-serif";
    const priceText = options.priceTag.toUpperCase();
    const pW = ctx.measureText(priceText).width + 36;
    const pX = isLandscape ? width - pW - 50 : (width - pW) / 2;
    const pY = isLandscape ? curY : curY + 44;

    ctx.fillStyle = "rgba(34, 197, 94, 0.25)";
    roundRectPath(ctx, pX, pY, pW, 36, 18);
    ctx.fill();
    ctx.strokeStyle = "#22C55E";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#4ADE80";
    ctx.textAlign = "center";
    ctx.fillText(priceText, pX + pW / 2, pY + 23);
    ctx.restore();
    if (!isLandscape) curY += 46;
  }

  curY += 56;

  // 5. Business Logo & Business Name Header
  ctx.save();
  const bizLogo = options.logoUrl ? await loadImageSafely(options.logoUrl) : null;
  const logoSize = Math.max(54, Math.round(width * 0.065));

  if (bizLogo) {
    const logoX = isLandscape ? 50 : width / 2 - (logoSize / 2);
    // Draw white circle backing
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(logoX + logoSize / 2, curY + logoSize / 2, logoSize / 2 + 3, 0, Math.PI * 2);
    ctx.fill();

    // Draw logo inside
    ctx.save();
    ctx.beginPath();
    ctx.arc(logoX + logoSize / 2, curY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(bizLogo, logoX, curY, logoSize, logoSize);
    ctx.restore();

    ctx.strokeStyle = theme.primaryAccent;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(logoX + logoSize / 2, curY + logoSize / 2, logoSize / 2 + 3, 0, Math.PI * 2);
    ctx.stroke();

    curY += logoSize + 16;
  }

  // Business Name
  ctx.font = "bold 20px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = theme.secondaryAccent;
  ctx.textAlign = isLandscape ? "left" : "center";
  const nameX = isLandscape ? 50 : width / 2;
  const bizTitle = (options.businessName || "BETHELIN COVIBE").toUpperCase();
  ctx.fillText(bizTitle, nameX, curY);

  if (options.tagline) {
    curY += 24;
    ctx.font = "600 13px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillStyle = "#94A3B8";
    ctx.fillText(options.tagline.toUpperCase(), nameX, curY);
  }
  ctx.restore();

  curY += Math.max(36, height * 0.04);

  // 6. Primary Main Headline
  ctx.save();
  const headlineFontSize = Math.max(32, Math.min(58, Math.round(width * 0.048)));
  ctx.font = `900 ${headlineFontSize}px 'Plus Jakarta Sans', system-ui, sans-serif`;
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = isLandscape ? "left" : "center";
  ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
  ctx.shadowBlur = 14;

  const maxHeadlineW = isLandscape ? width * 0.58 : width - 120;
  const headlineLines = wrapText(ctx, options.headline || "High Quality Business Service", maxHeadlineW);

  for (const line of headlineLines.slice(0, 3)) {
    ctx.fillText(line, nameX, curY);
    curY += headlineFontSize + 8;
  }
  ctx.restore();

  // 7. Subheadline / Offer Description
  if (options.subheadline) {
    curY += 8;
    ctx.save();
    const subFontSize = Math.max(16, Math.round(width * 0.019));
    ctx.font = `normal ${subFontSize}px 'Plus Jakarta Sans', system-ui, sans-serif`;
    ctx.fillStyle = "#E2E8F0";
    ctx.textAlign = isLandscape ? "left" : "center";

    const subLines = wrapText(ctx, options.subheadline, maxHeadlineW);
    for (const subLine of subLines.slice(0, 2)) {
      ctx.fillText(subLine, nameX, curY);
      curY += subFontSize + 6;
    }
    ctx.restore();
  }

  curY += Math.max(24, height * 0.03);

  // 8. Value Highlights Box / Bullet Points
  const defaultHighlights = [
    "✓ 100% Quality & Satisfaction Guaranteed",
    "✓ Fast Turnaround & Nationwide Support",
    "✓ Direct Order & Verification on WhatsApp",
  ];
  const highlights = (options.highlights && options.highlights.length > 0)
    ? options.highlights
    : defaultHighlights;

  ctx.save();
  const boxW = isLandscape ? width * 0.55 : width - 120;
  const boxH = Math.min(220, highlights.length * 38 + 28);
  const boxX = isLandscape ? 50 : (width - boxW) / 2;

  ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
  roundRectPath(ctx, boxX, curY, boxW, boxH, 16);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1;
  ctx.stroke();

  let hlY = curY + 34;
  for (const hl of highlights.slice(0, isTall ? 5 : 3)) {
    ctx.font = "bold 16px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillStyle = theme.highlightText;
    ctx.textAlign = "left";
    ctx.fillText(hl.startsWith("✓") ? hl : `✓ ${hl}`, boxX + 24, hlY);
    hlY += 36;
  }
  ctx.restore();

  // 9. Bottom Contact & Call-To-Action Box
  const botBoxH = Math.max(160, Math.round(height * 0.22));
  const botBoxY = height - botBoxH - 36;

  ctx.save();
  ctx.fillStyle = "rgba(10, 16, 30, 0.95)";
  roundRectPath(ctx, 48, botBoxY, width - 96, botBoxH, 20);
  ctx.fill();
  ctx.strokeStyle = theme.primaryAccent;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Contact Info
  const phone = options.phone || options.whatsapp || "+234 Lagos Direct";
  const whatsapp = options.whatsapp || options.phone || "";

  let contactY = botBoxY + 36;
  ctx.font = "bold 18px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.fillText(`📞 CALL: ${phone}`, width / 2, contactY);

  if (whatsapp) {
    contactY += 32;
    ctx.fillStyle = "#22C55E";
    ctx.fillText(`💬 WHATSAPP: ${whatsapp}`, width / 2, contactY);
  }

  if (options.address && isTall) {
    contactY += 28;
    ctx.font = "normal 14px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillStyle = "#94A3B8";
    ctx.fillText(`📍 ${options.address}`, width / 2, contactY);
  }

  // CTA Button
  const ctaText = options.ctaText || "ORDER DIRECT ON WHATSAPP";
  const ctaBtnW = Math.min(380, width - 160);
  const ctaBtnH = 48;
  const ctaBtnX = (width - ctaBtnW) / 2;
  const ctaBtnY = botBoxY + botBoxH - ctaBtnH - 18;

  ctx.fillStyle = theme.ctaBg;
  roundRectPath(ctx, ctaBtnX, ctaBtnY, ctaBtnW, ctaBtnH, 24);
  ctx.fill();

  ctx.fillStyle = theme.ctaTextColor;
  ctx.font = "900 15px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(ctaText, width / 2, ctaBtnY + 30);
  ctx.restore();

  return canvas.toDataURL("image/png");
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
      badgeText: "👑 VERIFIED PROFESSIONAL ENTERPRISE",
      ctaText: "CONTACT DIRECTLY ON WHATSAPP",
      highlights: [
        "✓ 100% Certified & Verified Service",
        "✓ Fast Nationwide Delivery & Invoicing",
        "✓ Direct WhatsApp Support 24/7",
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
      badgeText: "👑 QUEEN VIP LUXURY SHOWCASE",
      ctaText: "RESERVE VIP ORDER ON WHATSAPP",
      highlights: [
        "✓ Master Quality Craftsmanship",
        "✓ VIP Express Priority Fulfillment",
        "✓ 100% Satisfaction Guaranteed",
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
      badgeText: "OFFICIAL EXCLUSIVE OFFER",
      subheadline: cur.subheadline ? cur.subheadline.slice(0, 70) : undefined,
      highlights: [
        "✓ Premium Quality Standard",
        "✓ Fast & Seamless Processing",
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

  const nairaMatch = text.match(/(₦\s*[\d,]+|naira\s*[\d,]+)/i);
  if (nairaMatch) {
    options.priceTag = nairaMatch[0].replace(/naira/i, "₦").trim();
  }

  // Phone / WhatsApp detection
  const phoneMatch = text.match(/(\+?234\d{10}|0\d{10})/);
  if (phoneMatch) {
    options.phone = phoneMatch[0];
    options.whatsapp = phoneMatch[0];
  }

  // Category detection
  if (lower.includes("food") || lower.includes("restaurant") || lower.includes("catering") || lower.includes("chef")) {
    options.category = "Food & Catering";
    options.themeStyle = "sunset_vibrant";
  } else if (lower.includes("fashion") || lower.includes("boutique") || lower.includes("cloth") || lower.includes("wear") || lower.includes("luxury")) {
    options.category = "Fashion & Luxury";
    options.themeStyle = "royal_gold";
  } else if (lower.includes("tech") || lower.includes("software") || lower.includes("phone") || lower.includes("gadget") || lower.includes("crypto")) {
    options.category = "Tech & Gadgets";
    options.themeStyle = "cyber_tech";
  } else if (lower.includes("beauty") || lower.includes("hair") || lower.includes("spa") || lower.includes("salon") || lower.includes("makeup")) {
    options.category = "Beauty & Cosmetics";
    options.themeStyle = "crimson_ruby";
  } else if (lower.includes("real estate") || lower.includes("property") || lower.includes("house") || lower.includes("apartment")) {
    options.category = "Real Estate";
    options.themeStyle = "emerald_luxury";
  }

  return options;
}
