import React, { useMemo } from "react";
import { extractInitials, LOGO_PALETTES, buildLogoSvgMarkup } from "@/lib/aiLogoEngine";

interface BusinessDefaultLogoProps {
  name: string;
  category?: string;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "hero";
  shape?: "rounded-2xl" | "rounded-xl" | "rounded-full" | "rounded-3xl";
}

export default function BusinessDefaultLogo({
  name,
  category = "Commerce",
  className = "",
  size = "md",
  shape = "rounded-2xl",
}: BusinessDefaultLogoProps) {
  const initials = useMemo(() => extractInitials(name || "Bethelincovibe"), [name]);

  // Deterministic palette pick based on name char codes
  const palette = useMemo(() => {
    const sum = (name || "B")
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return LOGO_PALETTES[sum % LOGO_PALETTES.length];
  }, [name]);

  const sizeClasses = {
    xs: "h-6 w-6 text-[9px]",
    sm: "h-8 w-8 text-xs",
    md: "h-12 w-12 text-sm",
    lg: "h-16 w-16 text-lg",
    xl: "h-20 w-20 text-2xl",
    hero: "h-28 w-28 text-3xl sm:h-36 sm:w-36 sm:text-4xl",
  }[size];

  const subline = category?.split(/[\s&/]+/)[0]?.toUpperCase() || "PRO";

  return (
    <div
      className={`relative select-none shrink-0 overflow-hidden flex flex-col items-center justify-center font-black shadow-inner border border-white/20 ${shape} ${sizeClasses} ${className}`}
      style={{
        background: `radial-gradient(circle at 30% 30%, ${palette.gradientVia || palette.gradientFrom}, ${palette.badgeBg})`,
        color: palette.textColor,
      }}
      title={`${name} (AI Branded Logo)`}
    >
      {/* Decorative vector ring */}
      <div
        className="absolute inset-1 rounded-[inherit] border border-dashed opacity-40 pointer-events-none"
        style={{ borderColor: palette.accent }}
      />
      
      {/* Glow highlight */}
      <div
        className="absolute -top-6 -right-6 w-14 h-14 rounded-full blur-lg opacity-40 pointer-events-none"
        style={{ backgroundColor: palette.accent }}
      />

      {/* Initials */}
      <span
        className="relative z-10 tracking-wider drop-shadow-md font-black"
        style={{
          color: palette.textColor,
          textShadow: `0 2px 8px ${palette.gradientFrom}88`,
        }}
      >
        {initials}
      </span>

      {/* Subline badge for larger sizes */}
      {(size === "lg" || size === "xl" || size === "hero") && (
        <span
          className="relative z-10 text-[8px] sm:text-[9px] uppercase tracking-widest font-extrabold px-1.5 py-0.2 rounded-full border border-white/20 mt-0.5"
          style={{
            backgroundColor: `${palette.gradientFrom}40`,
            color: palette.accent,
          }}
        >
          {subline}
        </span>
      )}
    </div>
  );
}
