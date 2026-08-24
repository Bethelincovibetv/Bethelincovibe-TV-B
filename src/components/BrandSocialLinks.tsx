import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Brand-accurate social media icons. Solid white glyphs that sit on the
 * primary purple footer — uses each platform's official mark.
 *
 * Admin can configure URLs in site_settings with keys:
 *   social_facebook, social_x, social_instagram, social_tiktok,
 *   social_youtube, social_linkedin, social_whatsapp, social_telegram,
 *   social_threads, social_pinterest, social_snapchat, social_reddit
 */

type SocialKey =
  | "facebook" | "x" | "instagram" | "tiktok" | "youtube" | "linkedin"
  | "whatsapp" | "telegram" | "threads" | "pinterest" | "snapchat" | "reddit";

const ICONS: Record<SocialKey, { label: string; brand: string; path: JSX.Element }> = {
  facebook: {
    label: "Facebook", brand: "#1877F2",
    path: <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z" />,
  },
  x: {
    label: "X", brand: "#000000",
    path: <path d="M18.244 3H21.5l-7.5 8.57L22.5 21h-6.957l-4.46-5.95L5.7 21H2.444l8.04-9.19L1.5 3h7.13l4.03 5.4L18.244 3Zm-2.44 16h1.84L8.27 5H6.3l9.504 14Z" />,
  },
  instagram: {
    label: "Instagram", brand: "#E4405F",
    path: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
      </>
    ),
  },
  tiktok: {
    label: "TikTok", brand: "#010101",
    path: <path d="M16.5 3a5.7 5.7 0 0 0 4.5 4.5v3a8.7 8.7 0 0 1-4.5-1.3v6.5a5.8 5.8 0 1 1-5.8-5.8c.3 0 .7 0 1 .1v3.1a2.7 2.7 0 1 0 1.9 2.6V3h2.9Z" />,
  },
  youtube: {
    label: "YouTube", brand: "#FF0000",
    path: <path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8ZM10 15V9l5.2 3Z" />,
  },
  linkedin: {
    label: "LinkedIn", brand: "#0A66C2",
    path: <path d="M4.98 3.5A2.5 2.5 0 1 1 5 8.5a2.5 2.5 0 0 1 0-5ZM3 9.5h4V21H3V9.5Zm7 0h3.8v1.6h.05c.53-1 1.83-2.05 3.77-2.05 4.04 0 4.78 2.66 4.78 6.12V21h-4v-5.05c0-1.2 0-2.75-1.68-2.75-1.68 0-1.94 1.31-1.94 2.66V21H10V9.5Z" />,
  },
  whatsapp: {
    label: "WhatsApp", brand: "#25D366",
    path: <path d="M20 12a8 8 0 0 1-12 6.9L4 20l1.2-3.7A8 8 0 1 1 20 12Zm-4.6 2.4-1.4-.5c-.2-.1-.4-.05-.6.15l-.6.7c-.2.2-.4.3-.7.15a6 6 0 0 1-3.05-2.7c-.15-.3 0-.5.15-.65l.45-.55c.15-.2.2-.35.05-.55l-.7-1.6c-.2-.4-.5-.4-.7-.4h-.55a1.1 1.1 0 0 0-.8.4 3.4 3.4 0 0 0-1 2.5c0 1.5 1.05 2.95 1.2 3.15.15.2 2.1 3.2 5.1 4.35 2.45.95 2.95.75 3.5.7.55-.05 1.75-.7 2-1.4.25-.7.25-1.3.2-1.4-.05-.1-.25-.15-.55-.3Z" />,
  },
  telegram: {
    label: "Telegram", brand: "#26A5E4",
    path: <path d="M21.5 4.2 18.3 19.8c-.2 1-.9 1.3-1.8.8l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.1-8.2c.4-.35-.1-.55-.6-.2L5.7 12.7l-4.9-1.5c-1-.3-1-1 .2-1.5L20 3.4c.9-.3 1.7.2 1.5 1.5Z" />,
  },
  threads: {
    label: "Threads", brand: "#000000",
    path: <path d="M12 2C6.5 2 3 5.4 3 11s3.6 9 9 9c4 0 6.8-1.8 8-5.2l-2.4-1c-.7 2-2.6 3.6-5.6 3.6-3.8 0-6-2.4-6-6.5S8.3 4 12 4c2.8 0 4.5 1.1 5.3 3l2.3-1C18.4 3.4 15.8 2 12 2Zm.4 6.4c-2.2 0-4 1-4 3.1 0 1.8 1.6 2.9 3.6 2.9 2.5 0 4.4-1.6 4.4-4.2v-.3a6 6 0 0 0-2 .3c-.1-1.1-1-1.8-2-1.8Z" />,
  },
  pinterest: {
    label: "Pinterest", brand: "#BD081C",
    path: <path d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.3-5.4s-.3-.7-.3-1.7c0-1.6.9-2.8 2.1-2.8 1 0 1.5.75 1.5 1.65 0 1-.65 2.5-1 3.9-.3 1.2.6 2.2 1.7 2.2 2.1 0 3.6-2.2 3.6-5.3 0-2.8-2-4.7-4.85-4.7-3.3 0-5.25 2.5-5.25 5 0 1 .4 2 .9 2.6.1.1.1.2.1.3l-.3 1.3c-.05.2-.2.3-.4.2-1.5-.7-2.4-2.8-2.4-4.6 0-3.7 2.7-7.1 7.8-7.1 4.1 0 7.3 2.9 7.3 6.8 0 4.1-2.6 7.4-6.2 7.4-1.2 0-2.4-.65-2.7-1.4l-.75 2.8c-.3 1-1 2.4-1.5 3.2A10 10 0 1 0 12 2Z" />,
  },
  snapchat: {
    label: "Snapchat", brand: "#FFFC00",
    path: <path d="M12 2c2.5 0 4.7 1.5 5.4 3.7.3 1.1.1 2.3.1 3.5 0 .3.2.4.4.5.4.2.9.2 1.3.5.4.3.3.7-.1 1l-1.7.8c.4 1 1.2 1.9 2.3 2.5.5.3.5.7.1 1-.5.3-1.5.4-2.1.6-.2.1-.2.4-.3.7l-.2.7c-.2.5-.5.6-1 .5-1-.2-2 .1-2.8.8l-1 1c-.7.7-1.7.7-2.4 0l-1-1c-.8-.7-1.8-1-2.8-.8-.5.1-.8 0-1-.5l-.2-.7c-.1-.3-.1-.6-.3-.7-.6-.2-1.6-.3-2.1-.6-.4-.3-.4-.7.1-1 1.1-.6 1.9-1.5 2.3-2.5l-1.7-.8c-.4-.3-.5-.7-.1-1 .4-.3.9-.3 1.3-.5.2-.1.4-.2.4-.5 0-1.2-.2-2.4.1-3.5C7.3 3.5 9.5 2 12 2Z" />,
  },
  reddit: {
    label: "Reddit", brand: "#FF4500",
    path: <path d="M22 12a2.4 2.4 0 0 0-4-1.7c-1.5-1-3.4-1.6-5.5-1.7l1-3.7 3 .7a1.8 1.8 0 1 0 .2-1.1l-3.6-.8c-.2 0-.4.1-.4.3l-1.1 4.6c-2.1.1-4.1.7-5.6 1.7A2.4 2.4 0 1 0 4 13.8c0 .2-.1.4-.1.6 0 3 3.6 5.5 8.1 5.5s8.1-2.5 8.1-5.5c0-.2 0-.4-.1-.6.6-.4 1-1 1-1.8Zm-13 1a1.4 1.4 0 1 1 2.8 0 1.4 1.4 0 0 1-2.8 0Zm6.5 3.7c-.9.8-2.2 1-3.5 1s-2.6-.2-3.5-1c-.2-.2-.2-.4 0-.6.2-.2.4-.2.6 0 .7.6 1.7.8 2.9.8s2.2-.2 2.9-.8c.2-.2.4-.2.6 0 .2.2.2.4 0 .6Zm-.4-2.3a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Z" />,
  },
};

