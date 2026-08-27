import { supabase } from "@/integrations/supabase/client";
import { getCategoryImage } from "@/lib/categoryImages";
import { CURATED_SERVICE_GRAPHICS } from "@/lib/serviceGraphicEngine";

export interface QueenGraphicOptions {
  businessName: string;
  category: string;
  headline: string;
  subheadline?: string;
  tagline?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  website?: string;
  ctaText?: string;
  badgeText?: string;
  stockImageUrl?: string;
  themeStyle?: "royal_gold" | "cyber_tech" | "emerald_luxury" | "sunset_vibrant" | "ocean_corporate";
  highlights?: string[];
  serviceTitle?: string;
  servicePrice?: string;
}

// Curated high-res background images by category keywords
const CATEGORY_STOCK_MAP: Record<string, string[]> = {
  fashion: [
    "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80",
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

export function getCategoryStockImage(category: string): string {
  const cat = (category || "").toLowerCase();
  for (const [k, urls] of Object.entries(CATEGORY_STOCK_MAP)) {
    if (cat.includes(k)) {
      return urls[Math.floor(Math.random() * urls.length)];
    }
  }
  return getCategoryImage(category) || CATEGORY_STOCK_MAP.general[0];
}

/**
 * Loads an image safely for Canvas rendering with crossOrigin support.
 * Returns null if the image fails or encounters CORS errors.
 */
function loadImageSafe(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Retry without anonymous in case server rejects CORS headers
      const fallbackImg = new Image();
      fallbackImg.onload = () => resolve(fallbackImg);
      fallbackImg.onerror = () => resolve(null);
      fallbackImg.src = src;
    };
    img.src = src;
  });
}

