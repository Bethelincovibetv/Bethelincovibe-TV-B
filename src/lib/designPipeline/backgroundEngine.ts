import { ColorThemeKey, ColorThemeConfig } from "./types";

export const COLOR_THEMES: Record<ColorThemeKey, ColorThemeConfig> = {
  royal_gold: {
    id: "royal_gold",
    name: "Royal Gold & Onyx",
    primaryAccent: "#F59E0B",
    secondaryAccent: "#FBBF24",
    tertiaryAccent: "#FEF08A",
    badgeBg: "#F59E0B",
    badgeTextColor: "#0A0A0A",
    highlightText: "#FEF08A",
    ctaBg: "#22C55E",
    ctaTextColor: "#FFFFFF",
    borderColor: "#F59E0B",
    bgGradientFrom: "rgba(10, 15, 29, 0.96)",
    bgGradientVia: "rgba(15, 23, 42, 0.90)",
    bgGradientTo: "rgba(5, 8, 16, 0.98)",
    cardBg: "rgba(15, 23, 42, 0.82)",
    cardBorder: "rgba(245, 158, 11, 0.35)",
    goldFoil: true,
    ambientLightColor: "rgba(245, 158, 11, 0.12)",
  },
  emerald_luxury: {
    id: "emerald_luxury",
    name: "Emerald Luxury & Jade",
    primaryAccent: "#10B981",
    secondaryAccent: "#34D399",
    tertiaryAccent: "#A7F3D0",
    badgeBg: "#10B981",
    badgeTextColor: "#FFFFFF",
    highlightText: "#A7F3D0",
    ctaBg: "#10B981",
    ctaTextColor: "#FFFFFF",
    borderColor: "#10B981",
    bgGradientFrom: "rgba(6, 30, 20, 0.96)",
    bgGradientVia: "rgba(6, 78, 59, 0.88)",
    bgGradientTo: "rgba(2, 20, 12, 0.98)",
    cardBg: "rgba(6, 30, 20, 0.82)",
    cardBorder: "rgba(16, 185, 129, 0.35)",
    goldFoil: false,
    ambientLightColor: "rgba(16, 185, 129, 0.12)",
  },
  cyber_tech: {
    id: "cyber_tech",
    name: "Cyber Sapphire & Tech",
    primaryAccent: "#3B82F6",
    secondaryAccent: "#60A5FA",
    tertiaryAccent: "#BFDBFE",
    badgeBg: "#3B82F6",
    badgeTextColor: "#FFFFFF",
    highlightText: "#BFDBFE",
    ctaBg: "#22C55E",
    ctaTextColor: "#FFFFFF",
    borderColor: "#3B82F6",
    bgGradientFrom: "rgba(11, 25, 44, 0.96)",
    bgGradientVia: "rgba(15, 23, 42, 0.90)",
    bgGradientTo: "rgba(5, 10, 25, 0.98)",
    cardBg: "rgba(11, 25, 44, 0.82)",
    cardBorder: "rgba(59, 130, 246, 0.35)",
    goldFoil: false,
    ambientLightColor: "rgba(59, 130, 246, 0.15)",
  },
  sunset_vibrant: {
    id: "sunset_vibrant",
    name: "Sunset Coral & Blaze",
    primaryAccent: "#F97316",
    secondaryAccent: "#FB923C",
    tertiaryAccent: "#FED7AA",
    badgeBg: "#F97316",
    badgeTextColor: "#FFFFFF",
    highlightText: "#FED7AA",
    ctaBg: "#22C55E",
    ctaTextColor: "#FFFFFF",
    borderColor: "#F97316",
    bgGradientFrom: "rgba(35, 12, 10, 0.96)",
    bgGradientVia: "rgba(45, 15, 20, 0.88)",
    bgGradientTo: "rgba(15, 5, 8, 0.98)",
    cardBg: "rgba(35, 12, 10, 0.82)",
    cardBorder: "rgba(249, 115, 22, 0.35)",
    goldFoil: false,
    ambientLightColor: "rgba(249, 115, 22, 0.15)",
  },
  ocean_corporate: {
    id: "ocean_corporate",
    name: "Executive Ocean Navy",
    primaryAccent: "#0EA5E9",
    secondaryAccent: "#38BDF8",
    tertiaryAccent: "#BAE6FD",
    badgeBg: "#0EA5E9",
    badgeTextColor: "#FFFFFF",
    highlightText: "#BAE6FD",
    ctaBg: "#0EA5E9",
    ctaTextColor: "#FFFFFF",
    borderColor: "#0EA5E9",
    bgGradientFrom: "rgba(8, 28, 48, 0.96)",
    bgGradientVia: "rgba(12, 38, 64, 0.90)",
    bgGradientTo: "rgba(3, 12, 24, 0.98)",
    cardBg: "rgba(8, 28, 48, 0.82)",
    cardBorder: "rgba(14, 165, 233, 0.35)",
    goldFoil: false,
    ambientLightColor: "rgba(14, 165, 233, 0.12)",
  },
  crimson_ruby: {
    id: "crimson_ruby",
    name: "Crimson Ruby & Velvet",
    primaryAccent: "#E11D48",
    secondaryAccent: "#FB7185",
    tertiaryAccent: "#FECDD3",
    badgeBg: "#E11D48",
    badgeTextColor: "#FFFFFF",
    highlightText: "#FECDD3",
    ctaBg: "#22C55E",
    ctaTextColor: "#FFFFFF",
    borderColor: "#E11D48",
    bgGradientFrom: "rgba(35, 8, 16, 0.96)",
    bgGradientVia: "rgba(45, 10, 22, 0.88)",
    bgGradientTo: "rgba(15, 3, 7, 0.98)",
    cardBg: "rgba(35, 8, 16, 0.82)",
    cardBorder: "rgba(225, 29, 72, 0.35)",
    goldFoil: false,
    ambientLightColor: "rgba(225, 29, 72, 0.12)",
  },
  minimal_dark: {
    id: "minimal_dark",
    name: "Minimalist Obsidian",
    primaryAccent: "#E2E8F0",
    secondaryAccent: "#CBD5E1",
    tertiaryAccent: "#F8FAFC",
    badgeBg: "#334155",
    badgeTextColor: "#F8FAFC",
    highlightText: "#F1F5F9",
    ctaBg: "#FFFFFF",
    ctaTextColor: "#0F172A",
    borderColor: "#475569",
    bgGradientFrom: "rgba(15, 23, 42, 0.97)",
    bgGradientVia: "rgba(24, 32, 47, 0.92)",
    bgGradientTo: "rgba(2, 6, 23, 0.99)",
    cardBg: "rgba(15, 23, 42, 0.85)",
    cardBorder: "rgba(71, 85, 105, 0.4)",
    goldFoil: false,
    ambientLightColor: "rgba(255, 255, 255, 0.05)",
  },
  terracotta_warm: {
    id: "terracotta_warm",
    name: "Warm African Terracotta",
    primaryAccent: "#D97706",
    secondaryAccent: "#F59E0B",
    tertiaryAccent: "#FDE68A",
    badgeBg: "#B45309",
    badgeTextColor: "#FFFFFF",
    highlightText: "#FEF3C7",
    ctaBg: "#15803D",
    ctaTextColor: "#FFFFFF",
    borderColor: "#D97706",
    bgGradientFrom: "rgba(38, 18, 8, 0.96)",
    bgGradientVia: "rgba(48, 22, 12, 0.90)",
    bgGradientTo: "rgba(18, 8, 4, 0.98)",
    cardBg: "rgba(38, 18, 8, 0.82)",
    cardBorder: "rgba(217, 119, 6, 0.35)",
    goldFoil: true,
    ambientLightColor: "rgba(217, 119, 6, 0.15)",
  },
};

