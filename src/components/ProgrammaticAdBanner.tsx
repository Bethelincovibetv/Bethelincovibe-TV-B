import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";
import LiveRotatingAdvert, { AdvertItem } from "@/components/ads/LiveRotatingAdvert";
import { fetchGgdAds, trackGgdEvent } from "@/services/ggdAdNetworkService";

export interface ProgrammaticAdBannerProps {
  placement?:
    | "home"
    | "homepage"
    | "blog"
    | "dashboard"
    | "shop"
    | "listings"
    | "directory"
    | "header"
    | "footer"
    | "sidebar"
    | "in_article"
    | "services"
    | "marketplace"
    | "products"
    | string;
  className?: string;
  format?: "banner" | "card" | "compact" | "feed" | "flyer" | "billboard";
  autoRotateInterval?: number;
}

const PLACEMENT_ALIASES: Record<string, string[]> = {
  home: ["home", "homepage", "all"],
  homepage: ["home", "homepage", "all"],
  shop: ["shop", "marketplace", "products", "store", "all"],
  marketplace: ["shop", "marketplace", "products", "store", "all"],
  products: ["shop", "products", "marketplace", "store", "all"],
  listings: ["listings", "directory", "businesses", "services", "all"],
  directory: ["directory", "listings", "businesses", "services", "all"],
  businesses: ["businesses", "directory", "listings", "services", "all"],
  services: ["services", "listings", "businesses", "directory", "all"],
  blog: ["blog", "article", "in_article", "editorial", "all"],
  article: ["blog", "article", "in_article", "editorial", "all"],
  in_article: ["blog", "article", "in_article", "editorial", "all"],
  dashboard: ["dashboard", "user_dashboard", "all"],
  header: ["header", "all"],
  footer: ["footer", "all"],
  sidebar: ["sidebar", "all"],
  all: ["all", "home", "shop", "listings", "blog", "dashboard"],
};

