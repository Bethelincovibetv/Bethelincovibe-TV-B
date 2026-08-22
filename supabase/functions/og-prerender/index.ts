// Serves crawler-friendly HTML with og:image for blog posts, business listings, and user profiles
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const esc = (s: string) =>
  (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function buildHtml(opts: {
  title: string;
  description: string;
  image: string;
  canonical: string;
  type: "article" | "profile" | "website";
  siteName: string;
}) {
  const title = esc(opts.title);
  const desc = esc(opts.description);
  const imgEsc = esc(opts.image);
  const canonical = esc(opts.canonical);
  return `<!doctype html><html prefix="og: https://ogp.me/ns#"><head>
<meta charset="utf-8">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="${opts.type}">
<meta property="og:site_name" content="${esc(opts.siteName)}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${imgEsc}">
<meta property="og:image:secure_url" content="${imgEsc}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${title}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${imgEsc}">
</head><body><h1>${title}</h1><p>${desc}</p><p><a href="${canonical}">View on Bethelincovibe TV</a></p>
<img src="${imgEsc}" alt="${title}"></body></html>`;
}

function absolutize(img: string, siteOrigin: string) {
  if (!img) return `${siteOrigin}/logo.png`;
  if (img.startsWith("//")) return "https:" + img;
  if (img.startsWith("/")) return siteOrigin + img;
  if (img.startsWith("http://")) return img.replace("http://", "https://");
  return img;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    const type = (url.searchParams.get("type") || "blog").toLowerCase();
    const siteOrigin = url.searchParams.get("origin") || "https://bethelincovibetv.com";
    const siteName = "Bethelincovibe TV";
    if (!slug) return new Response("missing slug", { status: 400 });

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);

    let html = "";
    if (type === "business") {
      const { data: b } = await sb
        .from("suppliers")
        .select("name, description, logo_url, cover_url, slug")
        .eq("slug", slug)
        .eq("active", true)
        .eq("status", "approved")
        .maybeSingle();
      if (!b) return new Response("not found", { status: 404 });
      html = buildHtml({
        title: b.name,
        description: b.description || `${b.name} on ${siteName}`,
        image: absolutize(b.cover_url || b.logo_url, siteOrigin),
        canonical: `${siteOrigin}/businesses/${b.slug}`,
        type: "website",
        siteName,
      });
    } else if (type === "profile") {
      const { data: p } = await sb
        .from("profiles")
        .select("display_name, username, bio, avatar_url, background_url")
        .eq("username", slug)
        .maybeSingle();
      if (!p) return new Response("not found", { status: 404 });
      const name = p.display_name || p.username || "Profile";
      html = buildHtml({
        title: `${name} — ${siteName}`,
        description: p.bio || `${name} on ${siteName}`,
        image: absolutize(p.avatar_url || p.background_url, siteOrigin),
        canonical: `${siteOrigin}/u/${p.username}`,
        type: "profile",
        siteName,
      });
    } else if (type === "sales") {
      const { data: s } = await sb
        .from("sales_pages")
        .select("product_name, headline, subheadline, seo_title, seo_description, product_image_url, slug")
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();
      if (!s) return new Response("not found", { status: 404 });
      html = buildHtml({
        title: s.seo_title || s.headline || s.product_name,
        description: s.seo_description || s.subheadline || `${s.product_name} on ${siteName}`,
        image: absolutize(s.product_image_url, siteOrigin),
        canonical: `${siteOrigin}/sales/${s.slug}`,
        type: "website",
        siteName,
      });
    } else if (type === "home") {
      html = buildHtml({
        title: `${siteName} — Business info & tools for Lagos entrepreneurs`,
        description: `Discover Lagos businesses, sales pages, blog insights and free tools on ${siteName}.`,
        image: `${siteOrigin}/logo.png`,
        canonical: `${siteOrigin}/`,
        type: "website",
        siteName,
      });
    } else {
      const { data: post } = await sb
        .from("blog_posts")
        .select("title, excerpt, featured_image, slug")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (!post) return new Response("not found", { status: 404 });
      html = buildHtml({
        title: post.title,
        description: post.excerpt || post.title,
        image: absolutize(post.featured_image, siteOrigin),
        canonical: `${siteOrigin}/blog/${post.slug}`,
        type: "article",
        siteName,
      });
    }

    return new Response(html, {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" },
    });
  } catch (e) {
    return new Response(String(e), { status: 500, headers: corsHeaders });
  }
});
