import React from "react";
import { ExternalLink, Play, Video, Share2, Globe, MessageCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface LinkMetadata {
  url: string;
  type: "youtube" | "vimeo" | "video" | "whatsapp" | "facebook" | "instagram" | "twitter" | "telegram" | "generic";
  videoId?: string;
  domain: string;
  displayUrl: string;
  phoneOrGroup?: string;
}

/**
 * Extracts and analyzes all URLs in a piece of text.
 */
export function extractUrls(text: string): LinkMetadata[] {
  if (!text) return [];
  // Regex to match URLs (http, https, www, wa.me)
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|wa\.me\/[^\s]+)/gi;
  const matches = text.match(urlRegex) || [];
  const uniqueUrls = Array.from(new Set(matches));

  return uniqueUrls.map((rawUrl) => {
    let fullUrl = rawUrl;
    if (!fullUrl.startsWith("http://") && !fullUrl.startsWith("https://")) {
      fullUrl = "https://" + fullUrl;
    }

    let domain = "";
    try {
      const parsed = new URL(fullUrl);
      domain = parsed.hostname.replace(/^www\./, "");
    } catch {
      domain = fullUrl.split("/")[0];
    }

    // 1. YouTube detection (standard, short URL, shorts, embed)
    const ytMatch = fullUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i);
    if (ytMatch && ytMatch[1]) {
      return {
        url: fullUrl,
        type: "youtube",
        videoId: ytMatch[1],
        domain: "youtube.com",
        displayUrl: fullUrl,
      };
    }

    // 2. Vimeo detection
    const vimeoMatch = fullUrl.match(/(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+))/i);
    if (vimeoMatch && vimeoMatch[1]) {
      return {
        url: fullUrl,
        type: "vimeo",
        videoId: vimeoMatch[1],
        domain: "vimeo.com",
        displayUrl: fullUrl,
      };
    }

    // 3. Direct HTML5 Video File (.mp4, .webm, .mov, .ogg)
    if (/\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(fullUrl)) {
      return {
        url: fullUrl,
        type: "video",
        domain,
        displayUrl: fullUrl,
      };
    }

    // 4. WhatsApp link (wa.me, api.whatsapp.com, chat.whatsapp.com)
    if (/wa\.me|whatsapp\.com/i.test(fullUrl)) {
      let details = "WhatsApp Contact";
      if (/chat\.whatsapp\.com/i.test(fullUrl)) {
        details = "WhatsApp Community Group";
      } else {
        const phone = fullUrl.split("wa.me/")[1]?.split("?")[0] || fullUrl.split("phone=")[1]?.split("&")[0];
        if (phone) details = `+${phone.replace(/[^\d+]/g, "")}`;
      }
      return {
        url: fullUrl,
        type: "whatsapp",
        domain: "whatsapp.com",
        displayUrl: fullUrl,
        phoneOrGroup: details,
      };
    }

    // 5. Facebook link (facebook.com, fb.watch, fb.com)
    if (/facebook\.com|fb\.watch|fb\.com/i.test(fullUrl)) {
      return {
        url: fullUrl,
        type: "facebook",
        domain: "facebook.com",
        displayUrl: fullUrl,
      };
    }

    // 6. Instagram link
    if (/instagram\.com/i.test(fullUrl)) {
      return {
        url: fullUrl,
        type: "instagram",
        domain: "instagram.com",
        displayUrl: fullUrl,
      };
    }

    // 7. Twitter / X link
    if (/twitter\.com|x\.com/i.test(fullUrl)) {
      return {
        url: fullUrl,
        type: "twitter",
        domain: "x.com",
        displayUrl: fullUrl,
      };
    }

    // 8. Telegram link
    if (/t\.me|telegram\.me/i.test(fullUrl)) {
      return {
        url: fullUrl,
        type: "telegram",
        domain: "t.me",
        displayUrl: fullUrl,
      };
    }

    // 9. Generic web link
    return {
      url: fullUrl,
      type: "generic",
      domain,
      displayUrl: fullUrl,
    };
  });
}

/**
 * Individual Rich Link / Video / Social Embed Card
 */