export default function BrandSocialLinks({ className = "" }: { className?: string }) {
  const [urls, setUrls] = useState<Record<SocialKey, string>>({} as any);

  useEffect(() => {
    const keys: SocialKey[] = [
      "facebook","x","instagram","tiktok","youtube","linkedin",
      "whatsapp","telegram","threads","pinterest","snapchat","reddit",
    ];
    supabase.from("site_settings").select("key,value")
      .in("key", keys.map((k) => `social_${k}`))
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data || []).forEach((r: any) => {
          const k = r.key.replace(/^social_/, "");
          if (r.value) map[k] = r.value;
        });
        setUrls(map as any);
      });
  }, []);

  const items = (Object.keys(ICONS) as SocialKey[]).filter((k) => urls[k]);
  if (items.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center justify-center gap-2.5 ${className}`}>
      {items.map((k) => {
        const m = ICONS[k];
        return (
          <a
            key={k}
            href={urls[k]}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={m.label}
            title={m.label}
            className="group relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl text-white transition-all duration-300 hover:scale-110 hover:-translate-y-1 active:scale-95 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.3),inset_0_1.5px_0_rgba(255,255,255,0.4)] ring-1 ring-white/25 overflow-hidden"
            style={{ backgroundColor: m.brand }}
          >
            {/* 3D Gloss Highlight */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/30 pointer-events-none" />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="relative z-10 h-5 w-5 sm:h-5.5 sm:w-5.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] transition-transform group-hover:scale-110"
              width="22"
              height="22"
              fill="currentColor"
            >
              {m.path}
            </svg>
          </a>
        );
      })}
    </div>
  );
}
