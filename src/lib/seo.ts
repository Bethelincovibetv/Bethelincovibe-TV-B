export const SITE_NAME = "Bethelincovibe TV";

/** Absolute origin of the running site (falls back to the production domain during SSR/build). */
export function siteOrigin() {
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return "https://bethelincovibetv.com.ng";
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
