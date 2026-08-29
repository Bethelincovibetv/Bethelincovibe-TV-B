export const SITE_NAME = "Bethelincovibe TV";
export const DEFAULT_OG_IMAGE = "https://bethelincovibetv.com/logo.png";
export const DEFAULT_TITLE = "Bethelincovibe TV — Lagos Business Growth Engine & Marketplace";
export const DEFAULT_DESCRIPTION = "The ultimate growth engine for Lagos entrepreneurs: verified business directory, marketplace products for sale, startup playbooks, and digital marketing tools.";

/** Absolute origin of the running site (falls back to the production domain during SSR/build). */
export function siteOrigin() {
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return "https://bethelincovibetv.com";
}

/**
 * Ensures any URL (relative, protocol-relative, or absolute) is converted to a fully qualified HTTPS URL.
 * Automatically handles data URIs, relative assets, and fallbacks.
 */
export function absUrl(path?: string | null, fallback = DEFAULT_OG_IMAGE): string {
  if (!path || typeof path !== "string" || path.trim() === "") return fallback;
  const trimmed = path.trim();
  if (trimmed.startsWith("data:")) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  const origin = siteOrigin();
  return `${origin}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

/** URL of the auto-generated Open Graph card for any page or entity. */
export function ogImageUrl(opts: {
  title: string;
  subtitle?: string;
  image?: string | null;
  badge?: string;
}) {
  const p = new URLSearchParams();
  p.set("title", (opts.title || SITE_NAME).slice(0, 140));
  if (opts.subtitle) p.set("subtitle", opts.subtitle.slice(0, 160));
  if (opts.image) {
    const absPhoto = absUrl(opts.image, "");
    if (absPhoto) p.set("image", absPhoto);
  }
  if (opts.badge) p.set("badge", opts.badge.slice(0, 32));
  return `https://gndcgttnpxsjufmehgyi.supabase.co/functions/v1/og-image?${p.toString()}`;
}

/**
 * Smart resolver for entity OG images:
 * 1. If an entity visual exists (product cover, business logo, blog photo, avatar), returns its absolute URL.
 * 2. If missing, dynamically generates a branded, contextual 1200x630 OG card.
 */
export function resolveEntityOgImage(opts: {
  primaryImage?: string | null;
  title: string;
  subtitle?: string;
  badge?: string;
}): string {
  if (opts.primaryImage && typeof opts.primaryImage === "string" && opts.primaryImage.trim().length > 3) {
    return absUrl(opts.primaryImage);
  }
  return ogImageUrl({
    title: opts.title,
    subtitle: opts.subtitle,
    badge: opts.badge || SITE_NAME,
  });
}

