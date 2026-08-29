import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export type FeatureKey =
  // Core Commerce & Marketplace
  | "products" | "businesses" | "business_listing" | "business_boost" | "sales_pages" | "user_leads"
  // AI & Creative Studios
  | "graphic_designer" | "logo_creator" | "video_creator" | "coach" | "ai_blogger" | "ai_admin"
  // WhatsApp & Communication
  | "whatsapp_engine" | "realtime_chat"
  // Advertising & Ad Placements
  | "advertise" | "ad_earnings" | "ads_marketplace" | "ads_blog" | "ads_dashboard" | "ads_directory"
  // Finance & Wallet
  | "wallet" | "referrals" | "daily_rewards"
  // Content & Editorial
  | "blog" | "guest_blog" | "comments" | "favorites" | "learn" | "forum" | "tv_videos" | "hero_slider" | "ai_auto_blog_slider"
  // Tools & Utilities
  | "tools" | "inventory" | "birthday_filter" | "dashboard_search" | "user_verification"
  // Platform & UI Controls
  | "search" | "register" | "push" | "pwa_install" | "email_subscribe" | "footer_for_non_members";

export interface FeatureMetaItem {
  key: FeatureKey;
  label: string;
  category: "commerce" | "ai_creative" | "communication" | "advertising" | "finance" | "content" | "tools" | "platform";
  description: string;
}

