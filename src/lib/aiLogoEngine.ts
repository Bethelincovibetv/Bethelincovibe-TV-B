import { getGeminiClient } from "./aiCollaborationEngine";

export type LogoType = "all" | "wordmark" | "lettermark" | "combination" | "dimensional_3d";
export type LogoArchetype = "all" | "wordmark" | "lettermark" | "combination" | "dimensional_3d" | "luxury" | "modern_tech" | "monogram" | "minimal" | "commerce" | "crest";
export type LogoShape = "circle" | "rounded_square" | "shield" | "hexagon" | "diamond" | "octagon";

export interface LogoColorPalette {
  id: string;
  name: string;
  gradientFrom: string;
  gradientVia?: string;
  gradientTo: string;
  accent: string;
  textColor: string;
  badgeBg: string;
  isDark: boolean;
}

export const LOGO_PALETTES: LogoColorPalette[] = [
  {
    id: "royal_gold",
    name: "Royal 3D Gold",
    gradientFrom: "#D4AF37",
    gradientVia: "#F3E5AB",
    gradientTo: "#AA771C",
    accent: "#FFE082",
    textColor: "#FFFFFF",
    badgeBg: "#0F172A",
    isDark: true,
  },
  {
    id: "purple_aurora",
    name: "Purple Aurora",
    gradientFrom: "#7928CA",
    gradientVia: "#9333EA",
    gradientTo: "#FF0080",
    accent: "#F472B6",
    textColor: "#FFFFFF",
    badgeBg: "#0F172A",
    isDark: true,
  },
  {
    id: "electric_emerald",
    name: "Electric Emerald",
    gradientFrom: "#059669",
    gradientVia: "#10B981",
    gradientTo: "#065F46",
    accent: "#34D399",
    textColor: "#FFFFFF",
    badgeBg: "#064E3B",
    isDark: true,
  },
  {
    id: "sapphire_blue",
    name: "Sapphire Tech",
    gradientFrom: "#2563EB",
    gradientVia: "#3B82F6",
    gradientTo: "#1E40AF",
    accent: "#60A5FA",
    textColor: "#FFFFFF",
    badgeBg: "#0B192C",
    isDark: true,
  },
  {
    id: "sunset_blaze",
    name: "Sunset Blaze",
    gradientFrom: "#EA580C",
    gradientVia: "#F97316",
    gradientTo: "#C2410C",
    accent: "#FDBA74",
    textColor: "#FFFFFF",
    badgeBg: "#1C1917",
    isDark: true,
  },
  {
    id: "crimson_ruby",
    name: "Crimson Ruby",
    gradientFrom: "#E11D48",
    gradientVia: "#F43F5E",
    gradientTo: "#881337",
    accent: "#FDA4AF",
    textColor: "#FFFFFF",
    badgeBg: "#18181B",
    isDark: true,
  },
  {
    id: "obsidian_silver",
    name: "Obsidian Platinum",
    gradientFrom: "#E2E8F0",
    gradientVia: "#94A3B8",
    gradientTo: "#475569",
    accent: "#F8FAFC",
    textColor: "#0F172A",
    badgeBg: "#0F172A",
    isDark: true,
  },
  {
    id: "clean_light",
    name: "Minimalist Light",
    gradientFrom: "#2563EB",
    gradientVia: "#4F46E5",
    gradientTo: "#7C3AED",
    accent: "#1D4ED8",
    textColor: "#0F172A",
    badgeBg: "#F8FAFC",
    isDark: false,
  },
];

export interface GeneratedLogoItem {
  id: string;
  businessName: string;
  tagline?: string;
  initials: string;
  symbol: string;
  palette: LogoColorPalette;
  shape: LogoShape;
  logoType: LogoType;
  archetype: LogoArchetype;
  svgMarkup: string;
  dataUrl?: string;
}

export interface AILogoGeneratorOptions {
  businessName: string;
  category?: string;
  tagline?: string;
  preferredPaletteId?: string;
  logoType?: LogoType;
  archetype?: LogoArchetype;
  shape?: LogoShape;
  initials?: string;
}