/** Pre-configured OG Image generators for every major section of the application */
export const PAGE_OG_IMAGES = {
  home: () =>
    ogImageUrl({
      title: "Bethelincovibe TV — Lagos Premier Business & Supplier Hub",
      subtitle: "Discover startup guides, 1,000+ verified suppliers, AI business coach, and growth tools.",
      badge: "Lagos SME Ecosystem",
    }),
  blog: () =>
    ogImageUrl({
      title: "Business Insights, Startup Guides & Market News",
      subtitle: "Practical guides, funding tips and growth stories for Nigerian and global entrepreneurs.",
      badge: "Daily SME Blog",
    }),
  blogCategory: (categoryName: string) =>
    ogImageUrl({
      title: `${categoryName} — Business Guides & Insights`,
      subtitle: `Explore expert playbooks and curated articles on ${categoryName} in Lagos.`,
      badge: "Blog Category",
    }),
  businesses: () =>
    ogImageUrl({
      title: "Verified Lagos Business & Supplier Directory",
      subtitle: "Connect directly via WhatsApp to authentic manufacturers, wholesalers, and services.",
      badge: "Verified Marketplace",
    }),
  businessCategory: (categoryName: string, count?: number) =>
    ogImageUrl({
      title: `${categoryName} Businesses in Lagos`,
      subtitle: count ? `${count} verified business listings ready to connect.` : `Discover top-rated ${categoryName} services and suppliers.`,
      badge: "Business Directory",
    }),
  products: () =>
    ogImageUrl({
      title: "Products & Marketplace | Bethelincovibe TV",
      subtitle: "Browse verified physical goods, instant digital products, and wholesale supplies in Lagos.",
      badge: "Marketplace",
    }),
  productCategory: (categoryName: string) =>
    ogImageUrl({
      title: `${categoryName} — Lagos Marketplace`,
      subtitle: `Find the best verified deals and verified sellers in ${categoryName}.`,
      badge: "Product Category",
    }),
  salesDirectory: () =>
    ogImageUrl({
      title: "Marketplace & High-Converting Sales Pages",
      subtitle: "Discover exclusive products, deals, and service offerings from Nigerian entrepreneurs.",
      badge: "Sales Funnels",
    }),
  learn: () =>
    ogImageUrl({
      title: "Learning Hub & SME Masterclasses | Bethelincovibe TV",
      subtitle: "Interactive lessons, practical growth playbooks, and AI coach for entrepreneurs.",
      badge: "Bethel Academy",
    }),
  forum: () =>
    ogImageUrl({
      title: "Lagos Entrepreneur Community & Startup Forum",
      subtitle: "Ask questions, network with suppliers, share marketing wins, and find partners.",
      badge: "SME Forum",
    }),
  referral: () =>
    ogImageUrl({
      title: "Refer & Earn Real Cash Rewards | Bethelincovibe TV",
      subtitle: "Invite fellow entrepreneurs to Nigeria's premier business network and get rewarded instantly in your wallet.",
      badge: "Referral & Earn",
    }),
  savedBlogs: () =>
    ogImageUrl({
      title: "My Saved Articles & Reading List | Bethelincovibe TV",
      subtitle: "Manage, organize, and read your bookmarked startup guides and business strategies.",
      badge: "Saved Knowledge",
    }),
  tools: () =>
    ogImageUrl({
      title: "Free Entrepreneurship & Startup Calculators",
      subtitle: "Calculate startup costs, monthly break-even margins, and ROI before investing.",
      badge: "Free Business Tools",
    }),
  startupCalculator: () =>
    ogImageUrl({
      title: "AI Startup Financial Feasibility & Runway Calculator",
      subtitle: "Free AI-powered financial model for Nigerian entrepreneurs: runway, break-even, and margin estimates.",
      badge: "AI Startup Tool",
    }),
  videoCreator: () =>
    ogImageUrl({
      title: "AI Video Creator & Studio Engine | Vixora AI",
      subtitle: "Turn text into high-converting viral marketing videos with AI voiceovers, captions, and canvas editing.",
      badge: "Vixora AI Studio",
    }),
  advertise: () =>
    ogImageUrl({
      title: "Advertise & Reach 50,000+ Nigerian Entrepreneurs",
      subtitle: "Promote your brand, supplier listing, or service across Bethelincovibe TV network.",
      badge: "Sponsorship & Ads",
    }),
  coach: () =>
    ogImageUrl({
      title: "AI Business Coach & Live Strategic Advisor",
      subtitle: "Instant marketing ideas, pricing advice, supplier vetting, and revenue strategies.",
      badge: "Vixora AI Coach",
    }),
  about: () =>
    ogImageUrl({
      title: "About Bethelincovibe TV | Business Growth Ecosystem",
      subtitle: "Empowering African entrepreneurs with visibility, marketplace commerce, playbooks, and AI tools.",
      badge: "Our Mission",
    }),
  support: () =>
    ogImageUrl({
      title: "Help Center & Member Support | Bethelincovibe TV",
      subtitle: "Get assistance with business listings, marketplace orders, wallet payouts, and account features.",
      badge: "Customer Support",
    }),
  howTo: () =>
    ogImageUrl({
      title: "How-To Guides & Platform Walkthroughs | Bethelincovibe TV",
      subtitle: "Step-by-step tutorials to list your business, launch sales funnels, and scale on Bethelincovibe TV.",
      badge: "Platform Guide",
    }),
  terms: () =>
    ogImageUrl({
      title: "Terms of Service | Bethelincovibe TV",
      subtitle: "Read the terms governing use of Bethelincovibe TV business directory and marketplace.",
      badge: "Legal",
    }),
  privacy: () =>
    ogImageUrl({
      title: "Privacy Policy | Bethelincovibe TV",
      subtitle: "How we collect, protect, and handle data across the Bethelincovibe TV platform.",
      badge: "Data Privacy",
    }),
  disclaimer: () =>
    ogImageUrl({
      title: "Platform Disclaimer | Bethelincovibe TV",
      subtitle: "Official marketplace and business directory disclaimer information.",
      badge: "Disclaimer",
    }),
};

export function truncate(text: string | null | undefined, max = 155) {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

export function slugify(input: string) {
  return (input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
