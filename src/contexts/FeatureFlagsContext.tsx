import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export type FeatureKey =
  | "blog" | "businesses" | "business_listing" | "business_boost"
  | "tools" | "inventory" | "coach" | "advertise" | "wallet"
  | "favorites" | "comments" | "push" | "daily_rewards" | "guest_blog"
  | "tv_videos" | "hero_slider" | "pwa_install" | "email_subscribe"
  | "ad_earnings" | "video_creator" | "sales_pages" | "ai_admin" | "ai_blogger"
  | "products" | "search" | "register" | "ai_auto_blog_slider" | "learn" | "forum" | "whatsapp_engine";

export const FEATURE_META: { key: FeatureKey; label: string; description: string }[] = [
  { key: "whatsapp_engine", label: "WhatsApp Status Engine", description: "Mutual Google Contacts exchange, audience growth, and status ad monetization" },
  { key: "blog", label: "Blog", description: "Blog posts, reading, and listing pages" },
  { key: "video_creator", label: "Video Studio & Creation", description: "AI Video Studio, video generator, and video creator navigation & dashboards" },
  { key: "products", label: "Product Marketplace", description: "Product listings, marketplace pages and selling" },
  { key: "businesses", label: "Business Directory", description: "Public business directory & profiles" },
  { key: "business_listing", label: "List a Business", description: "Allow users to submit new businesses" },
  { key: "business_boost", label: "Boost / Sponsorship", description: "Paid business boosting feature" },
  { key: "sales_pages", label: "Sales & Landing Pages", description: "Custom product landing and sales funnel pages" },
  { key: "tools", label: "Business Tools", description: "Startup calculator and entrepreneur tools" },
  { key: "inventory", label: "Inventory Manager", description: "Stock, sales and expense tracking" },
  { key: "coach", label: "AI Business Coach", description: "AI-powered business coaching chat" },
  { key: "ai_admin", label: "AI Administrator", description: "AI Strategy Director & Platform Intelligence console" },
  { key: "ai_blogger", label: "AI Blogger Studio", description: "Autonomous AI Blogging and content scheduling studio" },
  { key: "advertise", label: "Advertise With Us", description: "Advertising page and user ad submissions" },
  { key: "wallet", label: "Wallet", description: "User wallet and top-ups" },
  { key: "favorites", label: "Favorites", description: "Allow users to save favorite posts" },
  { key: "comments", label: "Blog Comments", description: "Comments on blog posts" },
  { key: "push", label: "Push Notifications", description: "Web push subscribe prompt & sending" },
  { key: "daily_rewards", label: "Daily Rewards", description: "Daily login reward credits" },
  { key: "guest_blog", label: "Guest Blog Submissions", description: "Allow paid guest blog submissions" },
  { key: "tv_videos", label: "TV Videos", description: "YouTube TV video carousel" },
  { key: "hero_slider", label: "Hero Slider", description: "Homepage hero slider" },
  { key: "pwa_install", label: "PWA Install Prompt", description: "Install app prompt" },
  { key: "email_subscribe", label: "Email Subscribe", description: "Newsletter subscription form" },
  { key: "search", label: "Site Search", description: "Global header search" },
  { key: "register", label: "Public Registration", description: "Allow new account sign-ups" },
  { key: "ai_auto_blog_slider", label: "Auto Blog Slider", description: "Automatically rotate top posts into the homepage slider" },
  { key: "learn", label: "Learning Hub", description: "Courses & video learning page (/learn)" },
  { key: "forum", label: "Community Forum", description: "Community Q&A and discussions (/forum)" },
  { key: "ad_earnings", label: "Ad Click Earnings", description: "Show 'Ad Earnings' card on user dashboards" },
];

type FlagsMap = Record<FeatureKey, boolean>;

const defaultFlags = FEATURE_META.reduce((acc, m) => ({ ...acc, [m.key]: true }), {} as FlagsMap);

const Ctx = createContext<{ flags: FlagsMap; loading: boolean }>({ flags: defaultFlags, loading: true });

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<FlagsMap>(defaultFlags);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const keys = FEATURE_META.map((m) => `feature_${m.key}`);
      const { data } = await supabase.from("site_settings").select("key,value").in("key", keys);
      const next = { ...defaultFlags };
      (data || []).forEach((r: any) => {
        const k = r.key.replace(/^feature_/, "") as FeatureKey;
        next[k] = !["off", "false", "0", "disabled"].includes(String(r.value || "").toLowerCase());
      });
      setFlags(next);
    } catch (err) {
      console.warn("Feature flags load fallback:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    let ch: any = null;
    try {
      ch = supabase
        .channel("feature_flags")
        .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => load())
        .subscribe();
    } catch {}
    return () => {
      if (ch) {
        try { supabase.removeChannel(ch); } catch {}
      }
    };
  }, []);

  return <Ctx.Provider value={{ flags, loading }}>{children}</Ctx.Provider>;
}

export const useFeatureFlags = () => useContext(Ctx);
export const useFeature = (key: FeatureKey) => useContext(Ctx).flags[key];

export function FeatureGate({ feature, children }: { feature: FeatureKey; children: ReactNode }) {
  const { flags, loading } = useFeatureFlags();
  if (loading) return null;
  if (!flags[feature]) return <Navigate to="/" replace />;
  return <>{children}</>;
}