export function ForumLinkCard({ meta }: { meta: LinkMetadata }) {
  if (meta.type === "youtube" && meta.videoId) {
    return (
      <div className="my-3 rounded-2xl overflow-hidden border border-border/80 bg-black/90 shadow-md">
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/90 text-white text-xs border-b border-zinc-800">
          <div className="flex items-center gap-1.5 font-bold">
            <Video className="h-4 w-4 text-red-500" />
            <span>YouTube Video Embed</span>
          </div>
          <a
            href={meta.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white underline"
          >
            <span>Watch on YouTube</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="relative w-full aspect-video">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${meta.videoId}?rel=0&modestbranding=1`}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>
      </div>
    );
  }

  if (meta.type === "vimeo" && meta.videoId) {
    return (
      <div className="my-3 rounded-2xl overflow-hidden border border-border/80 bg-black shadow-md">
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 text-white text-xs border-b border-zinc-800">
          <div className="flex items-center gap-1.5 font-bold">
            <Video className="h-4 w-4 text-sky-400" />
            <span>Vimeo Video Embed</span>
          </div>
          <a
            href={meta.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white underline"
          >
            <span>Watch on Vimeo</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="relative w-full aspect-video">
          <iframe
            src={`https://player.vimeo.com/video/${meta.videoId}`}
            title="Vimeo video player"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>
      </div>
    );
  }

  if (meta.type === "video") {
    return (
      <div className="my-3 rounded-2xl overflow-hidden border border-border/80 bg-black shadow-md">
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 text-white text-xs border-b border-zinc-800">
          <div className="flex items-center gap-1.5 font-bold">
            <Play className="h-4 w-4 text-emerald-400" />
            <span>Shared Media Video</span>
          </div>
          <a
            href={meta.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white underline"
          >
            <span>Open Source</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="relative w-full aspect-video bg-black flex items-center justify-center">
          <video
            src={meta.url}
            controls
            playsInline
            className="max-h-full max-w-full rounded-b-2xl"
          />
        </div>
      </div>
    );
  }

  if (meta.type === "whatsapp") {
    return (
      <div className="my-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/5 border border-emerald-500/30 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
            <MessageCircle className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-emerald-950 dark:text-emerald-200">
                WhatsApp Direct Link
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                Verified
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {meta.phoneOrGroup ? `Connect via ${meta.phoneOrGroup}` : meta.url}
            </p>
          </div>
        </div>
        <a
          href={meta.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-sm transition-all duration-150"
        >
          <MessageCircle className="h-4 w-4" />
          <span>Open WhatsApp Chat</span>
          <ExternalLink className="h-3 w-3 ml-0.5 opacity-80" />
        </a>
      </div>
    );
  }

  if (meta.type === "facebook") {
    return (
      <div className="my-3 p-4 rounded-2xl bg-gradient-to-r from-blue-600/15 via-indigo-500/10 to-blue-500/5 border border-blue-500/30 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-11 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20 font-black text-xl">
            f
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-blue-950 dark:text-blue-200">
                Facebook Community & Media
              </span>
              <span className="text-[10px] bg-blue-500/20 text-blue-800 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full">
                Social Link
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{meta.url}</p>
          </div>
        </div>
        <a
          href={meta.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl text-xs font-bold bg-[#1877F2] hover:bg-[#166fe5] text-white shrink-0 shadow-sm transition-all duration-150"
        >
          <span>View on Facebook</span>
          <ExternalLink className="h-3 w-3 ml-0.5 opacity-80" />
        </a>
      </div>
    );
  }

  // Instagram / Twitter / Telegram / Generic Link
  const isInstagram = meta.type === "instagram";
  const isTwitter = meta.type === "twitter";
  const isTelegram = meta.type === "telegram";

  let brandColor = "bg-muted/40 border-border/80";
  let brandTitle = `External Link (${meta.domain})`;
  let buttonLabel = "Visit Website";
  let btnClass = "bg-primary hover:bg-primary/90 text-primary-foreground";

  if (isInstagram) {
    brandColor = "bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-amber-500/10 border-pink-500/30";
    brandTitle = "Instagram Profile / Post";
    buttonLabel = "View on Instagram";
    btnClass = "bg-gradient-to-r from-purple-600 to-pink-600 text-white";
  } else if (isTwitter) {
    brandColor = "bg-zinc-500/10 border-zinc-500/30";
    brandTitle = "X (Twitter) Post";
    buttonLabel = "View on X";
    btnClass = "bg-black text-white hover:bg-zinc-800";
  } else if (isTelegram) {
    brandColor = "bg-sky-500/10 border-sky-500/30";
    brandTitle = "Telegram Channel / Group";
    buttonLabel = "Join Telegram";
    btnClass = "bg-sky-600 hover:bg-sky-700 text-white";
  }

  return (
    <div className={`my-3 p-3.5 sm:p-4 rounded-2xl border ${brandColor} shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-10 rounded-xl bg-background border flex items-center justify-center shrink-0 shadow-xs">
          <Globe className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs sm:text-sm text-foreground truncate">{brandTitle}</span>
            <span className="text-[10px] font-mono text-muted-foreground uppercase">{meta.domain}</span>
          </div>
          <p className="text-[11px] sm:text-xs text-muted-foreground truncate mt-0.5">{meta.url}</p>
        </div>
      </div>
      <a
        href={meta.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center justify-center gap-1.5 h-8 sm:h-9 px-3.5 rounded-xl text-xs font-bold shrink-0 transition-all ${btnClass}`}
      >
        <span>{buttonLabel}</span>
        <ExternalLink className="h-3 w-3 opacity-80" />
      </a>
    </div>
  );
}

/**
 * Rich Formatted Content with Clickable Links and Embedded Rich Media
 */
export function ForumFormattedContent({ content }: { content: string }) {
  if (!content) return null;

  const links = extractUrls(content);

  // Simple token parser to turn links inside text into clickable spans
  const renderTextWithClickableLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|wa\.me\/[^\s]+)/gi;
    const parts = text.split(urlRegex);

    return parts.map((part, idx) => {
      if (urlRegex.test(part)) {
        let href = part;
        if (!href.startsWith("http://") && !href.startsWith("https://")) {
          href = "https://" + href;
        }
        return (
          <a
            key={idx}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-semibold hover:underline inline-flex items-center gap-0.5 break-all"
            onClick={(e) => e.stopPropagation()}
          >
            <span>{part}</span>
            <ExternalLink className="h-3 w-3 inline shrink-0" />
          </a>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div className="space-y-3 min-w-0 max-w-full">
      <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed text-foreground/90 break-words [overflow-wrap:anywhere] min-w-0 max-w-full">
        {renderTextWithClickableLinks(content)}
      </div>

      {/* Embedded Rich Links / Video / Social Previews */}
      {links.length > 0 && (
        <div className="space-y-2 pt-1 min-w-0 max-w-full">
          {links.slice(0, 3).map((meta, i) => (
            <ForumLinkCard key={i} meta={meta} />
          ))}
        </div>
      )}
    </div>
  );
}
