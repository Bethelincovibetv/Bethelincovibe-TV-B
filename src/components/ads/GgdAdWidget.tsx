import React, { useEffect, useState } from "react";
import { fetchGgdAds, trackGgdEvent, GgdAdItem, DEFAULT_GGD_API_KEY } from "@/services/ggdAdNetworkService";
import { ExternalLink, Sparkles, RefreshCw, Eye, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface GgdAdWidgetProps {
  limit?: number;
  autoRotateInterval?: number; // default 8000ms
  className?: string;
  variant?: "banner" | "card" | "compact";
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
    const res = await fetchGgdAds(limit);
    if (res.success && res.ads.length > 0) {
      setAds(res.ads);
    }
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

  const handleClick = () => {
    if (!currentAd) return;
    trackGgdEvent(currentAd.id, "click");
    if (currentAd.target_url) {
      window.open(currentAd.target_url, "_blank", "noopener,noreferrer");
    }
  };

  if (loading && ads.length === 0) {
    return (
      <div className={`p-4 rounded-2xl bg-muted/40 animate-pulse border border-border/50 text-center ${className}`}>
        <p className="text-xs text-muted-foreground">Loading GGD Ad Network sponsor...</p>
      </div>
    );
  }

  if (!currentAd) return null;

  if (variant === "compact") {
    return (
      <div
        id="ggd-ad-container"
        onClick={handleClick}
        className={`group cursor-pointer flex items-center gap-3 p-2.5 rounded-xl border border-border/70 bg-card hover:border-primary/50 transition shadow-xs ${className}`}
      >
        {currentAd.image_url && (
          <img
            src={currentAd.image_url}
            alt={currentAd.title}
            className="w-12 h-12 object-cover rounded-lg shrink-0 border"
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

  return (
    <div
      id="ggd-ad-container"
      onClick={handleClick}
      className={`group cursor-pointer max-w-full my-3 rounded-2xl overflow-hidden border border-border/80 bg-card shadow-md hover:border-primary/50 transition-all duration-300 font-sans ${className}`}
    >
      {currentAd.image_url && (
        <div className="w-full max-h-56 overflow-hidden bg-muted relative">
          <img
            src={currentAd.image_url}
            alt={currentAd.title}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-full text-[10px] font-semibold">
            <Sparkles className="h-3 w-3 text-amber-400" />
            <span>GGD Network Sponsor</span>
          </div>
        </div>
      )}

      <div className="p-3.5 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
              {currentAd.title}
              <ExternalLink className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
            </h3>
            {currentAd.description && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {currentAd.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-muted/40 px-3.5 py-1.5 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/50">
        <span className="font-medium">Ad delivered by GGD AD NETWORK</span>
        <span className="flex items-center gap-1 text-[9px] text-primary font-bold">
          Verified Partner ⚡
        </span>
      </div>
    </div>
  );
}
