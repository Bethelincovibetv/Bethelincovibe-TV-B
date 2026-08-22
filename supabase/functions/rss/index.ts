// RSS 2.0 feed for blog posts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };
const esc = (s: string) =>
  (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const url = new URL(req.url);
  const origin = url.searchParams.get("origin") || "https://bethelincovibetv.com";

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: posts } = await sb
    .from("blog_posts")
    .select("title, slug, excerpt, featured_image, published_at, updated_at, categories(name)")
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(50);

  const items = (posts || []).map((p: any) => {
    const link = `${origin}/blog/${p.slug}`;
    const pub = p.published_at ? new Date(p.published_at).toUTCString() : new Date().toUTCString();
    const cat = p.categories?.name ? `<category>${esc(p.categories.name)}</category>` : "";
    const img = p.featured_image
      ? `<enclosure url="${esc(p.featured_image)}" type="image/jpeg" /><media:content url="${esc(p.featured_image)}" medium="image" />`
      : "";
    return `<item>
      <title>${esc(p.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${esc(p.excerpt || p.title)}</description>
      <pubDate>${pub}</pubDate>
      ${cat}
      ${img}
    </item>`;
  }).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Bethelincovibe TV — Lagos Business Blog</title>
    <link>${origin}</link>
    <description>Startup guides, marketing, funding and featured businesses for Lagos entrepreneurs.</description>
    <language>en-ng</language>
    <atom:link href="${origin}/rss.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { ...cors, "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=600" },
  });
});