function roundRect(
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
 * AI Graphic Designer: Generates a high-converting, professional commercial Display Banner (1200x630).
 * Features rich visual typography, stock background photography, overlay gradients,
 * 👑 Queen VIP gold badge, headline, real contact numbers, WhatsApp badges, and CTA button.
 */
export async function renderQueenBannerGraphic(
  options: QueenGraphicOptions
): Promise<string> {
  const width = 1200;
  const height = 630;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const theme = options.themeStyle || "royal_gold";
  const stockUrl = options.stockImageUrl || getCategoryStockImage(options.category);

  // 1. Draw Background Image
  const bgImage = await loadImageSafe(stockUrl);
  if (bgImage) {
    // Draw cover
    const imgAspect = bgImage.width / bgImage.height;
    const canvasAspect = width / height;
    let sx = 0, sy = 0, sWidth = bgImage.width, sHeight = bgImage.height;

    if (imgAspect > canvasAspect) {
      sWidth = bgImage.height * canvasAspect;
      sx = (bgImage.width - sWidth) / 2;
    } else {
      sHeight = bgImage.width / canvasAspect;
      sy = (bgImage.height - sHeight) / 2;
    }
    ctx.drawImage(bgImage, sx, sy, sWidth, sHeight, 0, 0, width, height);
  } else {
    // Fallback deep dark background
    ctx.fillStyle = "#0B0F19";
    ctx.fillRect(0, 0, width, height);
  }

  // 2. Overlay Gradients & Vignette for maximum text readability and 3D feel
  const overlayGrad = ctx.createLinearGradient(0, 0, width, 0);
  if (theme === "royal_gold") {
    overlayGrad.addColorStop(0, "rgba(10, 10, 15, 0.96)");
    overlayGrad.addColorStop(0.55, "rgba(18, 14, 25, 0.88)");
    overlayGrad.addColorStop(1, "rgba(10, 10, 15, 0.65)");
  } else if (theme === "emerald_luxury") {
    overlayGrad.addColorStop(0, "rgba(6, 30, 20, 0.96)");
    overlayGrad.addColorStop(0.55, "rgba(4, 24, 18, 0.88)");
    overlayGrad.addColorStop(1, "rgba(2, 16, 12, 0.65)");
  } else if (theme === "cyber_tech") {
    overlayGrad.addColorStop(0, "rgba(10, 15, 35, 0.96)");
    overlayGrad.addColorStop(0.55, "rgba(15, 23, 42, 0.88)");
    overlayGrad.addColorStop(1, "rgba(15, 23, 42, 0.65)");
  } else {
    overlayGrad.addColorStop(0, "rgba(15, 23, 42, 0.96)");
    overlayGrad.addColorStop(0.55, "rgba(15, 23, 42, 0.88)");
    overlayGrad.addColorStop(1, "rgba(15, 23, 42, 0.65)");
  }
  ctx.fillStyle = overlayGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle bottom/top border glow
  const borderGrad = ctx.createLinearGradient(0, 0, width, 0);
  borderGrad.addColorStop(0, "#F59E0B");
  borderGrad.addColorStop(0.5, "#FCD34D");
  borderGrad.addColorStop(1, "#D97706");
  ctx.fillStyle = borderGrad;
  ctx.fillRect(0, 0, width, 8);
  ctx.fillRect(0, height - 8, width, 8);

  // Decorative Accent Geometric Lines
  ctx.save();
  ctx.strokeStyle = "rgba(245, 158, 11, 0.18)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(40, 100);
  ctx.lineTo(1160, 100);
  ctx.moveTo(40, height - 120);
  ctx.lineTo(1160, height - 120);
  ctx.stroke();
  ctx.restore();

  // 3. Top Crown VIP Badge
  const badgeY = 42;
  const badgeText = options.badgeText || "👑 QUEEN VIP VERIFIED • BETHELINCOVIBE TV PREMIER BUSINESS";
  ctx.save();
  ctx.font = "bold 13px 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
  const badgeWidth = ctx.measureText(badgeText).width + 36;
  
  // Badge background pill
  const badgeBg = ctx.createLinearGradient(50, badgeY, 50 + badgeWidth, badgeY);
  badgeBg.addColorStop(0, "rgba(245, 158, 11, 0.35)");
  badgeBg.addColorStop(1, "rgba(217, 119, 6, 0.25)");
  ctx.fillStyle = badgeBg;
  roundRect(ctx, 50, badgeY - 14, badgeWidth, 28, 14);
  ctx.fill();

  ctx.strokeStyle = "rgba(245, 158, 11, 0.75)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "#FEF3C7";
  ctx.fillText(badgeText, 68, badgeY + 4);
  ctx.restore();

  // Category Tag (Right side)
  ctx.save();
  ctx.font = "bold 12px 'Plus Jakarta Sans', sans-serif";
  const catText = `SECTOR: ${(options.category || "COMMERCIAL").toUpperCase()}`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.textAlign = "right";
  ctx.fillText(catText, width - 60, badgeY + 4);
  ctx.restore();

  // 4. Business Name (Large Display Typography)
  ctx.save();
  ctx.font = "900 46px 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  
  // Wrap or truncate business name if too long
  let bizTitle = options.businessName || "Commercial Business";
  if (bizTitle.length > 38) bizTitle = bizTitle.slice(0, 35) + "...";
  ctx.fillText(bizTitle, 50, 160);
  ctx.restore();

  // 5. Headline / Value Offer Hook (Amber / Golden Gradient)
  ctx.save();
  ctx.font = "bold 26px 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
  const headGrad = ctx.createLinearGradient(50, 200, 800, 200);
  headGrad.addColorStop(0, "#FBBF24");
  headGrad.addColorStop(1, "#F3F4F6");
  ctx.fillStyle = headGrad;
  
  let headlineText = options.headline || `Top Rated ${options.category} in Lagos & Nigeria`;
  if (headlineText.length > 60) headlineText = headlineText.slice(0, 58) + "...";
  ctx.fillText(headlineText, 50, 210);
  ctx.restore();

  // 6. Subheadline / Tagline (Crisp White/Gray)
  if (options.subheadline || options.tagline) {
    ctx.save();
    ctx.font = "500 18px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "#E2E8F0";
    const subText = options.subheadline || options.tagline || "";
    // Wrap to 2 lines if needed
    const words = subText.split(" ");
    let line1 = "", line2 = "";
    for (const w of words) {
      if ((line1 + w).length < 65) line1 += w + " ";
      else if ((line2 + w).length < 65) line2 += w + " ";
    }
    ctx.fillText(line1.trim(), 50, 252);
    if (line2.trim()) ctx.fillText(line2.trim(), 50, 280);
    ctx.restore();
  }

  // 7. Trust Highlight Badges (3 Feature Chips)
  const highlights = options.highlights || [
    "✓ 100% Verified Quality",
    "✓ Nationwide Doorstep Dispatch",
    "✓ Direct WhatsApp Order Support",
  ];

  ctx.save();
  ctx.font = "bold 13px 'Plus Jakarta Sans', sans-serif";
  let chipX = 50;
  const chipY = 340;
  for (const hText of highlights.slice(0, 3)) {
    const chipWidth = ctx.measureText(hText).width + 24;
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    roundRect(ctx, chipX, chipY - 14, chipWidth, 28, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#FDE68A";
    ctx.fillText(hText, chipX + 12, chipY + 4);
    chipX += chipWidth + 14;
  }
  ctx.restore();

  // 8. Bottom Commercial Contact Details & CTA Container Card
  const boxY = height - 105;
  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
  roundRect(ctx, 40, boxY, width - 80, 80, 16);
  ctx.fill();
  ctx.strokeStyle = "rgba(245, 158, 11, 0.5)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Contact Items inside Bottom Card
  const phone = options.phone || options.whatsapp || "+234 Lagos Direct";
  const address = options.address || "Lagos, Nigeria";
  const whatsapp = options.whatsapp || options.phone || "";

  // Contact Icon & Text 1: Phone
  ctx.font = "bold 15px 'Plus Jakarta Sans', sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(`📞  ${phone}`, 65, boxY + 34);

  // Contact Icon & Text 2: Address
  ctx.font = "normal 13px 'Plus Jakarta Sans', sans-serif";
  ctx.fillStyle = "#94A3B8";
  let shortAddr = address;
  if (shortAddr.length > 35) shortAddr = shortAddr.slice(0, 32) + "...";
  ctx.fillText(`📍  ${shortAddr}`, 65, boxY + 60);

  // Contact Icon & Text 3: WhatsApp
  if (whatsapp) {
    ctx.font = "bold 14px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "#22C55E";
    ctx.fillText(`💬 WhatsApp: ${whatsapp}`, 420, boxY + 34);
    ctx.font = "normal 12px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "#CBD5E1";
    ctx.fillText(`👑 Queen VIP Verified Merchant`, 420, boxY + 60);
  }

  // CTA Button (Right Aligned inside Bottom Bar)
  const ctaBtnText = (options.ctaText || "👉 CONNECT ON WHATSAPP").toUpperCase();
  ctx.font = "900 14px 'Plus Jakarta Sans', sans-serif";
  const ctaWidth = ctx.measureText(ctaBtnText).width + 36;
  const ctaX = width - 70 - ctaWidth;
  const ctaY = boxY + 18;

  const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaWidth, ctaY + 44);
  ctaGrad.addColorStop(0, "#22C55E");
  ctaGrad.addColorStop(1, "#16A34A");
  ctx.fillStyle = ctaGrad;
  roundRect(ctx, ctaX, ctaY, ctaWidth, 44, 22);
  ctx.fill();

  ctx.shadowColor = "rgba(34, 197, 94, 0.4)";
  ctx.shadowBlur = 10;
  ctx.strokeStyle = "#86EFAC";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.fillText(ctaBtnText, ctaX + ctaWidth / 2, ctaY + 27);
  ctx.restore();

  // Watermark Seal (Top Right)
  ctx.save();
  ctx.font = "900 11px 'Plus Jakarta Sans', sans-serif";
  ctx.fillStyle = "rgba(245, 158, 11, 0.6)";
  ctx.textAlign = "right";
  ctx.fillText("BETHELINCOVIBE TV • OFFICIAL MERCHANT CREATIVE", width - 60, height - 128);
  ctx.restore();

  return canvas.toDataURL("image/png");
}

/**
 * AI Graphic Designer: Generates a high-converting Social / WhatsApp Flyer (1080x1080).
 */
export async function renderQueenServiceFlyerGraphic(
  options: QueenGraphicOptions
): Promise<string> {
  const size = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const stockUrl = options.stockImageUrl || getCategoryStockImage(options.category);

  // Background Image
  const bgImage = await loadImageSafe(stockUrl);
  if (bgImage) {
    ctx.drawImage(bgImage, 0, 0, size, size);
  } else {
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(0, 0, size, size);
  }

  // Dark Luxury Overlay
  const overlay = ctx.createLinearGradient(0, 0, 0, size);
  overlay.addColorStop(0, "rgba(10, 15, 28, 0.92)");
  overlay.addColorStop(0.45, "rgba(15, 23, 42, 0.85)");
  overlay.addColorStop(1, "rgba(6, 10, 20, 0.96)");
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, size, size);

  // Frame Borders
  ctx.strokeStyle = "#F59E0B";
  ctx.lineWidth = 10;
  ctx.strokeRect(20, 20, size - 40, size - 40);

  // Top Crown Pill
  ctx.save();
  ctx.fillStyle = "#F59E0B";
  roundRect(ctx, size / 2 - 180, 50, 360, 44, 22);
  ctx.fill();
  ctx.fillStyle = "#000000";
  ctx.font = "900 14px 'Plus Jakarta Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("👑 QUEEN VIP VERIFIED SERVICE", size / 2, 77);
  ctx.restore();

  // Business Name
  ctx.save();
  ctx.font = "900 48px 'Plus Jakarta Sans', sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 10;
  ctx.fillText(options.businessName, size / 2, 160);
  ctx.restore();

  // Service Title
  if (options.serviceTitle) {
    ctx.save();
    ctx.font = "bold 32px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "#FBBF24";
    ctx.textAlign = "center";
    ctx.fillText(options.serviceTitle, size / 2, 220);
    ctx.restore();
  }

  // Price Badge
  if (options.servicePrice) {
    ctx.save();
    ctx.fillStyle = "rgba(34, 197, 94, 0.2)";
    roundRect(ctx, size / 2 - 140, 250, 280, 54, 27);
    ctx.fill();
    ctx.strokeStyle = "#22C55E";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = "900 28px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "#4ADE80";
    ctx.textAlign = "center";
    ctx.fillText(options.servicePrice, size / 2, 287);
    ctx.restore();
  }

  // Headline & Subheadline in center card
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
  roundRect(ctx, 80, 340, size - 160, 360, 24);
  ctx.fill();
  ctx.strokeStyle = "rgba(245, 158, 11, 0.3)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = "bold 24px 'Plus Jakarta Sans', sans-serif";
  ctx.fillStyle = "#FEF3C7";
  ctx.textAlign = "center";
  ctx.fillText(options.headline || "Premium Commercial Offering", size / 2, 390);

  if (options.subheadline) {
    ctx.font = "normal 18px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "#CBD5E1";
    ctx.fillText(options.subheadline.slice(0, 60), size / 2, 430);
  }

  // Highlights
  const highlights = options.highlights || [
    "✓ 100% Quality Guaranteed",
    "✓ Rapid Nationwide Delivery",
    "✓ Official Invoice & Order Protection",
  ];
  let hY = 480;
  for (const h of highlights) {
    ctx.font = "bold 18px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "#FDE68A";
    ctx.fillText(h, size / 2, hY);
    hY += 40;
  }
  ctx.restore();

  // Bottom Contact Box
  const botY = 740;
  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
  roundRect(ctx, 80, botY, size - 160, 240, 20);
  ctx.fill();
  ctx.strokeStyle = "#F59E0B";
  ctx.lineWidth = 2;
  ctx.stroke();

  const phone = options.phone || options.whatsapp || "+234 Lagos";
  const whatsapp = options.whatsapp || options.phone || "";

  ctx.font = "bold 22px 'Plus Jakarta Sans', sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.fillText(`📞 CALL: ${phone}`, size / 2, botY + 50);

  if (whatsapp) {
    ctx.fillStyle = "#22C55E";
    ctx.fillText(`💬 WHATSAPP: ${whatsapp}`, size / 2, botY + 95);
  }

  if (options.address) {
    ctx.font = "normal 16px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "#94A3B8";
    ctx.fillText(`📍 ${options.address}`, size / 2, botY + 135);
  }

  // CTA
  ctx.fillStyle = "#F59E0B";
  roundRect(ctx, size / 2 - 160, botY + 160, 320, 52, 26);
  ctx.fill();
  ctx.fillStyle = "#000000";
  ctx.font = "900 16px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("ORDER DIRECT ON WHATSAPP", size / 2, botY + 192);
  ctx.restore();

  return canvas.toDataURL("image/png");
}

/**
 * Uploads a base64 Data URL to Supabase storage bucket, or falls back to returning the Data URL.
 */
export async function uploadGraphicCreativeToStorage(
  dataUrl: string,
  fileNamePrefix: string,
  businessId: string
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith("data:image")) return dataUrl;

  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const fileName = `${fileNamePrefix}_${businessId}_${Date.now()}.png`;
    const path = `queen_creatives/${fileName}`;

    const { error } = await supabase.storage
      .from("supplier-logos")
      .upload(path, blob, {
        contentType: "image/png",
        upsert: true,
      });

    if (!error) {
      const { data } = supabase.storage.from("supplier-logos").getPublicUrl(path);
      if (data?.publicUrl) return data.publicUrl;
    }
  } catch (err) {
    console.warn("Storage upload fallback to Data URL:", err);
  }

  return dataUrl;
}