// Icon symbols map with clean SVG paths
export const LOGO_SYMBOLS: Record<string, { name: string; path: string; category?: string }> = {
  crown: {
    name: "Royal Crown",
    path: "M2 4l3 12h14l3-12-6 7-4-11-4 11-6-7z",
  },
  diamond: {
    name: "Luxury Diamond",
    path: "M6 2L2 8l10 14L22 8l-4-6H6zm1.5 2h9l2.7 4H4.8l2.7-4z",
  },
  shield: {
    name: "Verified Shield",
    path: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  },
  rocket: {
    name: "Growth Rocket",
    path: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z",
  },
  sparkles: {
    name: "Sparkles / Star",
    path: "M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z",
  },
  cart: {
    name: "Marketplace / Cart",
    path: "M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3.8 6h16.4M16 10a4 4 0 0 1-8 0",
  },
  bolt: {
    name: "Electric Energy",
    path: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  },
  building: {
    name: "Enterprise / Tower",
    path: "M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M9 9h1M9 13h1M9 17h1M14 9h1M14 13h1M14 17h1",
  },
  target: {
    name: "Precision Target",
    path: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-4a6 6 0 1 0 0-12 6 6 0 0 0 0 12zm0-4a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  },
  cube: {
    name: "3D Isometric Cube",
    path: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12",
  },
  globe: {
    name: "Global Network",
    path: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 0c2.5 0 4.5 4.5 4.5 10s-2 10-4.5 10-4.5-4.5-4.5-10 2-10 4.5-10zM2 12h20",
  },
  infinity: {
    name: "Infinity / Scale",
    path: "M18.18 8.18A5.5 5.5 0 0 0 12 12a5.5 5.5 0 0 0-6.18-3.82 5.5 5.5 0 1 0 0 7.64A5.5 5.5 0 0 0 12 12a5.5 5.5 0 0 0 6.18 3.82 5.5 5.5 0 1 0 0-7.64z",
  },
};

/**
 * Extracts clean 1-3 letter initials from a business name
 */
