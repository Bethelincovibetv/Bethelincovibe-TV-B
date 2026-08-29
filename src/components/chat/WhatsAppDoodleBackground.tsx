import React from "react";

interface WhatsAppDoodleBackgroundProps {
  theme?: "classic" | "dark" | "emerald" | "slate";
  className?: string;
}

export const WhatsAppDoodleBackground: React.FC<WhatsAppDoodleBackgroundProps> = ({
  theme = "classic",
  className = "",
}) => {
  // Theme color maps for authentic WhatsApp backgrounds
  const themeStyles = {
    classic: {
      bg: "bg-[#efeae2] dark:bg-[#0b141a]",
      doodleOpacity: "opacity-[0.08] dark:opacity-[0.05]",
      filter: "dark:invert",
    },
    dark: {
      bg: "bg-[#0b141a]",
      doodleOpacity: "opacity-[0.06]",
      filter: "invert",
    },
    emerald: {
      bg: "bg-[#051c14] dark:bg-[#03130d]",
      doodleOpacity: "opacity-[0.07]",
      filter: "invert",
    },
    slate: {
      bg: "bg-[#0f172a]",
      doodleOpacity: "opacity-[0.06]",
      filter: "invert",
    },
  };

  const current = themeStyles[theme] || themeStyles.classic;

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden transition-colors duration-300 ${current.bg} ${className}`}>
      {/* Repeating WhatsApp Doodle Vector Wallpaper */}
      <svg
        className={`w-full h-full ${current.doodleOpacity} ${current.filter}`}
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          <pattern id="whatsapp-doodle-pattern" width="160" height="160" patternUnits="userSpaceOnUse">
            {/* Speech Bubble with Smile */}
            <path
              d="M20,25 C20,18 26,12 34,12 C42,12 48,18 48,25 C48,32 42,38 34,38 L25,41 L27,35 C22.5,33 20,29 20,25 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <circle cx="30" cy="23" r="1.5" fill="currentColor" />
            <circle cx="38" cy="23" r="1.5" fill="currentColor" />
            <path d="M29,28 Q34,32 39,28" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />

            {/* Coffee / Tea Cup */}
            <path d="M85,30 L85,42 C85,46 88,48 93,48 L97,48 C102,48 105,46 105,42 L105,30 Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <path d="M105,33 C109,33 111,35 111,38 C111,41 109,43 105,43" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <path d="M90,26 C90,24 92,23 92,20" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            <path d="M96,26 C96,24 98,23 98,20" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            <line x1="82" y1="49" x2="108" y2="49" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />

            {/* Heart */}
            <path
              d="M135,22 C135,17 140,15 143,18 C146,15 151,17 151,22 C151,28 143,34 143,34 C143,34 135,28 135,22 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            />

            {/* Bicycle */}
            <circle cx="28" cy="95" r="7" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="48" cy="95" r="7" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <polyline points="28,95 36,83 48,95" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <polyline points="36,83 42,83 38,95 34,95" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <line x1="33" y1="80" x2="39" y2="80" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />

            {/* Musical Note */}
            <path d="M80,85 L80,98 M80,89 L92,84 L92,96 M80,85 L92,80" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <ellipse cx="76" cy="99" rx="3.5" ry="2.5" fill="currentColor" transform="rotate(-20 76 99)" />
            <ellipse cx="88" cy="97" rx="3.5" ry="2.5" fill="currentColor" transform="rotate(-20 88 97)" />

            {/* Clock */}
            <circle cx="138" cy="90" r="9" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <polyline points="138,84 138,90 142,92" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />

            {/* Camera */}
            <rect x="22" y="132" width="22" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <path d="M28,132 L30,128 L36,128 L38,132 Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="33" cy="140" r="4" fill="none" stroke="currentColor" strokeWidth="1.2" />

            {/* Laptop / Display */}
            <rect x="80" y="130" width="22" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <polyline points="74,146 108,146" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />

            {/* Smartphone with Chat */}
            <rect x="132" y="128" width="14" height="24" rx="3" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <line x1="135" y1="133" x2="143" y2="133" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            <line x1="135" y1="137" x2="141" y2="137" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            <circle cx="139" cy="148" r="1" fill="currentColor" />

            {/* Star Sparkle */}
            <path d="M60,55 L61.5,60 L66.5,61.5 L61.5,63 L60,68 L58.5,63 L53.5,61.5 L58.5,60 Z" fill="currentColor" />
            <path d="M120,55 L121,58 L124,59 L121,60 L120,63 L119,60 L116,59 L119,58 Z" fill="currentColor" />
            <path d="M110,115 L111,118 L114,119 L111,120 L110,123 L109,120 L106,119 L109,118 Z" fill="currentColor" />
            <path d="M55,118 L56,120 L58,121 L56,122 L55,124 L54,122 L52,121 L54,120 Z" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#whatsapp-doodle-pattern)" />
      </svg>
    </div>
  );
};
