export const SITE_NAME = "Bethelincovibe TV";

/** Absolute origin of the running site (falls back to the production domain during SSR/build). */
export function siteOrigin() {
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return "https://bethelincovibetv.com";
}

export function absUrl(path: string) {
  if (!path) return siteOrigin();
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** URL of the auto-generated Open Graph card for any page. */
export function ogImageUrl(opts: {
  title: string;
  subtitle?: string;
  image?: string | null;
  badge?: string;
}) {
  const p = new URLSearchParams();
  p.set("title", opts.title.slice(0, 120));
  if (opts.subtitle) p.set("subtitle", opts.subtitle.slice(0, 140));
  if (opts.image) p.set("image", opts.image);
  if (opts.badge) p.set("badge", opts.badge);
  return `https://gndcgttnpxsjufmehgyi.supabase.co/functions/v1/og-image?${p.toString()}`;
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
      subtitle: "Proven growth strategies, funding guides, and Lagos entrepreneurial case studies.",
      badge: "Daily SME Blog",
    }),
  businesses: () =>
    ogImageUrl({
      title: "Verified Lagos Business & Supplier Directory",
      subtitle: "Connect directly via WhatsApp to authentic manufacturers, wholesalers, and services.",
      badge: "Verified Marketplace",
    }),
  products: () =>
    ogImageUrl({
      title: "Digital Products & SME Business Toolkits",
      subtitle: "Download startup financial models, legal templates, marketing scripts, and tools.",
      badge: "Digital Marketplace",
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
  videoCreator: () =>
    ogImageUrl({
      title: "AI Video Creator & Studio Engine | Vixora AI",
      subtitle: "Turn text into high-converting viral marketing videos with AI voiceovers and music.",
      badge: "Vixora AI Studio",
    }),
  learn: () =>
    ogImageUrl({
      title: "SME Masterclasses & Certificate Courses",
      subtitle: "Interactive lessons, flashcards, quizzes, and verifiable certificates for entrepreneurs.",
      badge: "Bethel Academy",
    }),
  forum: () =>
    ogImageUrl({
      title: "Lagos Entrepreneur Community & Startup Forum",
      subtitle: "Ask questions, network with suppliers, share marketing wins, and find partners.",
      badge: "SME Forum",
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
