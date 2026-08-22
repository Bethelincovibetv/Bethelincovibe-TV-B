// Dynamic sitemap.xml — includes every published blog post + suppliers + static pages
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const SITE = "https://bethelincovibetv.com.ng";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);

    const [{ data: posts }, { data: businesses }, { data: cats }] = await Promise.all([
      sb.from("blog_posts").select("slug, updated_at, published_at").eq("published", true).order("published_at", { ascending: false }).limit(2000),
      sb.from("suppliers").select("slug, updated_at").eq("status", "approved").eq("active", true).limit(2000),
      sb.from("categories").select("slug, type, updated_at").limit(500),
    ]);

    const today = new Date().toISOString().split("T")[0];
    const urls: Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: number }> = [
      { loc: `${SITE}/`, lastmod: today, changefreq: "daily", priority: 1.0 },
      { loc: `${SITE}/blog`, lastmod: today, changefreq: "daily", priority: 0.9 },
      { loc: `${SITE}/businesses`, lastmod: today, changefreq: "weekly", priority: 0.9 },
      { loc: `${SITE}/businesses/list`, lastmod: today, changefreq: "monthly", priority: 0.7 },
      { loc: `${SITE}/about`, changefreq: "monthly", priority: 0.6 },
      { loc: `${SITE}/contact`, changefreq: "monthly", priority: 0.6 },
      { loc: `${SITE}/advertise`, changefreq: "monthly", priority: 0.6 },
      { loc: `${SITE}/startup-calculator`, changefreq: "monthly", priority: 0.7 },
      { loc: `${SITE}/privacy-policy`, changefreq: "yearly", priority: 0.3 },
      { loc: `${SITE}/terms-of-service`, changefreq: "yearly", priority: 0.3 },
      { loc: `${SITE}/disclaimer`, changefreq: "yearly", priority: 0.3 },
    ];

    for (const p of posts || []) {
      urls.push({
        loc: `${SITE}/blog/${p.slug}`,
        lastmod: (p.updated_at || p.published_at || today).toString().split("T")[0],
        changefreq: "weekly",
        priority: 0.8,
      });
    }
    for (const s of businesses || []) {
      urls.push({
        loc: `${SITE}/businesses/${s.slug}`,
        lastmod: (s.updated_at || today).toString().split("T")[0],
        changefreq: "weekly",
        priority: 0.7,
      });
    }
    for (const c of cats || []) {
      const base = c.type === "business" ? "businesses?category" : "blog/category";
      urls.push({ loc: `${SITE}/${base}/${c.slug}`, changefreq: "weekly", priority: 0.6 });
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""}${u.changefreq ? `\n    <changefreq>${u.changefreq}</changefreq>` : ""}${u.priority ? `\n    <priority>${u.priority}</priority>` : ""}
  </url>`).join("\n")}
</urlset>`;

    return new Response(xml, {
      headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=1800" },
    });
  } catch (e) {
    return new Response(String(e), { status: 500, headers: corsHeaders });
  }
});
