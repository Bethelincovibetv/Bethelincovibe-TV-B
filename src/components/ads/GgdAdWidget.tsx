import React, { useEffect, useState } from "react";
import { fetchGgdAds, trackGgdEvent, GgdAdItem } from "@/services/ggdAdNetworkService";
import { ExternalLink, Sparkles, ArrowUpRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface GgdAdWidgetProps {
  limit?: number;
  autoRotateInterval?: number; // default 8000ms
  className?: string;
  variant?: "banner" | "card" | "compact" | "jiji-card";
}

export default function GgdAdWidget({
  limit = 10,
  autoRotateInterval = 8000,
  className = "",
  variant = "banner",
}: GgdAdWidgetProps) {
  const [ads, setAds] = useState<GgdAdItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadAds = async () => {
    setLoading(true);
    try {
      const res = await fetchGgdAds(limit);
      if (res.success && res.ads.length > 0) {
        setAds(res.ads);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadAds();
  }, [limit]);

  // Rotate ads
  useEffect(() => {
    if (ads.length <= 1) return;
    const timer = setInterval(() => {
      setIdx((prev) => (prev + 1) % ads.length);
    }, autoRotateInterval);
    return () => clearInterval(timer);
  }, [ads.length, autoRotateInterval]);

  const currentAd = ads[idx];

  // Track impression whenever currentAd changes
  useEffect(() => {
    if (currentAd?.id) {
      trackGgdEvent(currentAd.id, "impression");
    }
  }, [currentAd?.id]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentAd) return;
    trackGgdEvent(currentAd.id, "click");
    if (currentAd.target_url) {
      window.open(currentAd.target_url, "_blank", "noopener,noreferrer");
    }
  };

  if (loading && ads.length === 0) {
    return null;
  }

  if (!currentAd) return null;

  // Jiji-style Native Product Card Format (blends directly into the marketplace grid)
  if (variant === "jiji-card") {
    return (
      <div
        id="ggd-ad-container"
        onClick={handleClick}
        className={`group cursor-pointer flex h-full flex-col overflow-hidden rounded-2xl border-2 border-emerald-500/40 bg-card hover:border-emerald-500 hover:shadow-lg transition-all active:scale-[0.99] font-sans ${className}`}
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          {currentAd.image_url ? (
            <img
              src={currentAd.image_url}
              alt={currentAd.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-emerald-600/20 to-teal-500/20">
              <Sparkles className="h-8 w-8 text-emerald-500" />
            </div>
          )}
          <div className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-emerald-600 text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-sm">
            <span>⚡ Sponsored</span>
          </div>
          <div className="absolute bottom-1.5 right-1.5 rounded-md bg-black/70 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-bold text-white">
            GGD Direct
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-between p-2.5 sm:p-3 space-y-1.5">
          <div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              <span>Verified Partner Offer</span>
            </div>
            <h3 className="line-clamp-2 text-xs sm:text-sm font-black leading-snug text-foreground group-hover:text-primary transition-colors mt-0.5">
              {currentAd.title}
            </h3>
            {currentAd.description && (
              <p className="line-clamp-1 text-[11px] text-muted-foreground mt-0.5">
                {currentAd.description}
              </p>
            )}
          </div>

          <div className="pt-1.5 border-t border-border/50">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
                Top Sponsor Deal
              </span>
              <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[80px]">
                Lagos • GGD
              </span>
            </div>
            <button
              type="button"
              className="w-full flex items-center justify-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-1.5 px-2 transition-colors shadow-xs"
            >
              <span>Visit Direct Ad</span>
              <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        id="ggd-ad-container"
        onClick={handleClick}
        className={`group cursor-pointer flex items-center gap-3 p-2 rounded-xl border border-border/80 bg-card hover:border-emerald-500/60 transition shadow-xs ${className}`}
      >
        {currentAd.image_url && (
          <img
            src={currentAd.image_url}
            alt={currentAd.title}
            className="w-10 h-10 object-cover rounded-lg shrink-0 border border-border/50"
            loading="lazy"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold truncate group-hover:text-primary transition">{currentAd.title}</span>
            <Badge variant="outline" className="text-[9px] px-1 py-0 font-semibold text-emerald-600 bg-emerald-500/10">
              GGD Ad
            </Badge>
          </div>
          {currentAd.description && (
            <p className="text-[11px] text-muted-foreground truncate">{currentAd.description}</p>
          )}
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 transition" />
      </div>
    );
  }

  // Banner variant: lean, attractive, tight padding, modern Jiji-compatible design
  return (
    <div
      id="ggd-ad-container"
      onClick={handleClick}
      className={`group cursor-pointer relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-card to-card hover:border-emerald-500/60 shadow-xs hover:shadow-md transition-all duration-300 font-sans ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between p-2.5 sm:p-3 gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1 w-full">
          {currentAd.image_url && (
            <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-xl overflow-hidden border border-border/60 bg-muted">
              <img
                src={currentAd.image_url}
                alt={currentAd.title}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              <span className="absolute top-0 left-0 bg-emerald-600 text-white text-[8px] font-black uppercase px-1 rounded-br-md">
                GGD
              </span>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-md">
                <Sparkles className="h-2.5 w-2.5" /> GGD Direct Ad Display
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold">
                • Verified Sponsor
              </span>
            </div>

            <h3 className="text-xs sm:text-sm font-extrabold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
              {currentAd.title}
            </h3>

            {currentAd.description && (
              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 leading-snug">
                {currentAd.description}
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-border/40">
          <button
            type="button"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition-transform active:scale-95 whitespace-nowrap"
          >
            <span>Open Direct Ad</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