/**
 * Draws rounded rectangle path onto canvas
 */
export function drawRoundRect(
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
 * Renders sophisticated decorative backdrop & geometric elements
 */
export function renderBackdropDecorations(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: ColorThemeConfig
) {
  ctx.save();

  // 1. Ambient Glow Point in upper quadrant
  const glowX = width * 0.75;
  const glowY = height * 0.2;
  const glowGrad = ctx.createRadialGradient(glowX, glowY, 10, glowX, glowY, width * 0.6);
  glowGrad.addColorStop(0, theme.ambientLightColor);
  glowGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Corner Framing Brackets
  const cornerSize = Math.max(28, Math.round(width * 0.035));
  const pad = 24;
  ctx.strokeStyle = theme.borderColor;
  ctx.lineWidth = 2.5;

  // Top-Left
  ctx.beginPath();
  ctx.moveTo(pad, pad + cornerSize);
  ctx.lineTo(pad, pad);
  ctx.lineTo(pad + cornerSize, pad);
  ctx.stroke();

  // Top-Right
  ctx.beginPath();
  ctx.moveTo(width - pad - cornerSize, pad);
  ctx.lineTo(width - pad, pad);
  ctx.lineTo(width - pad, pad + cornerSize);
  ctx.stroke();

  // Bottom-Left
  ctx.beginPath();
  ctx.moveTo(pad, height - pad - cornerSize);
  ctx.lineTo(pad, height - pad);
  ctx.lineTo(pad + cornerSize, height - pad);
  ctx.stroke();

  // Bottom-Right
  ctx.beginPath();
  ctx.moveTo(width - pad - cornerSize, height - pad);
  ctx.lineTo(width - pad, height - pad);
  ctx.lineTo(width - pad, height - pad - cornerSize);
  ctx.stroke();

  // 3. Subtle Hairline Inset Border
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  ctx.strokeRect(36, 36, width - 72, height - 72);

  ctx.restore();
}
