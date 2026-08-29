import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Megaphone, ExternalLink, Sparkles, ShieldCheck } from "lucide-react";

export interface ProgrammaticAdBannerProps {
  placement?: "blog" | "dashboard" | "shop" | "listings" | "header" | "footer" | "sidebar" | "in_article" | string;
  className?: string;
  format?: "banner" | "card" | "compact" | "feed" | "flyer" | "billboard";
}

export default function ProgrammaticAdBanner({
  placement = "dashboard",
  className = "",
  format = "banner",
}: ProgrammaticAdBannerProps) {
  const [ad, setAd] = useState<any>(null);
  const [watermark, setWatermark] = useState<{ text?: string; url?: string }>({});
  const [loading, setLoading] = useState(true);
  const impressionRecorded = useRef(false);

  let suppressAds = false;
  try {
    const auth = useAuth();
    const email = auth?.user?.email?.toLowerCase();
    // Do not suppress ads for testing unless explicitly opted out
    if (auth?.isAdmin && (email === "bethelgoodgift3@gmail.com" || email === "goodgiftdigital@gmail.com")) {
      suppressAds = false; // allow admin to see and verify ads live
    }
  } catch {}

  useEffect(() => {
    let isMounted = true;
    impressionRecorded.current = false;

    async function fetchProgrammaticAd() {
      try {
        setLoading(true);

        // 1. Fetch site ad controls
        const { data: settings } = await supabase
          .from("site_settings")
          .select("key, value")
          .in("key", [
            "ads_global_enabled",
            "ads_provider_native",
            "ad_server_enabled",
            `ad_placement_${placement}_enabled`,
            "ad_watermark_text",
            "ad_watermark_url",
          ]);

        const settingsMap: Record<string, string> = {};
        (settings || []).forEach((s: any) => {
          settingsMap[s.key] = s.value || "";
        });

        // If master switches disabled
        if (
          settingsMap.ads_global_enabled === "false" ||
          settingsMap.ads_provider_native === "false" ||
          settingsMap.ad_server_enabled === "false" ||
          settingsMap[`ad_placement_${placement}_enabled`] === "false"
        ) {
          if (isMounted) setAd(null);
          return;
        }

        const nowIso = new Date().toISOString();

        // 2. Query active user ads from database
        const { data: directAds } = await supabase
          .from("user_ads")
          .select("*")
          .eq("status", "active")
          .or(`ends_at.gte.${nowIso},ends_at.is.null`);

        let pool = directAds || [];

        // Filter by placement if candidates available
        if (pool.length > 0) {
          const placementMatches = pool.filter((a: any) => {
            if (!a.placement || a.placement === "all") return true;
            const places = a.placement.toLowerCase().split(",").map((p: string) => p.trim());
            return places.includes(placement.toLowerCase()) || places.includes("all");
          });

          if (placementMatches.length > 0) {
            pool = placementMatches;
          }
        }

        // Programmatic rotation: Pick ad with lowest impressions or random weighted
        if (pool.length > 0) {
          const sorted = [...pool].sort((a, b) => {
            const impA = Number(a.impressions || 0);
            const impB = Number(b.impressions || 0);
            return impA - impB + (Math.random() - 0.5) * 5;
          });

          const chosen = sorted[0];
          if (isMounted) {
            setAd(chosen);
            setWatermark({
              text: settingsMap.ad_watermark_text || "Bethelincovibe TV",
              url: settingsMap.ad_watermark_url,
            });

            // Record impression once
            if (!impressionRecorded.current && chosen.id) {
              impressionRecorded.current = true;
              recordImpression(chosen.id, Number(chosen.impressions || 0));
            }
          }
        } else {
          // Try edge function ad server as fallback
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          if (supabaseUrl) {
            try {
              const res = await fetch(
                `${supabaseUrl}/functions/v1/ad-server?placement=${placement}&page=${encodeURIComponent(
                  window.location.pathname
                )}`
              );
              const data = await res.json();
              if (isMounted && data?.ad) {
                setAd(data.ad);
                setWatermark({
                  text: settingsMap.ad_watermark_text || "Bethelincovibe TV",
                  url: settingsMap.ad_watermark_url,
                });
              }
            } catch {}
          }
        }
      } catch (err) {
        console.warn("Programmatic ad engine fetch error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchProgrammaticAd();

    return () => {
      isMounted = false;
    };
  }, [placement]);

  const recordImpression = async (adId: string, currentCount: number) => {
    try {
      await supabase
        .from("user_ads")
        .update({ impressions: currentCount + 1 })
        .eq("id", adId);
    } catch {}
  };

  const handleAdClick = async (e: React.MouseEvent) => {
    if (!ad) return;
    try {
      const currentClicks = Number(ad.clicks || 0);
      await supabase
        .from("user_ads")
        .update({ clicks: currentClicks + 1 })
        .eq("id", ad.id);
    } catch {}
  };

  if (suppressAds || !ad) return null;

  const targetHref = ad.target_url || ad.click_url || "#";
  const displayTitle = ad.title || "Featured Sponsor";
  const displayDesc = ad.description || "Discover verified goods, merchandise and exclusive deals on Bethelincovibe.";
  const displayImage = ad.image_url;

  // Format 1: Full Flyer Showcase Template (No cropping, full promotional graphic preserved)
  if (format === "flyer") {
    return (
      <div
        id={`ad-flyer-${ad.id}`}
        className={`group relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-card p-4 shadow-lg hover:shadow-2xl transition-all duration-300 ${className}`}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <Badge
            variant="default"
            className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-black uppercase tracking-wider px-2 py-0.5"
          >
            <Sparkles className="h-3 w-3 mr-1" /> Featured Flyer
          </Badge>
          <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Verified Partner
          </span>
        </div>

        {displayImage && (
          <a
            href={targetHref}
            target="_blank"
            rel="noopener sponsored"
            onClick={handleAdClick}
            className="relative block overflow-hidden rounded-xl bg-muted/40 mb-3.5 group-hover:opacity-95 transition-opacity"
          >
            <img
              src={displayImage}
              alt={displayTitle}
              loading="lazy"
              className="w-full max-h-[420px] object-contain mx-auto rounded-xl transition-transform duration-300 group-hover:scale-[1.01]"
            />
            {(watermark.url || watermark.text) && (
              <span className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-xs text-white text-[9px] px-2 py-0.5 rounded-md flex items-center gap-1 pointer-events-none">
                {watermark.url && <img src={watermark.url} alt="" className="h-3 w-3 object-contain" />}
                {watermark.text || "Bethelincovibe TV"}
              </span>
            )}
          </a>
        )}

        <div className="space-y-1.5 mb-3.5">
          <a
            href={targetHref}
            target="_blank"
            rel="noopener sponsored"
            onClick={handleAdClick}
            className="font-bold text-base text-foreground hover:text-primary transition-colors block"
          >
            {displayTitle}
          </a>
          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{displayDesc}</p>
        </div>

        <Button
          asChild
          size="sm"
          className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md text-xs h-10 gap-1.5"
        >
          <a href={targetHref} target="_blank" rel="noopener sponsored" onClick={handleAdClick}>
            View Full Offer <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    );
  }

  // Format 2: In-feed card (fits in product/business grids with FULL uncropped image scaling)
  if (format === "feed" || format === "card") {
    return (
      <div
        id={`ad-card-${ad.id}`}
        className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border-2 border-primary/25 bg-card/95 p-4 shadow-md hover:shadow-xl transition-all duration-300 ${className}`}
      >
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <Badge
            variant="default"
            className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-black uppercase tracking-wider px-2 py-0.5"
          >
            <Sparkles className="h-3 w-3 mr-1" /> Sponsored
          </Badge>
          <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-500" /> Verified Partner
          </span>
        </div>

        {displayImage && (
          <a
            href={targetHref}
            target="_blank"
            rel="noopener sponsored"
            onClick={handleAdClick}
            className="relative block overflow-hidden rounded-xl bg-muted/40 min-h-[160px] max-h-[260px] mb-3 group-hover:opacity-95 transition-opacity flex items-center justify-center"
          >
            <img
              src={displayImage}
              alt={displayTitle}
              loading="lazy"
              className="w-full max-h-[260px] object-contain rounded-xl transition-transform duration-500 group-hover:scale-105"
            />
            {(watermark.url || watermark.text) && (
              <span className="absolute bottom-1.5 right-1.5 bg-black/60 backdrop-blur-xs text-white text-[9px] px-1.5 py-0.5 rounded-md flex items-center gap-1 pointer-events-none">
                {watermark.url && <img src={watermark.url} alt="" className="h-2.5 w-2.5 object-contain" />}
                {watermark.text || "Bethelincovibe TV"}
              </span>
            )}
          </a>
        )}

        <div className="flex-1 space-y-1.5 mb-3">
          <a
            href={targetHref}
            target="_blank"
            rel="noopener sponsored"
            onClick={handleAdClick}
            className="font-bold text-sm sm:text-base text-foreground line-clamp-2 hover:text-primary transition-colors flex items-center gap-1.5"
          >
            {displayTitle}
          </a>
          <p className="text-xs text-muted-foreground line-clamp-2">{displayDesc}</p>
        </div>

        <Button
          asChild
          size="sm"
          className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-xs text-xs h-9 gap-1.5"
        >
          <a href={targetHref} target="_blank" rel="noopener sponsored" onClick={handleAdClick}>
            Visit Partner <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    );
  }

  // Format 3: Compact Inline Bar
  if (format === "compact") {
    return (
      <div
        id={`ad-compact-${ad.id}`}
        className={`my-2 flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-muted/40 px-3 py-2 shadow-xs ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[9px] font-black uppercase px-1.5 py-0">
            Ad
          </Badge>
          <a
            href={targetHref}
            target="_blank"
            rel="noopener sponsored"
            onClick={handleAdClick}
            className="text-xs font-bold text-foreground hover:text-primary transition truncate"
          >
            {displayTitle}
          </a>
        </div>
        <Button asChild size="sm" variant="ghost" className="h-7 text-xs font-bold px-2 shrink-0">
          <a href={targetHref} target="_blank" rel="noopener sponsored" onClick={handleAdClick}>
            Open <ExternalLink className="h-3 w-3 ml-1" />
          </a>
        </Button>
      </div>
    );
  }

  // Format 4: Standard Wide Banner (Preserving full artwork with uncropped scaling)
  return (
    <div
      id={`ad-banner-${ad.id}`}
      className={`my-4 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-card to-amber-500/5 p-3.5 sm:p-4 shadow-sm transition-all hover:border-primary/40 ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {displayImage && (
          <a
            href={targetHref}
            target="_blank"
            rel="noopener sponsored"
            onClick={handleAdClick}
            className="relative shrink-0 w-full sm:w-56 min-h-[100px] max-h-40 overflow-hidden rounded-xl bg-muted/40 shadow-xs group flex items-center justify-center"
          >
            <img
              src={displayImage}
              alt={displayTitle}
              loading="lazy"
              className="max-h-36 w-full object-contain rounded-xl transition-transform duration-300 group-hover:scale-105"
            />
            {(watermark.url || watermark.text) && (
              <span className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-xs text-white text-[8px] px-1 py-0.5 rounded flex items-center gap-1 pointer-events-none">
                {watermark.text || "Bethelincovibe TV"}
              </span>
            )}
          </a>
        )}

        <div className="flex-1 text-left space-y-1 w-full">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-black uppercase tracking-wider px-2 py-0.5"
            >
              <Megaphone className="h-2.5 w-2.5 mr-1" /> Sponsored
            </Badge>
            <span className="text-[11px] text-muted-foreground font-semibold">Featured Partner</span>
          </div>

          <a
            href={targetHref}
            target="_blank"
            rel="noopener sponsored"
            onClick={handleAdClick}
            className="block font-bold text-sm sm:text-base text-foreground hover:text-primary transition-colors"
          >
            {displayTitle}
          </a>

          <p className="text-xs text-muted-foreground line-clamp-2 max-w-2xl">{displayDesc}</p>
        </div>

        <div className="shrink-0 w-full sm:w-auto">
          <Button
            asChild
            size="sm"
            className="w-full sm:w-auto rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-xs text-xs h-9 px-4 gap-1.5"
          >
            <a href={targetHref} target="_blank" rel="noopener sponsored" onClick={handleAdClick}>
              Explore Now <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
