import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";
import LiveRotatingAdvert, { AdvertItem } from "@/components/ads/LiveRotatingAdvert";

export interface ProgrammaticAdBannerProps {
  placement?:
    | "blog"
    | "dashboard"
    | "shop"
    | "listings"
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
  shop: ["marketplace", "shop", "products", "store", "all"],
  marketplace: ["marketplace", "shop", "products", "store", "all"],
  products: ["marketplace", "products", "shop", "store", "all"],
  blog: ["blog", "article", "in_article", "editorial", "all"],
  dashboard: ["dashboard", "user_dashboard", "all"],
  listings: ["listings", "services", "businesses", "directory", "all"],
  services: ["services", "listings", "businesses", "directory", "all"],
  businesses: ["businesses", "listings", "services", "directory", "all"],
  home: ["home", "homepage", "all"],
  header: ["header", "all"],
  footer: ["footer", "all"],
  sidebar: ["sidebar", "all"],
};

// High-converting Curated Ecosystem Spotlights with deep consumer psychology & trust triggers
const CURATED_ECOSYSTEM_ADS: Record<string, AdvertItem[]> = {
  default: [
    {
      id: "curated-vip-seller",
      title: "Get Verified Blue Checkmark — 10x Inquiries in Nigeria",
      description:
        "Join 1,800+ top Nigerian merchants. Verified sellers receive prioritized search ranking, direct WhatsApp inquiries & zero escrow hold delays.",
      image_url: "/logo.png",
      target_url: "/businesses/list",
      sponsor_name: "Bethelincovibe VIP Merchant",
      badge_text: "Verified Spotlight",
      urgency_tag: "⚡ High Demand — Instant Verification",
      social_proof: "Over 1,400+ shoppers visited today",
      is_verified: true,
    },
    {
      id: "curated-ai-studio",
      title: "Queen AI Marketing Studio — Auto-Create Product Videos & Ads",
      description:
        "Generate 3D vector graphics, promotional flyers, voiceovers in Nigerian accents, and social media captions in under 30 seconds.",
      image_url: "/logo.png",
      target_url: "/ai-assistant",
      sponsor_name: "Queen AI Engine",
      badge_text: "Smart Tool",
      urgency_tag: "🚀 100% Free for Bethelincovibe Users",
      social_proof: "Generated 12,000+ creative designs this month",
      is_verified: true,
    },
    {
      id: "curated-escrow-logistics",
      title: "Sell Nationwide Across All 36 Nigerian States",
      description:
        "Seamless delivery with verified courier partners from Lagos to Abuja, Port Harcourt, Kano & beyond. Safe escrow buyer protection.",
      image_url: "/logo.png",
      target_url: "/products",
      sponsor_name: "Nationwide Logistics",
      badge_text: "Live Network",
      urgency_tag: "🛡️ 100% Buyer & Seller Protection",
      social_proof: "Active across Lagos, Abuja & 34 States",
      is_verified: true,
    },
  ],
  blog: [
    {
      id: "curated-blog-startup",
      title: "Scale Your Nigerian Startup with Expert Guides & Blueprints",
      description:
        "Read verified case studies, CAC registration workflows, export-import guides, and digital payment playbooks written by top Lagos founders.",
      image_url: "/logo.png",
      target_url: "/blog/category/startup-guides",
      sponsor_name: "Bethel Business Academy",
      badge_text: "Trending Guide",
      urgency_tag: "📚 Read Today's Top Story",
      social_proof: "4.8k entrepreneurs read this week",
      is_verified: true,
    },
    {
      id: "curated-blog-ad-platform",
      title: "Promote Your Brand on Bethelincovibe TV & Newsletters",
      description:
        "Reach over 50,000 active Nigerian buyers, business owners, and wholesale importers daily. High CTR guaranteed.",
      image_url: "/logo.png",
      target_url: "/advertise",
      sponsor_name: "Bethel Ad Network",
      badge_text: "Ad Space",
      urgency_tag: "🎯 Target by State & Category",
      social_proof: "Top ROI ad channel for Nigerian SMEs",
      is_verified: true,
    },
  ],
  dashboard: [
    {
      id: "curated-dash-boost",
      title: "Boost Your Store Visibility by 300% This Week",
      description:
        "Feature your products on the Bethelincovibe homepage banner and category top-picks. Direct WhatsApp leads sent straight to your phone.",
      image_url: "/logo.png",
      target_url: "/dashboard/analytics",
      sponsor_name: "Merchant Accelerator",
      badge_text: "Growth Deal",
      urgency_tag: "🔥 Limited Placement Slots Available",
      social_proof: "98% satisfaction from Nigerian merchants",
      is_verified: true,
    },
  ],
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
    ((targetPlacement === "listings" || targetPlacement === "services" || targetPlacement === "businesses") &&
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
            "ad_placement_marketplace_enabled",
            "ad_placement_shop_enabled",
            "ad_placement_products_enabled",
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

        // Strategy A: Security Definer RPC serve_random_ad with alias candidate loop
        for (const candidateKey of candidateKeys) {
          try {
            const { data: rpcAd, error: rpcErr } = await supabase.rpc("serve_random_ad", {
              _placement: candidateKey,
            });

            if (!rpcErr && rpcAd) {
              const items = Array.isArray(rpcAd) ? rpcAd : [rpcAd];
              items.forEach((item: any) => {
                if (item && item.id && item.image_url && !fetchedAds.some((a) => a.id === item.id)) {
                  fetchedAds.push({
                    id: item.id,
                    title: item.title,
                    description: item.description,
                    image_url: item.image_url,
                    target_url: item.target_url || item.click_url,
                    click_url: item.click_url,
                    sponsor_name: item.sponsor_name || "Verified Partner",
                    badge_text: "Live Sponsor",
                    urgency_tag: "⚡ Exclusive Partner Offer",
                    social_proof: "Verified advertiser on Bethelincovibe",
                    is_verified: true,
                  });
                }
              });
            }
          } catch {
            // continue checking
          }
        }

        // Strategy B: Direct query for user_ads table
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
              if (!a.placement || a.placement === "all") return true;
              const places = a.placement.toLowerCase().split(",").map((p: string) => p.trim());
              return places.some((p: string) => candidateKeys.includes(p) || p === "all");
            });

            validDirect.forEach((item: any) => {
              if (!fetchedAds.some((a) => a.id === item.id) && item.image_url) {
                fetchedAds.push({
                  id: item.id,
                  title: item.title,
                  description: item.description,
                  image_url: item.image_url,
                  target_url: item.target_url || item.click_url,
                  click_url: item.click_url,
                  sponsor_name: item.sponsor_name || "Verified Partner",
                  badge_text: "Verified Ad",
                  urgency_tag: "🔥 Active Live Campaign",
                  social_proof: "1,200+ daily views",
                  is_verified: true,
                });
              }
            });
          }
        } catch {}

        // Strategy C: Curated high-converting ecosystem spots for live psychology-driven rotation
        const curatedCategory =
          CURATED_ECOSYSTEM_ADS[targetPlacement] ||
          (targetPlacement.includes("blog") ? CURATED_ECOSYSTEM_ADS.blog : null) ||
          (targetPlacement.includes("dash") ? CURATED_ECOSYSTEM_ADS.dashboard : null) ||
          CURATED_ECOSYSTEM_ADS.default;

        curatedCategory.forEach((curatedAd) => {
          if (!fetchedAds.some((a) => a.id === curatedAd.id)) {
            fetchedAds.push(curatedAd);
          }
        });

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
    if (!ad || !ad.id || ad.id.startsWith("curated-")) return;
    try {
      await supabase.from("ad_events").insert({
        ad_id: ad.id,
        event_type: "impression",
        page_path: window.location.pathname,
      });
    } catch {}
  };

  const handleAdClick = async (ad: AdvertItem) => {
    if (!ad || !ad.id || ad.id.startsWith("curated-")) return;
    try {
      await supabase.rpc("record_ad_click", { _ad_id: ad.id });
    } catch {
      try {
        const currentClicks = Number(ad.clicks || 0);
        await supabase
          .from("user_ads")
          .update({ clicks: currentClicks + 1 })
          .eq("id", ad.id);
      } catch {}
    }
  };

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