export function extractInitials(name: string): string {
  if (!name) return "BV";
  const cleaned = name.replace(/[^a-zA-Z0-9\s]/g, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "BV";
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (parts.length === 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (parts[0][0] + parts[1][0] + parts[2][0]).slice(0, 3).toUpperCase();
}

/**
 * Generates an ultra-crisp, professional SVG markup string supporting:
 * - Wordmark logos (text-based)
 * - Lettermark logos (initials/monogram)
 * - Icon + text combination logos
 * - 3D-styled / dimensional logo renders
 */
export function buildLogoSvgMarkup({
  businessName,
  tagline,
  initials,
  symbolKey,
  palette,
  shape = "rounded_square",
  logoType = "combination",
  archetype = "luxury",
  size = 512,
}: {
  businessName: string;
  tagline?: string;
  initials: string;
  symbolKey: string;
  palette: LogoColorPalette;
  shape?: LogoShape;
  logoType?: LogoType;
  archetype?: LogoArchetype;
  size?: number;
}): string {
  const sym = LOGO_SYMBOLS[symbolKey] || LOGO_SYMBOLS.crown;
  const rnd = Math.random().toString(36).substring(2, 7);
  const gradientId = `grad-${palette.id}-${rnd}`;
  const bevelGradId = `bevel-${palette.id}-${rnd}`;
  const filterId = `glow-${rnd}`;
  const shadowFilterId = `shadow-3d-${rnd}`;
  const cleanInitials = (initials || extractInitials(businessName)).toUpperCase();
  const displayTagline = (tagline || "OFFICIAL BRAND").toUpperCase();
  const cleanName = (businessName || "BETHELIN").trim();

  // Outer container path based on shape
  let shapePath = "";
  if (shape === "circle") {
    shapePath = `<circle cx="256" cy="256" r="236" fill="${palette.badgeBg}" stroke="url(#${gradientId})" stroke-width="7" />
      <circle cx="256" cy="256" r="216" fill="none" stroke="url(#${gradientId})" stroke-width="2" stroke-dasharray="8 6" opacity="0.5" />`;
  } else if (shape === "shield") {
    shapePath = `<path d="M256 24 L460 74 V260 C460 380 256 488 256 488 C256 488 52 380 52 260 V74 Z" fill="${palette.badgeBg}" stroke="url(#${gradientId})" stroke-width="7" stroke-linejoin="round" />
      <path d="M256 44 L440 88 V255 C440 365 256 465 256 465 C256 465 72 365 72 255 V88 Z" fill="none" stroke="url(#${gradientId})" stroke-width="2" opacity="0.4" stroke-dasharray="6 6" />`;
  } else if (shape === "hexagon") {
    shapePath = `<polygon points="256,24 466,140 466,372 256,488 46,372 46,140" fill="${palette.badgeBg}" stroke="url(#${gradientId})" stroke-width="7" stroke-linejoin="round" />
      <polygon points="256,44 446,150 446,362 256,468 66,362 66,150" fill="none" stroke="url(#${gradientId})" stroke-width="2" opacity="0.4" />`;
  } else if (shape === "diamond") {
    shapePath = `<polygon points="256,24 488,256 256,488 24,256" fill="${palette.badgeBg}" stroke="url(#${gradientId})" stroke-width="7" stroke-linejoin="round" />
      <polygon points="256,48 464,256 256,464 48,256" fill="none" stroke="url(#${gradientId})" stroke-width="2" opacity="0.4" />`;
  } else if (shape === "octagon") {
    shapePath = `<polygon points="120,24 392,24 488,120 488,392 392,488 120,488 24,392 24,120" fill="${palette.badgeBg}" stroke="url(#${gradientId})" stroke-width="7" stroke-linejoin="round" />
      <polygon points="128,44 384,44 468,128 468,384 384,468 128,468 44,384 44,128" fill="none" stroke="url(#${gradientId})" stroke-width="2" opacity="0.4" />`;
  } else {
    // rounded square default
    shapePath = `<rect x="24" y="24" width="464" height="464" rx="84" fill="${palette.badgeBg}" stroke="url(#${gradientId})" stroke-width="7" />
      <rect x="44" y="44" width="424" height="424" rx="68" fill="none" stroke="url(#${gradientId})" stroke-width="2" opacity="0.4" stroke-dasharray="8 6" />`;
  }

  // Choose layout based on logoType or archetype
  let interiorMarkup = "";
  const resolvedType = (logoType && logoType !== "all") ? logoType : (archetype === "monogram" ? "lettermark" : archetype === "minimal" ? "wordmark" : "combination");

  // 1. WORDMARK LOGO (Text-based, elegant typography, optical kerning, no icon)
  if (resolvedType === "wordmark") {
    const fontSize = cleanName.length > 12 ? 38 : cleanName.length > 8 ? 48 : 58;
    interiorMarkup = `
      <!-- Wordmark Layout (Text-Based) -->
      <g id="wordmark-container">
        <!-- Subtle Top & Bottom Minimal Lines -->
        <line x1="120" y1="170" x2="392" y2="170" stroke="url(#${gradientId})" stroke-width="2.5" opacity="0.6" />
        <circle cx="256" cy="170" r="5" fill="url(#${gradientId})" />
        
        <!-- Main Brand Wordmark Text -->
        <text x="256" y="250" font-family="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" font-weight="900" font-size="${fontSize}" fill="url(#${gradientId})" text-anchor="middle" letter-spacing="3" textLength="340" lengthAdjust="spacingAndGlyphs">
          ${cleanName.toUpperCase()}
        </text>

        <!-- Divider Line with Diamond Center -->
        <line x1="100" y1="285" x2="236" y2="285" stroke="url(#${gradientId})" stroke-width="2" opacity="0.8" />
        <polygon points="256,279 262,285 256,291 250,285" fill="${palette.accent}" />
        <line x1="276" y1="285" x2="412" y2="285" stroke="url(#${gradientId})" stroke-width="2" opacity="0.8" />

        <!-- Tagline / Slogan -->
        <text x="256" y="325" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="16" fill="${palette.accent}" text-anchor="middle" letter-spacing="6">
          ${displayTagline.slice(0, 22)}
        </text>

        <!-- Quality Seal Pill -->
        <rect x="156" y="360" width="200" height="32" rx="16" fill="url(#${gradientId})" opacity="0.2" stroke="url(#${gradientId})" stroke-width="1.5" />
        <text x="256" y="381" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="12" fill="url(#${gradientId})" text-anchor="middle" letter-spacing="4">
          ★ VERIFIED BRAND ★
        </text>
      </g>
    `;
  }
  // 2. LETTERMARK LOGO (Initials / Monogram focused, 1-3 letters)
  else if (resolvedType === "lettermark" || archetype === "monogram") {
    const monogramSize = cleanInitials.length === 1 ? 140 : cleanInitials.length === 2 ? 116 : 94;
    interiorMarkup = `
      <!-- Lettermark / Monogram Layout -->
      <g id="lettermark-container">
        <!-- Center Geometric Accent Halo -->
        <circle cx="256" cy="220" r="105" fill="none" stroke="url(#${gradientId})" stroke-width="3" opacity="0.4" />
        <circle cx="256" cy="220" r="95" fill="url(#${gradientId})" opacity="0.12" />
        
        <!-- Prominent Monogram Letters -->
        <text x="256" y="${cleanInitials.length === 1 ? 270 : 262}" font-family="Georgia, serif" font-weight="900" font-size="${monogramSize}" fill="url(#${gradientId})" text-anchor="middle" letter-spacing="${cleanInitials.length > 1 ? '4' : '0'}" filter="url(#${shadowFilterId})">
          ${cleanInitials}
        </text>

        <!-- Dynamic Monogram Underline Bracket -->
        <path d="M 160 295 L 256 315 L 352 295" fill="none" stroke="url(#${gradientId})" stroke-width="3" stroke-linecap="round" />

        <!-- Subtitle Brand Name -->
        <text x="256" y="355" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-weight="900" font-size="18" fill="${palette.textColor}" text-anchor="middle" letter-spacing="4">
          ${(cleanName.length > 16 ? cleanName.slice(0, 16) : cleanName).toUpperCase()}
        </text>

        <text x="256" y="390" font-family="system-ui, sans-serif" font-weight="800" font-size="13" fill="${palette.accent}" text-anchor="middle" letter-spacing="6">
          ${displayTagline.slice(0, 18)}
        </text>
      </g>
    `;
  }
  // 3. 3D-STYLED / DIMENSIONAL LOGO RENDERS (Depth, lighting, metallic specular, bevels)
  else if (resolvedType === "dimensional_3d") {
    interiorMarkup = `
      <!-- 3D Dimensional Render Layout -->
      <g id="dimensional-3d-container">
        <!-- 3D Depth Isometric Backing Plate -->
        <g transform="translate(0, 6)" opacity="0.4" filter="url(#${shadowFilterId})">
          <circle cx="256" cy="185" r="92" fill="#000000" />
        </g>

        <!-- 3D Glowing Metallic Base Circle -->
        <circle cx="256" cy="180" r="88" fill="url(#${bevelGradId})" stroke="url(#${gradientId})" stroke-width="5" filter="url(#${filterId})" />
        <circle cx="256" cy="180" r="76" fill="${palette.badgeBg}" stroke="url(#${gradientId})" stroke-width="2" opacity="0.9" />

        <!-- 3D Specular Highlight Arch -->
        <path d="M 195 140 C 230 115 282 115 317 140" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity="0.75" />

        <!-- 3D Icon Element (Dimensional Extrusion) -->
        <g transform="translate(256, 178) scale(3.5)" fill="url(#${gradientId})" filter="url(#${shadowFilterId})">
          <path d="${sym.path}" transform="translate(-12, -12)" />
        </g>

        <!-- 3D Metallic Plaque Banner for Brand Name -->
        <g transform="translate(0, 10)">
          <!-- Banner Drop Shadow -->
          <rect x="76" y="296" width="360" height="52" rx="14" fill="#000000" opacity="0.5" />
          <!-- Metallic Banner Base -->
          <rect x="76" y="290" width="360" height="52" rx="14" fill="url(#${bevelGradId})" stroke="url(#${gradientId})" stroke-width="3" />
          <rect x="80" y="294" width="352" height="44" rx="10" fill="${palette.badgeBg}" opacity="0.85" />
          
          <text x="256" y="324" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-weight="900" font-size="20" fill="url(#${gradientId})" text-anchor="middle" letter-spacing="3">
            ${(cleanName.length > 15 ? cleanName.slice(0, 15) : cleanName).toUpperCase()}
          </text>
        </g>

        <!-- 3D Dimensional Subtitle -->
        <text x="256" y="398" font-family="system-ui, sans-serif" font-weight="900" font-size="14" fill="${palette.accent}" text-anchor="middle" letter-spacing="6">
          ★ ${displayTagline.slice(0, 18)} ★
        </text>
      </g>
    `;
  }
  // 4. ICON + TEXT COMBINATION LOGO (Harmonious icon + prominent text layout)
  else {
    interiorMarkup = `
      <!-- Combination Mark (Icon + Text) Layout -->
      <g id="combination-container">
        <!-- Top Icon Shield / Emblem -->
        <circle cx="256" cy="170" r="76" fill="url(#${gradientId})" opacity="0.16" />
        <circle cx="256" cy="170" r="68" fill="none" stroke="url(#${gradientId})" stroke-width="2.5" />
        
        <g transform="translate(256, 170) scale(3.2)" fill="url(#${gradientId})">
          <path d="${sym.path}" transform="translate(-12, -12)" />
        </g>

        <!-- Brand Name Typography -->
        <text x="256" y="285" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-weight="900" font-size="34" fill="${palette.textColor}" text-anchor="middle" letter-spacing="3" textLength="320" lengthAdjust="spacingAndGlyphs">
          ${cleanName.toUpperCase()}
        </text>

        <!-- Ribbon Tagline Plaque -->
        <rect x="110" y="315" width="292" height="36" rx="10" fill="url(#${gradientId})" />
        <text x="256" y="339" font-family="system-ui, sans-serif" font-weight="900" font-size="15" fill="${palette.badgeBg}" text-anchor="middle" letter-spacing="4">
          ${displayTagline.slice(0, 18)}
        </text>

        <text x="256" y="390" font-family="system-ui, sans-serif" font-weight="800" font-size="13" fill="${palette.accent}" text-anchor="middle" letter-spacing="5">
          ENTERPRISE IDENTITY
        </text>
      </g>
    `;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
  <defs>
    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.gradientFrom}" />
      ${palette.gradientVia ? `<stop offset="50%" stop-color="${palette.gradientVia}" />` : ""}
      <stop offset="100%" stop-color="${palette.gradientTo}" />
    </linearGradient>
    
    <linearGradient id="${bevelGradId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.9" />
      <stop offset="35%" stop-color="${palette.gradientFrom}" />
      <stop offset="70%" stop-color="${palette.gradientTo}" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.8" />
    </linearGradient>

    <filter id="${filterId}" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <filter id="${shadowFilterId}" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000000" flood-opacity="0.5" />
    </filter>
  </defs>
  
  <!-- Outer Shape Base Frame -->
  ${shapePath}
  
  <!-- Inner Graphics & Typography -->
  ${interiorMarkup}
</svg>`;
}

/**
 * Converts SVG markup string to a downloadable PNG data URL
 */
export async function convertSvgToPngDataUrl(svgMarkup: string, size = 1024): Promise<string> {
  return new Promise((resolve) => {
    try {
      const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(blobURL);
          resolve(`data:image/svg+xml;utf8,${encodeURIComponent(svgMarkup)}`);
          return;
        }
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        URL.revokeObjectURL(blobURL);
        resolve(canvas.toDataURL("image/png"));
      };

      img.onerror = (e) => {
        URL.revokeObjectURL(blobURL);
        console.warn("PNG rasterization notice, falling back to SVG URI:", e);
        resolve(`data:image/svg+xml;utf8,${encodeURIComponent(svgMarkup)}`);
      };

      img.src = blobURL;
    } catch {
      resolve(`data:image/svg+xml;utf8,${encodeURIComponent(svgMarkup)}`);
    }
  });
}

/**
 * Generates an array of distinct professional studio logo variations for a business
 */
export async function generateAILogos(
  options: AILogoGeneratorOptions
): Promise<GeneratedLogoItem[]> {
  const businessName = options.businessName || "Bethelin Enterprise";
  const initials = options.initials || extractInitials(businessName);
  const category = (options.category || "Commerce").toLowerCase();

  // Smart symbol selection based on category
  const categorySymbolMap: Record<string, string[]> = {
    tech: ["bolt", "cube", "sparkles", "globe", "rocket"],
    fashion: ["diamond", "sparkles", "crown", "infinity"],
    beauty: ["sparkles", "diamond", "crown", "infinity"],
    food: ["crown", "sparkles", "target", "shield"],
    construction: ["building", "shield", "cube", "target"],
    logistics: ["rocket", "globe", "bolt", "target"],
    retail: ["cart", "sparkles", "diamond", "crown"],
    finance: ["shield", "diamond", "building", "crown"],
    real_estate: ["building", "shield", "crown", "cube"],
  };

  let candidateSymbols = ["crown", "diamond", "shield", "rocket", "sparkles", "cart", "bolt", "building", "cube", "globe"];
  for (const [k, syms] of Object.entries(categorySymbolMap)) {
    if (category.includes(k)) {
      candidateSymbols = syms;
      break;
    }
  }

  // Defined logo types as requested by user:
  // - Wordmark logos (text-based)
  // - Lettermark logos (initials/monogram)
  // - Icon + text combination logos
  // - 3D-styled / dimensional logo renders
  const allLogoTypes: LogoType[] = ["wordmark", "lettermark", "combination", "dimensional_3d"];
  const shapes: LogoShape[] = ["rounded_square", "circle", "shield", "hexagon", "octagon", "diamond"];

  const items: GeneratedLogoItem[] = [];

  for (let i = 0; i < 8; i++) {
    const palette = LOGO_PALETTES[i % LOGO_PALETTES.length];
    const shape = options.shape || shapes[i % shapes.length];
    const chosenType = (options.logoType && options.logoType !== "all") ? options.logoType : allLogoTypes[i % allLogoTypes.length];
    const symKey = candidateSymbols[i % candidateSymbols.length];

    const svgMarkup = buildLogoSvgMarkup({
      businessName,
      tagline: options.tagline || (i % 2 === 0 ? "PREMIUM QUALITY" : "VERIFIED ENTERPRISE"),
      initials,
      symbolKey: symKey,
      palette,
      shape,
      logoType: chosenType,
      archetype: (chosenType as any),
    });

    items.push({
      id: `logo-var-${i}-${Date.now()}`,
      businessName,
      tagline: options.tagline,
      initials,
      symbol: symKey,
      palette,
      shape,
      logoType: chosenType,
      archetype: (chosenType as any),
      svgMarkup,
    });
  }

  // Optional Gemini enhancement for tagline
  try {
    const gemini = await getGeminiClient();
    if (gemini) {
      gemini.models.generateContent({
        model: "gemini-3.7-flash",
        contents: `Suggest a 2-word punchy luxury tagline for a brand called "${businessName}" in "${category}". Return just the 2 words uppercase.`,
      }).then((res) => {
        const text = res?.text?.trim();
        if (text && text.length < 24) {
          items.forEach((it) => {
            if (!it.tagline) it.tagline = text;
          });
        }
      }).catch(() => {});
    }
  } catch {
    // Static generation complete
  }

  return items;
}