export const FEATURE_META: FeatureMetaItem[] = [
  // Commerce & Marketplace
  { key: "products", label: "Product Marketplace", category: "commerce", description: "Public Lagos marketplace, product detail pages (/products, /products/:slug) and seller management" },
  { key: "businesses", label: "Business Directory", category: "commerce", description: "Public verified supplier and business directory profiles (/businesses)" },
  { key: "business_listing", label: "List a Business", category: "commerce", description: "Allow users and suppliers to register and list new businesses (/businesses/list)" },
  { key: "business_boost", label: "Business Boost & Sponsorship", category: "commerce", description: "Paid business boosting, verified partner status and featured placement" },
  { key: "sales_pages", label: "Sales & Landing Pages", category: "commerce", description: "Custom product landing funnels, checkout sales pages, and analytics (/sales)" },
  { key: "user_leads", label: "Seller Leads & Inquiries", category: "commerce", description: "Lead tracking, WhatsApp customer captures and sales inquiries" },

  // AI & Creative Studios
  { key: "graphic_designer", label: "AI Graphic Designer & Flyer Studio", category: "ai_creative", description: "Autonomous commercial flyer generator, stock pipeline, and creative director studio (/graphic-designer)" },
  { key: "logo_creator", label: "Vector & 3D Logo Creator Suite", category: "ai_creative", description: "Multi-type logo creator with wordmark, lettermark, emblem, combination, and dimensional 3D renders (/logo-creator)" },
  { key: "video_creator", label: "AI Video Studio & Generator", category: "ai_creative", description: "AI Video Studio, script-to-video generator, and video creator navigation (/create-video)" },
  { key: "coach", label: "AI Business Coach", category: "ai_creative", description: "Coach Bethel Goodgift AI-powered advisory chat and business mentor (/dashboard/coach)" },
  { key: "ai_blogger", label: "AI Blogger Studio", category: "ai_creative", description: "Autonomous AI Blogging and content scheduling studio for automated articles" },
  { key: "ai_admin", label: "Executive AI Admin Console", category: "ai_creative", description: "AI Strategy Director, revenue analytics & platform intelligence console" },

  // WhatsApp & Communication
  { key: "whatsapp_engine", label: "WhatsApp Status Engine", category: "communication", description: "Mutual Google Contacts exchange, audience growth, and status ad monetization (/whatsapp-engine)" },
  { key: "realtime_chat", label: "Real-time Live Chat & Support", category: "communication", description: "Live messaging and support conversations with buyers, merchants, and staff (/chat)" },

  // Advertising & Ad Placements
  { key: "advertise", label: "Advertise With Us Portal", category: "advertising", description: "Public advertising page, self-serve campaign creator, and ad manager (/advertise)" },
  { key: "ads_marketplace", label: "Marketplace Ad Placements", category: "advertising", description: "Showcase programmatic ads and verified sponsored banners across /products and /products/:slug" },
  { key: "ads_blog", label: "Blog Article Ads", category: "advertising", description: "Promotional sponsor banners in blog articles and editorial sidebars" },
  { key: "ads_dashboard", label: "User Dashboard Ads", category: "advertising", description: "High-visibility sponsored partner banners on the merchant user dashboard" },
  { key: "ads_directory", label: "Directory Sponsored Cards", category: "advertising", description: "Sponsored partner cards in the business directory listings feed" },
  { key: "ad_earnings", label: "Ad Click Earnings", category: "advertising", description: "Show 'Ad Earnings' card and monetization balance on user dashboards" },

  // Finance & Wallet
  { key: "wallet", label: "User Wallet & Receipts", category: "finance", description: "User wallet balance, top-ups, transaction history, and payment receipts (/wallet)" },
  { key: "referrals", label: "Referral & Affiliate System", category: "finance", description: "Refer-and-earn affiliate rewards, custom referral links and bonus tracking (/referral)" },
  { key: "daily_rewards", label: "Daily Login Rewards", category: "finance", description: "Daily login reward credits and activity engagement points" },

  // Content & Editorial
  { key: "blog", label: "Editorial Blog", category: "content", description: "Blog posts, reading, category filters and listing pages (/blog)" },
  { key: "guest_blog", label: "Guest Blog Submissions", category: "content", description: "Allow paid and community guest blog submissions (/dashboard/submit-blog)" },
  { key: "comments", label: "Blog Comments", category: "content", description: "Public commentary and discussions on editorial blog posts" },
  { key: "favorites", label: "Favorites & Saved Articles", category: "content", description: "Allow users to save favorite articles and business bookmarks (/dashboard/favorites)" },
  { key: "learn", label: "Learning Hub & Courses", category: "content", description: "Video courses, entrepreneur guides, and learning resources (/learn)" },
  { key: "forum", label: "Community Forum", category: "content", description: "Community Q&A, topics, and merchant discussions (/forum)" },
  { key: "tv_videos", label: "TV Video Carousel", category: "content", description: "YouTube TV video carousel and video player showcase" },
  { key: "hero_slider", label: "Homepage Hero Slider", category: "content", description: "Interactive animated 3D slider on the homepage" },
  { key: "ai_auto_blog_slider", label: "Auto Blog Slider", category: "content", description: "Automatically rotate top trending posts into the homepage slider" },

  // Tools & Utilities
  { key: "tools", label: "Business Tools & Calculators", category: "tools", description: "Startup calculator, break-even calculator, and entrepreneur tools (/tools/startup-calculator)" },
  { key: "inventory", label: "Inventory & Expense Manager", category: "tools", description: "Stock management, sales tracking, and expense logging (/dashboard/inventory)" },
  { key: "birthday_filter", label: "Birthday & Celebration Filter", category: "tools", description: "Dedicated quick filter and presets for birthday flyers, bakery cakes, and party promos" },
  { key: "dashboard_search", label: "Dashboard Universal Search", category: "tools", description: "Universal live search bar across products, designs, templates, and businesses on dashboard" },
  { key: "user_verification", label: "User & Merchant KYC Verification", category: "tools", description: "Identity verification, business CAC registration review, and badge issuance (/verification)" },

  // Platform & UI Controls
  { key: "search", label: "Global Site Search", category: "platform", description: "Universal header search bar across all site content" },
  { key: "register", label: "Public User Registration", category: "platform", description: "Allow new account sign-ups on /register" },
  { key: "push", label: "Push Notifications", category: "platform", description: "Web push subscribe prompt & broadcast notifications" },
  { key: "pwa_install", label: "PWA Install Prompt", category: "platform", description: "Progressive Web App install banner and mobile home-screen prompt" },
  { key: "email_subscribe", label: "Email Newsletter Subscription", category: "platform", description: "Newsletter subscription forms across footer and articles" },
  { key: "footer_for_non_members", label: "Footer for Non-Members", category: "platform", description: "Display footer menu and navigation links to unauthenticated visitors" },
];

type FlagsMap = Record<FeatureKey, boolean>;

const defaultFlags = FEATURE_META.reduce((acc, m) => ({ ...acc, [m.key]: true }), {} as FlagsMap);

const STORAGE_KEY = "app_feature_flags_v2";

const getCachedFlags = (): { flags: FlagsMap; hasCache: boolean } => {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      return { flags: { ...defaultFlags, ...parsed }, hasCache: true };
    }
  } catch {}
  return { flags: defaultFlags, hasCache: false };
};

const initialCached = getCachedFlags();
const Ctx = createContext<{ flags: FlagsMap; loading: boolean }>({ flags: initialCached.flags, loading: !initialCached.hasCache });

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<FlagsMap>(() => getCachedFlags().flags);
  const [loading, setLoading] = useState(() => !getCachedFlags().hasCache);

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
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
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
