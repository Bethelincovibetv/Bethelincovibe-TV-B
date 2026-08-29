// Serves crawler-friendly HTML with og:image for blog posts, business listings, products, user profiles, forum posts & directory categories
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
  type: "article" | "profile" | "product" | "website" | "business.business";
  siteName: string;
  jsonLd?: Record<string, any> | null;
}) {
  const title = esc(opts.title);
  const desc = esc(opts.description);
  const imgEsc = esc(opts.image);
  const canonical = esc(opts.canonical);
  const jsonLdScript = opts.jsonLd ? `<script type="application/ld+json">${JSON.stringify(opts.jsonLd)}</script>` : "";

  return `<!doctype html><html lang="en" prefix="og: https://ogp.me/ns#"><head>
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
<meta property="og:locale" content="en_NG">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@bethelincovibetv">
<meta name="twitter:creator" content="@bethelincovibetv">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${imgEsc}">
<meta name="twitter:image:alt" content="${title}">
${jsonLdScript}
</head><body>
<main>
  <h1>${title}</h1>
  <p>${desc}</p>
  <p><a href="${canonical}">Open page on ${esc(opts.siteName)}</a></p>
  <img src="${imgEsc}" alt="${title}" width="1200" height="630" />
</main>
</body></html>`;
}

function absolutize(img?: string | null, siteOrigin = "https://bethelincovibetv.com", fallbackTitle = "Bethelincovibe TV", fallbackBadge = "Marketplace") {
  if (img && typeof img === "string" && img.trim().length > 3) {
    const trimmed = img.trim();
    if (trimmed.startsWith("//")) return "https:" + trimmed;
    if (trimmed.startsWith("/")) return siteOrigin + trimmed;
    if (trimmed.startsWith("http://")) return trimmed.replace("http://", "https://");
    if (trimmed.startsWith("https://")) return trimmed;
  }
  const p = new URLSearchParams();
  p.set("title", fallbackTitle.slice(0, 140));
  p.set("badge", fallbackBadge.slice(0, 32));
  return `https://gndcgttnpxsjufmehgyi.supabase.co/functions/v1/og-image?${p.toString()}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const rawSlug = url.searchParams.get("slug") || "";
    const slug = decodeURIComponent(rawSlug).trim();
    const type = (url.searchParams.get("type") || "home").toLowerCase();
    const siteOrigin = url.searchParams.get("origin") || "https://bethelincovibetv.com";
    const siteName = "Bethelincovibe TV";

    const sb = createClient(
      Deno.env.get("SUPABASE_URL") || "https://gndcgttnpxsjufmehgyi.supabase.co",
      Deno.env.get("SUPABASE_ANON_KEY") || "dummy"
    );

    let html = "";

    if (type === "business") {
      const { data: b } = await sb
        .from("suppliers")
        .select("id, name, description, logo_url, cover_url, slug, address, phone, categories(name)")
        .eq("slug", slug)
        .eq("active", true)
        .eq("status", "approved")
        .maybeSingle();

      if (!b) {
        html = buildHtml({
          title: `Lagos Verified Business Directory | ${siteName}`,
          description: `Find top verified suppliers, wholesalers and local service providers in Lagos on ${siteName}.`,
          image: absolutize(null, siteOrigin, "Lagos Business Directory", "Verified Suppliers"),
          canonical: `${siteOrigin}/businesses`,
          type: "website",
          siteName,
        });
      } else {
        const catName = (b.categories as any)?.name || "Lagos Business";
        const title = `${b.name} — ${catName} | ${siteName}`;
        const desc = (b.description?.slice(0, 160)) || `Contact ${b.name} (${catName}) in Lagos. View verified photos, phone, address, and direct WhatsApp contact on ${siteName}.`;
        const canonical = `${siteOrigin}/businesses/${b.slug}`;
        const primaryImage = b.cover_url || b.logo_url;
        const ogImg = absolutize(primaryImage, siteOrigin, b.name, catName);

        html = buildHtml({
          title,
          description: desc,
          image: ogImg,
          canonical,
          type: "business.business",
          siteName,
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: b.name,
            description: desc,
            url: canonical,
            image: ogImg,
            telephone: b.phone,
          },
        });
      }
    } else if (type === "business_category") {
      const { data: cat } = await sb
        .from("categories")
        .select("id, name, slug, description")
        .eq("type", "business")
        .eq("slug", slug)
        .maybeSingle();

      const catName = cat?.name || slug.replace(/-/g, " ");
      const title = `${catName} Businesses in Lagos | ${siteName}`;
      const desc = cat?.description || `Explore verified ${catName} suppliers, companies, and manufacturers in Lagos on ${siteName}.`;
      const canonical = `${siteOrigin}/businesses/category/${slug}`;
      const ogImg = absolutize(null, siteOrigin, `${catName} in Lagos`, "Business Directory");

      html = buildHtml({
        title,
        description: desc,
        image: ogImg,
        canonical,
        type: "website",
        siteName,
      });
    } else if (type === "product") {
      const isUuid = /^[0-9a-f-]{36}$/i.test(slug);
      let prodQuery = sb.from("directory_products").select("id, name, slug, description, price, currency, cover_image, images, condition, categories(name)").eq("active", true);
      
      if (isUuid) {
        prodQuery = prodQuery.eq("id", slug);
      } else {
        prodQuery = prodQuery.eq("slug", slug);
      }

      const { data: p } = await prodQuery.maybeSingle();

      if (!p) {
        html = buildHtml({
          title: `Lagos Products & Marketplace | ${siteName}`,
          description: `Discover physical products and instant digital items from verified Lagos sellers on ${siteName}.`,
          image: absolutize(null, siteOrigin, "Lagos Marketplace", "Products for Sale"),
          canonical: `${siteOrigin}/products`,
          type: "website",
          siteName,
        });
      } else {
        const catName = (p.categories as any)?.name || "Marketplace";
        const priceStr = p.price ? `₦${Number(p.price).toLocaleString()}` : "Best Price";
        const title = `${p.name} — ${priceStr} | ${siteName}`;
        const desc = (p.description?.slice(0, 160)) || `Order ${p.name} (${priceStr}) in Lagos on ${siteName}. Verified seller & fast delivery.`;
        const canonical = `${siteOrigin}/products/${p.slug || p.id}`;
        const firstImg = p.cover_image || (Array.isArray(p.images) ? p.images[0] : null);
        const ogImg = absolutize(firstImg, siteOrigin, p.name, priceStr);

        html = buildHtml({
          title,
          description: desc,
          image: ogImg,
          canonical,
          type: "product",
          siteName,
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "Product",
            name: p.name,
            description: desc,
            image: ogImg,
            offers: {
              "@type": "Offer",
              price: p.price || 0,
              priceCurrency: p.currency || "NGN",
              availability: "https://schema.org/InStock",
            },
          },
        });
      }
    } else if (type === "profile") {
      const { data: p } = await sb
        .from("profiles")
        .select("display_name, username, bio, avatar_url, background_url, headline")
        .eq("username", slug)
        .maybeSingle();

      if (!p) {
        html = buildHtml({
          title: `Member Profile | ${siteName}`,
          description: `Connect with verified entrepreneurs, creators, and suppliers on ${siteName}.`,
          image: absolutize(null, siteOrigin, "Entrepreneur Profile", "Member Network"),
          canonical: `${siteOrigin}/u/${slug}`,
          type: "profile",
          siteName,
        });
      } else {
        const name = p.display_name || p.username || "Entrepreneur";
        const title = `${name} (@${p.username}) | ${siteName}`;
        const desc = p.bio?.slice(0, 160) || p.headline?.slice(0, 160) || `View ${name}'s verified business profile, products, and services on ${siteName}.`;
        const canonical = `${siteOrigin}/u/${p.username}`;
        const primaryImg = p.avatar_url || p.background_url;
        const ogImg = absolutize(primaryImg, siteOrigin, name, `@${p.username}`);

        html = buildHtml({
          title,
          description: desc,
          image: ogImg,
          canonical,
          type: "profile",
          siteName,
        });
      }
    } else if (type === "sales") {
      const { data: s } = await sb
        .from("sales_pages")
        .select("product_name, headline, subheadline, seo_title, seo_description, product_image_url, price, slug")
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();

      if (!s) {
        html = buildHtml({
          title: `Marketplace & Sales Pages | ${siteName}`,
          description: `Discover high-converting product offers and services from Nigerian entrepreneurs on ${siteName}.`,
          image: absolutize(null, siteOrigin, "Exclusive Deals", "Marketplace"),
          canonical: `${siteOrigin}/sales`,
          type: "website",
          siteName,
        });
      } else {
        const title = s.seo_title || s.headline || s.product_name;
        const priceStr = s.price ? `₦${Number(s.price).toLocaleString()}` : "";
        const desc = s.seo_description || s.subheadline || `${s.product_name} on ${siteName}`;
        const canonical = `${siteOrigin}/sales/${s.slug}`;
        const ogImg = absolutize(s.product_image_url, siteOrigin, s.product_name, priceStr || "Exclusive Offer");

        html = buildHtml({
          title: `${title} | ${siteName}`,
          description: desc,
          image: ogImg,
          canonical,
          type: "product",
          siteName,
        });
      }
    } else if (type === "forum") {
      const { data: f } = await sb
        .from("forum_posts")
        .select("id, title, content, category, user_id, created_at")
        .eq("id", slug)
        .maybeSingle();

      if (!f) {
        html = buildHtml({
          title: `Lagos Entrepreneur Community & Startup Forum | ${siteName}`,
          description: `Ask questions, network with suppliers, share marketing wins, and find business partners.`,
          image: absolutize(null, siteOrigin, "Entrepreneur Community", "SME Forum"),
          canonical: `${siteOrigin}/forum`,
          type: "website",
          siteName,
        });
      } else {
        const title = `${f.title} | ${siteName} Forum`;
        const desc = (f.content?.slice(0, 160)) || `Join the discussion on "${f.title}" with Nigerian entrepreneurs on ${siteName}.`;
        const canonical = `${siteOrigin}/forum/${f.id}`;
        const catName = f.category ? f.category.toUpperCase() : "Discussion";
        const ogImg = absolutize(null, siteOrigin, f.title, `Forum · ${catName}`);

        html = buildHtml({
          title,
          description: desc,
          image: ogImg,
          canonical,
          type: "article",
          siteName,
        });
      }
    } else if (type === "blog_category") {
      const { data: cat } = await sb
        .from("categories")
        .select("id, name, slug, description")
        .eq("type", "blog")
        .eq("slug", slug)
        .maybeSingle();

      const catName = cat?.name || slug.replace(/-/g, " ");
      const title = `${catName} — Business Guides & Insights | ${siteName}`;
      const desc = cat?.description || `Read expert playbooks, funding tips, and growth guides on ${catName} on ${siteName}.`;
      const canonical = `${siteOrigin}/blog/category/${slug}`;
      const ogImg = absolutize(null, siteOrigin, catName, "Startup Guides");

      html = buildHtml({
        title,
        description: desc,
        image: ogImg,
        canonical,
        type: "website",
        siteName,
      });
    } else if (type === "blog") {
      const { data: post } = await sb
        .from("blog_posts")
        .select("title, excerpt, featured_image, slug, published_at, updated_at")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();

      if (!post) {
        html = buildHtml({
          title: `Business Blog & Startup Playbooks | ${siteName}`,
          description: `Practical guides, funding tips and growth stories for Nigerian and global entrepreneurs.`,
          image: absolutize(null, siteOrigin, "Business Insights & Guides", "Daily SME Blog"),
          canonical: `${siteOrigin}/blog`,
          type: "website",
          siteName,
        });
      } else {
        const title = `${post.title} | ${siteName}`;
        const desc = post.excerpt || post.title;
        const canonical = `${siteOrigin}/blog/${post.slug}`;
        const ogImg = absolutize(post.featured_image, siteOrigin, post.title, "Startup Guide");

        html = buildHtml({
          title,
          description: desc,
          image: ogImg,
          canonical,
          type: "article",
          siteName,
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: desc,
            image: [ogImg],
            datePublished: post.published_at,
            dateModified: post.updated_at,
            author: { "@type": "Organization", name: siteName },
            publisher: { "@type": "Organization", name: siteName, logo: { "@type": "ImageObject", url: `${siteOrigin}/logo.png` } },
          },
        });
      }
    } else if (type === "learn") {
      html = buildHtml({
        title: `Learning Hub & SME Masterclasses | ${siteName}`,
        description: `Interactive business lessons, marketing playbooks, and AI coach for entrepreneurs in Nigeria.`,
        image: absolutize(null, siteOrigin, "Learning Hub & Masterclasses", "Bethel Academy"),
        canonical: `${siteOrigin}/learn`,
        type: "website",
        siteName,
      });
    } else if (type === "calculator") {
      html = buildHtml({
        title: `AI Startup Financial Feasibility & Runway Calculator | ${siteName}`,
        description: `Free AI-powered financial runway, margin, and break-even calculator for Nigerian entrepreneurs.`,
        image: absolutize(null, siteOrigin, "AI Startup Calculator", "Free Business Tool"),
        canonical: `${siteOrigin}/tools/startup-calculator`,
        type: "website",
        siteName,
      });
    } else if (type === "video_creator") {
      html = buildHtml({
        title: `AI Video Creator & Studio Engine | ${siteName}`,
        description: `Generate high-converting viral marketing reels, voiceovers, scene animations & canvas videos.`,
        image: absolutize(null, siteOrigin, "AI Video Creator", "Vixora Studio"),
        canonical: `${siteOrigin}/tools/video-creator`,
        type: "website",
        siteName,
      });
    } else if (type === "referral") {
      html = buildHtml({
        title: `Refer & Earn Real Cash Rewards | ${siteName}`,
        description: `Invite entrepreneurs to Bethelincovibe TV and earn instant cash bonuses in your wallet with 10% recurring commissions.`,
        image: absolutize(null, siteOrigin, "Refer & Earn Cash", "Bethel VIP Program"),
        canonical: `${siteOrigin}/referral`,
        type: "website",
        siteName,
      });
    } else if (type === "advertise") {
      html = buildHtml({
        title: `Advertise & Reach 50,000+ Nigerian Entrepreneurs | ${siteName}`,
        description: `Promote your business, supplier listing, or service across the Bethelincovibe TV network.`,
        image: absolutize(null, siteOrigin, "Advertise With Us", "Sponsorship & Ads"),
        canonical: `${siteOrigin}/advertise`,
        type: "website",
        siteName,
      });
    } else if (type === "about") {
      html = buildHtml({
        title: `About Us — AI-Powered Business Growth Ecosystem | ${siteName}`,
        description: `Empowering entrepreneurs and small businesses with visibility, marketplace selling, startup guides, and AI growth tools.`,
        image: absolutize(null, siteOrigin, "About Bethelincovibe TV", "Building Africa's SME Network"),
        canonical: `${siteOrigin}/about`,
        type: "website",
        siteName,
      });
    } else {
      // Home / General Fallback
      html = buildHtml({
        title: `${siteName} — Lagos Business Growth Engine & Marketplace`,
        description: `Discover verified Lagos suppliers, shop marketplace products, read startup playbooks, and scale your business with ${siteName}.`,
        image: `${siteOrigin}/logo.png`,
        canonical: `${siteOrigin}/`,
        type: "website",
        siteName,
      });
    }

    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (e) {
    return new Response(String(e), { status: 500, headers: corsHeaders });
  }
});
