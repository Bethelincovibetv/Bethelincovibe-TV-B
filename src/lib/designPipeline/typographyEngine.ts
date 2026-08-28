import { FontPairingKey, FontPairingConfig } from "./types";

export const FONT_PAIRINGS: Record<FontPairingKey, FontPairingConfig> = {
  royal_prestige: {
    key: "royal_prestige",
    name: "Royal Prestige (Cinzel & Jakarta)",
    displayFont: "'Cinzel', Georgia, serif",
    bodyFont: "'Plus Jakarta Sans', system-ui, sans-serif",
    headlineStyle: "normal",
    headlineWeight: "900",
    bodyWeight: "600",
    letterSpacing: 0.04,
    description: "Prestige luxury serif for high-status, royalty, real estate and gala events",
  },
  modern_commercial: {
    key: "modern_commercial",
    name: "Modern Commercial (Plus Jakarta Sans)",
    displayFont: "'Plus Jakarta Sans', system-ui, sans-serif",
    bodyFont: "'Plus Jakarta Sans', system-ui, sans-serif",
    headlineStyle: "normal",
    headlineWeight: "900",
    bodyWeight: "500",
    letterSpacing: -0.02,
    description: "Versatile, ultra-crisp modern geometric sans pairing with perfect legibility",
  },
  editorial_vogue: {
    key: "editorial_vogue",
    name: "Editorial Vogue (Playfair & Montserrat)",
    displayFont: "'Playfair Display', Georgia, serif",
    bodyFont: "'Montserrat', system-ui, sans-serif",
    headlineStyle: "italic",
    headlineWeight: "800",
    bodyWeight: "600",
    letterSpacing: 0.02,
    description: "Vogue magazine cover aesthetic for fashion boutiques, cosmetics, luxury salons",
  },
  high_impact_retail: {
    key: "high_impact_retail",
    name: "High-Impact Retail (Montserrat & Outfit)",
    displayFont: "'Montserrat', system-ui, sans-serif",
    bodyFont: "'Outfit', system-ui, sans-serif",
    headlineStyle: "normal",
    headlineWeight: "900",
    bodyWeight: "600",
    letterSpacing: -0.01,
    description: "Punchy heavyweight typographic system for sales, promotions, tech and discounts",
  },
  tech_forward: {
    key: "tech_forward",
    name: "Tech Forward (Syne & Jakarta)",
    displayFont: "'Syne', sans-serif",
    bodyFont: "'Plus Jakarta Sans', system-ui, sans-serif",
    headlineStyle: "normal",
    headlineWeight: "800",
    bodyWeight: "500",
    letterSpacing: -0.01,
    description: "Cutting-edge modern architectural sans for tech startups, gadgets, solar & innovation",
  },
  clean_minimalist: {
    key: "clean_minimalist",
    name: "Clean Minimalist (Outfit & Outfit)",
    displayFont: "'Outfit', system-ui, sans-serif",
    bodyFont: "'Outfit', system-ui, sans-serif",
    headlineStyle: "normal",
    headlineWeight: "700",
    bodyWeight: "400",
    letterSpacing: 0.01,
    description: "Refined Scandinavian-inspired minimalism with balanced negative space",
  },
  gourmet_bistro: {
    key: "gourmet_bistro",
    name: "Gourmet Bistro (Playfair & Jakarta)",
    displayFont: "'Playfair Display', Georgia, serif",
    bodyFont: "'Plus Jakarta Sans', system-ui, sans-serif",
    headlineStyle: "normal",
    headlineWeight: "700",
    bodyWeight: "500",
    letterSpacing: 0.01,
    description: "Warm artisanal serif for restaurants, catering, bakeries and lounge menus",
  },
  corporate_trust: {
    key: "corporate_trust",
    name: "Corporate Trust (Jakarta & Montserrat)",
    displayFont: "'Plus Jakarta Sans', system-ui, sans-serif",
    bodyFont: "'Montserrat', system-ui, sans-serif",
    headlineStyle: "normal",
    headlineWeight: "800",
    bodyWeight: "500",
    letterSpacing: 0.0,
    description: "Authoritative, trustworthy typography for legal, finance, logistics & consulting",
  },
};

/**
 * Wraps text into lines that do not exceed maxWidth in canvas with orphan word prevention
 */
export function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number = 4
): string[] {
  if (!text) return [];
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = ctx.measureText(testLine).width;

    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      if (lines.length === maxLines - 1 && i < words.length - 1) {
        // Last line: append remaining words
        const remaining = words.slice(i).join(" ");
        lines.push(remaining);
        break;
      }
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Calculates optimal font size for headline using iterative measurement so it fits
 * within given width & height budget with zero clipping or awkward breaks
 */
export function calculateOptimalFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontFamily: string,
  weight: string,
  style: string,
  maxWidth: number,
  maxHeight: number,
  initialSize: number,
  minSize: number = 24
): { fontSize: number; lines: string[] } {
  let size = initialSize;
  let lines: string[] = [];

  while (size >= minSize) {
    ctx.font = `${style === "italic" ? "italic " : ""}${weight} ${size}px ${fontFamily}`;
    lines = wrapCanvasText(ctx, text, maxWidth, 3);
    const lineHeight = size * 1.15;
    const totalHeight = lines.length * lineHeight;

    if (totalHeight <= maxHeight) {
      return { fontSize: size, lines };
    }
    size -= 2;
  }

  return { fontSize: minSize, lines };
}