export default function ProgrammaticAdBanner({
  placement = "marketplace",
  className = "",
  format = "banner",
  autoRotateInterval = 7000,
}: ProgrammaticAdBannerProps) {
  const { flags } = useFeatureFlags();
  const [adsList, setAdsList] = useState<AdvertItem[]>([]);
  const [watermark, setWatermark] = useState<{ text?: string; url?: string }>({});
  const [loading, setLoading] = useState(true);

  const targetPlacement = (placement || "marketplace").toLowerCase().trim();

  // Check admin feature flag toggles
  const isFeatureDisabled =
    flags.advertise === false ||
    ((targetPlacement === "marketplace" || targetPlacement === "shop" || targetPlacement === "products") &&
      flags.ads_marketplace === false) ||
    ((targetPlacement === "blog" || targetPlacement === "article" || targetPlacement === "in_article") &&
      flags.ads_blog === false) ||
    (targetPlacement === "dashboard" && flags.ads_dashboard === false) ||
    ((targetPlacement === "listings" || targetPlacement === "services" || targetPlacement === "businesses" || targetPlacement === "directory") &&
      flags.ads_directory === false);

  useEffect(() => {
    if (isFeatureDisabled) {
      setAdsList([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchProgrammaticAds() {
      try {
        setLoading(true);
        const candidateKeys = PLACEMENT_ALIASES[targetPlacement] || [targetPlacement, "all"];

        // 1. Fetch site ad controls & placement toggles
        const placementSettingKeys = candidateKeys.map((k) => `ad_placement_${k}_enabled`);
        const { data: settings } = await supabase
          .from("site_settings")
          .select("key, value")
          .in("key", [
            "ads_global_enabled",
            "ads_provider_native",
            `ad_placement_${targetPlacement}_enabled`,
            "ad_placement_home_enabled",
            "ad_placement_marketplace_enabled",
            "ad_placement_shop_enabled",
            "ad_placement_products_enabled",
            "ad_placement_listings_enabled",
            "ad_placement_directory_enabled",
            "ad_placement_blog_enabled",
            "ad_placement_dashboard_enabled",
            ...placementSettingKeys,
            "ad_watermark_text",
            "ad_watermark_url",
          ]);

        const settingsMap: Record<string, string> = {};
        (settings || []).forEach((s: any) => {
          settingsMap[s.key] = s.value || "";
        });

        // Master switch check
        const isMasterDisabled =
          settingsMap.ads_global_enabled === "false" || settingsMap.ads_provider_native === "false";

        // Specific placement switch check
        let isPlacementDisabled = false;
        if (settingsMap[`ad_placement_${targetPlacement}_enabled`] === "false") {
          isPlacementDisabled = true;
        } else if (
          (targetPlacement === "marketplace" || targetPlacement === "shop" || targetPlacement === "products") &&
          settingsMap.ad_placement_marketplace_enabled === "false" &&
          settingsMap.ad_placement_shop_enabled === "false" &&
          settingsMap.ad_placement_products_enabled === "false"
        ) {
          isPlacementDisabled = true;
        }

        if (isMasterDisabled || isPlacementDisabled) {
          if (isMounted) setAdsList([]);
          return;
        }

        const watermarkInfo = {
          text: settingsMap.ad_watermark_text || "Bethelincovibe TV",
          url: settingsMap.ad_watermark_url,
        };

        const fetchedAds: AdvertItem[] = [];

        // Strategy A: Direct query for user_ads table (works when user has read access, e.g. authenticated/admin)
        try {
          const { data: directAds } = await supabase
            .from("user_ads")
            .select("*")
            .in("status", ["active", "approved"]);

          if (directAds && directAds.length > 0) {
            const now = Date.now();
            const validDirect = directAds.filter((a: any) => {
              if (a.status !== "active" && a.status !== "approved") return false;
              if (a.starts_at && new Date(a.starts_at).getTime() > now) return false;
              if (a.ends_at && new Date(a.ends_at).getTime() < now) return false;
              if (!a.image_url) return false;
              if (!a.placement || a.placement === "all") return true;
              const places = a.placement.toLowerCase().split(",").map((p: string) => p.trim());
              return places.some((p: string) => candidateKeys.includes(p) || p === "all");
            });

            validDirect.forEach((item: any) => {
              if (!fetchedAds.some((a) => a.id === item.id) && item.image_url) {
                const ggdData = item.ggd_response && typeof item.ggd_response === "object" ? item.ggd_response : {};
                fetchedAds.push({
                  id: item.id,
                  title: item.title,
                  description: item.description,
                  image_url: item.image_url,
                  target_url: item.target_url || item.click_url,
                  click_url: item.click_url,
                  sponsor_name: item.sponsor_name || "Verified Partner",
                  badge_text: "Verified Ad",
                  urgency_tag: "🔥 Active Verified Campaign",
                  social_proof: "Verified sponsor on Bethelincovibe TV",
                  is_verified: true,
                  display_template: ggdData.display_template || item.display_template || undefined,
                  experience_type: ggdData.experience_type || item.experience_type || undefined,
                  experience_config: ggdData.experience_config || item.experience_config || undefined,
                  whatsapp_number: ggdData.whatsapp_number || item.whatsapp_number || undefined,
                });
              }
            });
          }
        } catch {}

        // Strategy B: Security Definer RPC serve_random_ad (works universally for any user / anon without RLS restriction)
        for (const candidateKey of candidateKeys) {
          try {
            // Sample multiple times to discover distinct active ads if multiple exist for this placement
            for (let attempt = 0; attempt < 3; attempt++) {
              const { data: rpcAd, error: rpcErr } = await supabase.rpc("serve_random_ad", {
                _placement: candidateKey,
              });

              if (!rpcErr && rpcAd) {
                const items = Array.isArray(rpcAd) ? rpcAd : [rpcAd];
                let foundNew = false;
                items.forEach((item: any) => {
                  if (item && item.id && item.image_url && !fetchedAds.some((a) => a.id === item.id)) {
                    foundNew = true;
                    fetchedAds.push({
                      id: item.id,
                      title: item.title,
                      description: item.description,
                      image_url: item.image_url,
                      target_url: item.target_url || item.click_url,
                      click_url: item.click_url,
                      sponsor_name: item.sponsor_name || "Verified Partner",
                      badge_text: "Verified Ad",
                      urgency_tag: "⚡ Exclusive Partner Offer",
                      social_proof: "Verified advertiser on Bethelincovibe TV",
                      is_verified: true,
                    });
                  }
                });
                if (!foundNew && attempt > 0) break;
              } else {
                break;
              }
            }
          } catch {
            // continue checking other candidate placements
          }
        }

        // Strategy C: Ad-server Edge Function as an additional source if direct/rpc didn't return any
        if (fetchedAds.length === 0) {
          try {
            const edgeRes = await fetch(
              `https://gndcgttnpxsjufmehgyi.supabase.co/functions/v1/ad-server?placement=${encodeURIComponent(
                targetPlacement
              )}`
            );
            if (edgeRes.ok) {
              const edgeData = await edgeRes.json();
              if (edgeData?.ad && edgeData.ad.id && edgeData.ad.image_url) {
                const item = edgeData.ad;
                if (!fetchedAds.some((a) => a.id === item.id)) {
                  fetchedAds.push({
                    id: item.id,
                    title: item.title,
                    description: item.description,
                    image_url: item.image_url,
                    target_url: item.click_url || item.target_url,
                    click_url: item.click_url,
                    sponsor_name: "Verified Sponsor",
                    badge_text: "Verified Ad",
                    urgency_tag: "⚡ Exclusive Partner Offer",
                    social_proof: "Verified advertiser on Bethelincovibe TV",
                    is_verified: true,
                  });
                }
              }
            }
          } catch {
            // Ignore edge function error
          }
        }

        // Strategy D: GGD Ad Network Direct API Integration
        try {
          const ggdResult = await fetchGgdAds(5);
          if (ggdResult.success && Array.isArray(ggdResult.ads) && ggdResult.ads.length > 0) {
            ggdResult.ads.forEach((item) => {
              if (item.image_url && !fetchedAds.some((a) => a.id === item.id)) {
                fetchedAds.push({
                  id: item.id,
                  title: item.title,
                  description: item.description || "Exclusive verified offer on GGD Ad Network",
                  image_url: item.image_url,
                  target_url: item.target_url,
                  click_url: item.target_url,
                  sponsor_name: "GGD Partner Sponsor",
                  badge_text: "GGD Direct Ad",
                  urgency_tag: "⚡ GGD Ad Network",
                  social_proof: "Verified partner offer on GGD Network",
                  is_verified: true,
                });
              }
            });
          }
        } catch {
          // Ignore GGD ad network error
        }

        // STRICT REQUIREMENT:
        // No fake fallbacks, no curated demo banners, no static placeholders.
        // If there is no real, verified, approved, and currently active ad, fetchedAds is empty.
        if (isMounted) {
          setWatermark(watermarkInfo);
          setAdsList(fetchedAds);
        }
      } catch (err) {
        console.warn("Programmatic ad engine fetch error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchProgrammaticAds();

    return () => {
      isMounted = false;
    };
  }, [placement, isFeatureDisabled, targetPlacement]);

  const handleImpression = async (ad: AdvertItem) => {
    if (!ad || !ad.id) return;
    try {
      await supabase.from("ad_events").insert({
        ad_id: ad.id,
        event_type: "impression",
        page_path: window.location.pathname,
      });
    } catch {
      // Ignored if client lacks insert policy; serve_random_ad RPC and ad-server already increment impressions server-side
    }
  };

  const handleAdClick = async (ad: AdvertItem) => {
    if (!ad || !ad.id) return;
    try {
      // Call security definer RPC to record click
      const { data: targetUrl } = await supabase.rpc("record_ad_click", { _ad_id: ad.id });
      if (targetUrl && typeof targetUrl === "string") {
        window.open(targetUrl, "_blank", "noopener,noreferrer");
        return;
      }
    } catch {
      // Fallback direct update if RPC is unavailable
      try {
        const currentClicks = Number(ad.clicks || 0);
        await supabase
          .from("user_ads")
          .update({ clicks: currentClicks + 1 })
          .eq("id", ad.id);
      } catch {}
    }

    // Navigate to ad target URL
    const destination = ad.target_url || ad.click_url;
    if (destination) {
      window.open(destination, "_blank", "noopener,noreferrer");
    }
  };

  // If there are no real verified active advertisements, collapse and hide the container completely
  if (adsList.length === 0) return null;

  return (
    <LiveRotatingAdvert
      ads={adsList}
      watermark={watermark}
      format={format}
      autoRotateInterval={autoRotateInterval}
      className={className}
      onAdClick={handleAdClick}
      onImpression={handleImpression}
    />
  );
}
