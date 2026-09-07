import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { callAI as providerCall } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AUTHORITY_DOMAINS = [
  { domain: "https://en.wikipedia.org/wiki/", name: "Wikipedia" },
  { domain: "https://www.cbn.gov.ng/", name: "CBN" },
  { domain: "https://www.investopedia.com/terms/", name: "Investopedia" },
];

const CURRENT_YEAR = new Date().getUTCFullYear();

// Category-scoped query hints for realtime headlines + trending prompt.
const CATEGORY_HINTS: Record<string, string[]> = {
  "startup-guides": ["Nigeria startup", "Lagos small business", "Nigeria entrepreneurship"],
  "marketing-sales": ["Nigeria digital marketing", "Nigeria social media marketing", "Lagos sales"],
  "funding-loans": ["Nigeria startup funding", "Nigeria business loan", "CBN grants"],
  "food-retail": ["Nigeria food business", "Lagos retail", "Nigeria FMCG"],
  "featured-businesses": ["Nigerian entrepreneurs featured", "Lagos business owners"],
  "fintech": ["Nigeria fintech", "Nigeria mobile money", "Naira digital payments"],
  "ecommerce": ["Nigeria ecommerce", "Jumia Konga", "online shopping Nigeria"],
  "technology": ["Nigeria tech news", "Lagos tech startup", "African tech"],
  "personal-finance": ["Nigeria personal finance", "Naira savings", "Nigerian investing"],
};

// ---------- Real-time trending headlines ----------
async function fetchRealtimeHeadlines(extraKeywords?: string, categorySlug?: string, categoryName?: string): Promise<string[]> {
  const catHints = (categorySlug && CATEGORY_HINTS[categorySlug]) || (categoryName ? [`Nigeria ${categoryName}`] : []);
  const queries = catHints.length > 0
    ? [...catHints]
    : ["Nigeria business entrepreneurs", "Nigeria startup funding", "Lagos small business", "Nigeria fintech ecommerce"];
  if (extraKeywords) queries.unshift(`Nigeria ${extraKeywords}${categoryName ? " " + categoryName : ""}`);
  const headlines: string[] = [];
  for (const q of queries) {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q + " when:7d")}&hl=en-NG&gl=NG&ceid=NG:en`;
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) continue;
      const xml = await res.text();
      const matches = [...xml.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/g)];
      for (const m of matches.slice(1, 8)) {
        const t = (m[1] || m[2] || "").replace(/\s+-\s+[^-]+$/, "").trim();
        if (t && !headlines.includes(t)) headlines.push(t);
      }
    } catch (e) { console.error("Realtime headlines error:", e); }
    if (headlines.length >= 15) break;
  }
  return headlines.slice(0, 15);
}

// ---------- Smart Pexels picker ----------
// Runs multiple query variants and scores photos by alt-text overlap with target
// keywords so the featured image is genuinely relevant to the topic.
async function pickBestPexels(
  apiKey: string,
  baseQuery: string,
  keywords: string[] = [],
): Promise<{ url: string; alt: string; photographer: string } | null> {
  const clean = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9\s]+/g, " ").trim();
  const kwLower = [baseQuery, ...keywords].map(clean).filter(Boolean);
  const variants = Array.from(new Set([
    baseQuery,
    `${baseQuery} Nigeria`,
    `${baseQuery} business`,
    keywords[0] ? `${baseQuery} ${keywords[0]}` : baseQuery,
  ].filter(Boolean)));
  let best: { url: string; alt: string; photographer: string; score: number } | null = null;
  for (const v of variants) {
    try {
      const r = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(v)}&per_page=15&orientation=landscape`,
        { headers: { Authorization: apiKey } },
      );
      if (!r.ok) continue;
      const d = await r.json();
      for (const p of d.photos || []) {
        const alt = clean(p.alt || "");
        const score = kwLower.reduce((s, k) => s + (k && alt.includes(k) ? 1 : 0), 0)
          + (alt.length > 0 ? 0.1 : 0);
        if (!best || score > best.score) {
          best = {
            url: p.src?.large2x || p.src?.large || p.src?.original,
            alt: p.alt || v,
            photographer: p.photographer || "Pexels",
            score,
          };
        }
      }
      if (best && best.score >= 2) break;
    } catch (e) { console.error("Pexels pick error:", e); }
  }
  return best ? { url: best.url, alt: best.alt, photographer: best.photographer } : null;
}

// ---------- SVG title overlay on stock image ----------
// Wraps the chosen stock image in an SVG and paints the blog title on top with
// a dark gradient scrim for legibility. Uploaded as .svg to blog-images so it
// renders in any <img> tag. No AI needed — text is the exact blog title.
async function buildTitleOverlaySVG(imageUrl: string, title: string, tag?: string): Promise<string> {
  const W = 1200, H = 630;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // Fetch and embed the stock image as base64 so the SVG is fully self-contained
  // (external <image href> inside an SVG served as <img> is blocked by many browsers/crawlers).
  let embedded = imageUrl;
  try {
    const r = await fetch(imageUrl);
    if (r.ok) {
      const buf = new Uint8Array(await r.arrayBuffer());
      const mime = r.headers.get("content-type") || "image/jpeg";
      // Base64 encode without blowing the stack on large images
      let bin = ""; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      embedded = `data:${mime};base64,${btoa(bin)}`;
    }
  } catch { /* fall back to remote href */ }

  // Dynamic type size + line wrap based on title length so long titles still fit
  const clean = String(title).trim().replace(/\s+/g, " ");
  const len = clean.length;
  const fontSize = len < 40 ? 82 : len < 70 ? 68 : len < 100 ? 56 : 48;
  const maxChars = len < 40 ? 20 : len < 70 ? 26 : 32;
  const words = clean.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) { if (cur) lines.push(cur); cur = w; }
    else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  const shown = lines.slice(0, 4);
  const lineHeight = Math.round(fontSize * 1.15);

  // Anchor the title block near the bottom-left with generous margin
  const marginX = 72;
  const bottomPad = 120;
  const startY = H - bottomPad - (shown.length - 1) * lineHeight;
  const tspans = shown.map((l, i) => `<tspan x="${marginX}" y="${startY + i * lineHeight}">${esc(l)}</tspan>`).join("");

  const tagText = (tag || "BETHELINCOVIBE TV").toUpperCase();
  const tagW = Math.min(520, tagText.length * 11 + 36);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="scrim" x1="0" y1="1" x2="0.6" y2="0">
      <stop offset="0%" stop-color="#0b0416" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="#1a0a2e" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.1"/>
    </linearGradient>
    <linearGradient id="brand" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#d946ef"/>
    </linearGradient>
    <filter id="soft" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="2"/>
    </filter>
  </defs>

  <!-- Photograph -->
  <image href="${esc(embedded)}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>

  <!-- Dark editorial scrim so text stays legible on any photo -->
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#scrim)"/>

  <!-- Accent bar to the left of the title, gives it magazine-cover weight -->
  <rect x="${marginX - 20}" y="${startY - fontSize + 10}" width="6" height="${shown.length * lineHeight - 8}" fill="url(#brand)" rx="3"/>

  <!-- Category / brand tag -->
  <rect x="${marginX}" y="64" width="${tagW}" height="44" rx="22" fill="url(#brand)"/>
  <text x="${marginX + tagW / 2}" y="93" text-anchor="middle" font-family="'Helvetica Neue', Inter, Arial, sans-serif" font-weight="800" font-size="18" fill="#ffffff" letter-spacing="2.5">${esc(tagText)}</text>

  <!-- Soft shadow behind title -->
  <text font-family="'Helvetica Neue', Inter, Arial, sans-serif" font-weight="900" font-size="${fontSize}" fill="#000000" fill-opacity="0.55" filter="url(#soft)" transform="translate(2,3)">${tspans}</text>

  <!-- Title -->
  <text font-family="'Helvetica Neue', Inter, Arial, sans-serif" font-weight="900" font-size="${fontSize}" fill="#ffffff">${tspans}</text>

  <!-- Bottom brand mark -->
  <circle cx="${W - 90}" cy="${H - 70}" r="30" fill="url(#brand)"/>
  <text x="${W - 90}" y="${H - 62}" text-anchor="middle" font-family="'Helvetica Neue', Inter, Arial, sans-serif" font-weight="900" font-size="26" fill="#ffffff">B</text>
  <text x="${W - 130}" y="${H - 65}" text-anchor="end" font-family="'Helvetica Neue', Inter, Arial, sans-serif" font-weight="700" font-size="16" fill="#ffffff" letter-spacing="1">BETHELINCOVIBE</text>
  <text x="${W - 130}" y="${H - 45}" text-anchor="end" font-family="'Helvetica Neue', Inter, Arial, sans-serif" font-weight="500" font-size="12" fill="#ffffff" fill-opacity="0.8" letter-spacing="3">TV · LAGOS</text>
</svg>`;
}

// ---------- Accurate YouTube matcher ----------
// Runs multiple targeted searches (with a recent-upload filter), then verifies each
// candidate via oEmbed and scores its title against the article's keywords so the
// embedded video is genuinely relevant — not the first random result.
async function findAccurateYouTube(title: string, primaryKeyword: string | undefined, keywords: string[], hint?: string): Promise<string | null> {
  const kwLower = [primaryKeyword, ...(keywords || [])].filter(Boolean).map((k) => String(k).toLowerCase());
  const queries = [
    hint,
    `${title} ${primaryKeyword || ""} Nigeria`,
    `${primaryKeyword || title} ${CURRENT_YEAR}`,
    title,
  ].filter(Boolean) as string[];
  // sp=CAISBAgBEAE = sorted by relevance, filter: video + uploaded this year
  const filters = ["EgQIBRAB", "EgIQAQ%253D%253D"]; // this year + any-time video
  const seen = new Set<string>();
  let best: { id: string; score: number } | null = null;
  for (const q of queries) {
    for (const sp of filters) {
      try {
        const r = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=${sp}`, {
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        if (!r.ok) continue;
        const html = await r.text();
        const ids = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map((m) => m[1]).slice(0, 5);
        for (const id of ids) {
          if (seen.has(id)) continue;
          seen.add(id);
          try {
            const o = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
            if (!o.ok) continue;
            const oj = await o.json();
            const vt = String(oj.title || "").toLowerCase();
            const score = kwLower.reduce((s, k) => s + (vt.includes(k) ? 1 : 0), 0);
            if (!best || score > best.score) best = { id, score };
            if (best.score >= 2) return `https://www.youtube.com/embed/${best.id}`;
          } catch {}
        }
      } catch {}
    }
    if (best && best.score >= 1) return `https://www.youtube.com/embed/${best.id}`;
  }
  return best ? `https://www.youtube.com/embed/${best.id}` : null;
}

// Bridge to the shared provider helper so admin can switch Lovable AI <-> Gemini direct.
// `apiKey` is the LOVABLE_API_KEY (unused when provider is gemini) and `sbAdmin` is the service-role client.
let __sb: any = null;
async function aiCall(_apiKey: string, messages: any[], _model = "google/gemini-2.5-flash") {
  if (!__sb) throw new Error("AI helper not initialized");
  try {
    return await providerCall(__sb, messages);
  } catch (e: any) {
    if (e?.status === 429) throw { status: 429, message: "Rate limited, try again shortly" };
    if (e?.status === 402) throw { status: 402, message: "AI credits exhausted" };
    throw e;
  }
}

function parseJSON(raw: string) {
  raw = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(raw);
}

function generateSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function makeShortTitle(title: string) {
  const clean = String(title || "").replace(/\s+/g, " ").trim();
  const words = clean.split(" ").filter(Boolean);
  return words.length <= 7 && clean.length <= 58 ? clean : words.slice(0, 7).join(" ");
}

// Inject backlinks into HTML content. Replaces FIRST occurrence of each keyword.
function injectBacklinks(html: string, links: Array<{ keyword: string; url: string; rel?: string; title?: string }>) {
  let result = html;
  const used = new Set<string>();
  for (const link of links) {
    if (!link.keyword || !link.url) continue;
    const key = link.keyword.toLowerCase();
    if (used.has(key)) continue;
    // Match keyword not already inside a tag/link
    const pattern = new RegExp(`(?<!<a[^>]*>[^<]*?)\\b(${link.keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\b(?![^<]*?</a>)`, "i");
    if (pattern.test(result)) {
      const rel = link.rel ? ` rel="${link.rel}"` : "";
      const title = link.title ? ` title="${link.title}"` : "";
      result = result.replace(pattern, `<a href="${link.url}"${rel}${title}>$1</a>`);
      used.add(key);
    }
  }
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { topic, keywords, tone, useTrending, autoPublish, categoryId, authorId, guestSubmissionId } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const PEXELS_API_KEY = Deno.env.get("PEXELS_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(sbUrl, sbKey);
    __sb = sb;

    if (guestSubmissionId) {
      const { data: guestFlag } = await sb.from("site_settings").select("value").eq("key", "feature_guest_blog").maybeSingle();
      if (["off", "false", "0", "disabled"].includes(String(guestFlag?.value || "").toLowerCase())) {
        return new Response(JSON.stringify({ error: "GUEST_BLOG_DISABLED", message: "Business blog submissions are currently disabled" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- Trending topics list ---
    if (useTrending === "list") {
      let catSlug: string | undefined; let catName: string | undefined;
      if (categoryId) {
        const { data: cat } = await sb.from("categories").select("slug,name").eq("id", categoryId).maybeSingle();
        catSlug = cat?.slug; catName = cat?.name;
      }
      const headlines = await fetchRealtimeHeadlines(keywords, catSlug, catName);
      const scope = catName ? `Focus every topic tightly on the "${catName}" category for Nigerian entrepreneurs.` : "Cover a broad mix: side hustles, e-commerce, digital marketing, fintech, freelancing, productivity, personal finance, branding, customer service, local market trends.";
      const raw = await aiCall(LOVABLE_API_KEY, [{
        role: "user",
        content: `Today's year is ${CURRENT_YEAR}. Below are REAL headlines from Nigerian news in the last 7 days — use them as inspiration so the topics are TRULY current, not generic evergreen ideas:\n\n${headlines.map((h, i) => `${i + 1}. ${h}`).join("\n")}\n\nBased on those real, fresh headlines, produce 8 short, punchy blog topic ideas for Nigerian entrepreneurs. ${scope} Do NOT focus on importation. Each topic MUST be SHORT — strictly UNDER 7 WORDS, no colons, no dashes, no year prefix. If you include a year it MUST be ${CURRENT_YEAR}. NEVER use ${CURRENT_YEAR - 1} or older years.${keywords ? ` Prioritize: ${keywords}` : ""}\nReturn ONLY a JSON array of short strings. No other text.`
      }]);
      const topics = parseJSON(raw);
      return new Response(JSON.stringify({ trending: topics, source_headlines: headlines, category: catName || null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // --- Guest submission flow ---
    let guestSubmission: any = null;
    let finalTopic = topic;
    if (guestSubmissionId) {
      const { data } = await sb.from("guest_blog_submissions").select("*, guest_submission_photos(*)").eq("id", guestSubmissionId).maybeSingle();
      if (!data) throw new Error("Guest submission not found");
      guestSubmission = data;
      finalTopic = `Featured Business: ${data.business_name}`;
      await sb.from("guest_blog_submissions").update({ status: "generating" }).eq("id", guestSubmissionId);
    }

    if (useTrending && !topic && !guestSubmission) {
      let existingTitles: string[] = [];
      try {
        const { data: posts } = await sb.from("blog_posts").select("title").order("created_at", { ascending: false }).limit(50);
        existingTitles = (posts || []).map((p: any) => p.title.toLowerCase());
      } catch (e) { console.error("DB check error:", e); }

      const headlines = await fetchRealtimeHeadlines(keywords);
      const raw = await aiCall(LOVABLE_API_KEY, [{
        role: "user",
        content: `Today's year is ${CURRENT_YEAR}. Real Nigerian news headlines from the last 7 days for inspiration (write a topic that RIDES one of these fresh stories where possible):\n\n${headlines.map((h, i) => `${i + 1}. ${h}`).join("\n")}\n\nList 5 trending business and lifestyle topics for Nigerian entrepreneurs in ${CURRENT_YEAR}. Cover a broad mix: side hustles, e-commerce, digital marketing, fintech, freelancing, productivity, personal finance, branding, customer service. Do NOT focus on importation. Each topic MUST be SHORT — strictly UNDER 7 WORDS. NEVER reference any year before ${CURRENT_YEAR}.${keywords ? ` Prioritize: ${keywords}` : ""}\nAvoid these already-covered topics: ${existingTitles.slice(0, 20).join(", ")}\nReturn ONLY a JSON array of short strings.`
      }]);
      const topics = parseJSON(raw);
      if (Array.isArray(topics) && topics.length > 0) finalTopic = topics[0];
    }

    if (!finalTopic) {
      return new Response(JSON.stringify({ error: "Topic required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // --- Generate blog post ---
    let systemPrompt: string;
    let userPrompt: string;

    if (guestSubmission) {
      systemPrompt = `You are a skilled SEO blog writer creating a sponsored business feature post for a Nigerian entrepreneur audience. Write warmly and credibly — like a friend recommending a great business. Focus on SEO authority: use the business name naturally, include location, services, and value proposition.

IMPORTANT RULES:
- Title MUST be SHORT (under 60 chars) and include the business name.
- Mention the business name multiple times naturally.
- Include their website/contact details.
- Make it discoverable for Google (use keywords like the business category, location).

Return ONLY valid JSON:
{
  "title": "Short punchy title under 60 chars including business name",
  "excerpt": "Short excerpt under 160 chars",
  "meta_description": "SEO meta description under 160 chars",
  "keywords": ["keyword1", "keyword2"],
  "suggested_category": "one of: startup-guides, marketing-sales, funding-loans, food-retail, featured-businesses",
  "sections": [
    {"heading": "Section heading", "content": "HTML with <p>, <ul>, <li>, <strong>. 80-120 words.", "image_query": "specific Pexels query"}
  ],
  "faq": [{"question": "Question?", "answer": "Concise answer"}]
}
3-4 sections, 3 FAQs. End with a clear call-to-action linking to the business.`;
      userPrompt = `Write a sponsored business feature blog about:
Business Name: ${guestSubmission.business_name}
Description: ${guestSubmission.description}
${guestSubmission.website ? `Website: ${guestSubmission.website}` : ""}
${guestSubmission.contact_phone ? `Phone: ${guestSubmission.contact_phone}` : ""}
${guestSubmission.contact_whatsapp ? `WhatsApp: ${guestSubmission.contact_whatsapp}` : ""}
${guestSubmission.contact_email ? `Email: ${guestSubmission.contact_email}` : ""}`;
    } else {
      // Real blog categories from the database so the AI can classify accurately
      let categoryMenu = "startup-guides, marketing-sales, funding-loans, food-retail, featured-businesses";
      try {
        const { data: cats } = await sb.from("categories").select("slug,name").eq("type", "blog");
        if (cats && cats.length) {
          categoryMenu = cats.map((c: any) => `${c.slug} (${c.name})`).join(", ");
        }
      } catch (_e) { /* fall back to defaults */ }

      systemPrompt = `Today is ${new Date().toISOString().slice(0,10)} (year ${CURRENT_YEAR}). You are a world-class SEO content strategist and journalist writing in-depth, authoritative long-form articles for Nigerian entrepreneurs. Tone: warm, conversational, expert, specific. Never use asterisks, markdown, or "as an AI".

CRITICAL DATE RULE: Whenever a year is mentioned it MUST be ${CURRENT_YEAR}. NEVER write ${CURRENT_YEAR - 1} or earlier as if current. "This year", "right now", "latest" mean ${CURRENT_YEAR}.

DEPTH & LENGTH RULES (long-form authority content):
- Total body length: 1500-3500 words. NEVER under 1500 words. Depth beats brevity.
- Sections: 6 to 9 H2 sections. Each section 200-400 words with real substance.
- Every section must contain at least one concrete, specific detail: a naira figure, a percentage, a timeline, a named Nigerian platform/agency (CAC, FIRS, Paystack, Flutterwave, Jumia, NIRSAL, BOI), or a worked example.
- Use short paragraphs (1-3 sentences), bullet lists, numbered steps, and <strong> for key phrases.
- Include ONE HTML <table> somewhere in the article when comparison, pricing, or timelines are relevant (cost breakdowns, tool comparisons, pros/cons).
- Open with a "key_takeaways" list of 4-6 punchy one-line insights.
- Close the last section with a practical next-step call to action.
- Zero fluff. No "in today's fast-paced world" style filler openings.

SEO RULES:
- Title: 45-60 chars, primary keyword early, one power word when natural.
- Meta description: 140-160 chars, primary keyword + benefit + soft CTA.
- Excerpt: under 160 chars, hooks in the first sentence.
- Primary keyword in: title, first 100 words, at least two H2s, meta description.
- Include 6-10 LSI/semantic keywords naturally.
- FAQ: 5-7 real questions people search, answers 40-70 words each.
- Add 5-8 tags (short lowercase topical labels).

INTERACTIVE MINI-APPS (very important — makes the article interactive):
Insert 1-3 mini-app shortcodes on their own line inside section content HTML where they genuinely help the reader. Available shortcodes (use EXACT syntax):
- [miniapp type="roi" title="ROI Calculator"]
- [miniapp type="loan" title="Loan Repayment Calculator"]
- [miniapp type="breakeven" title="Break-even Calculator"]
- [miniapp type="currency" title="Currency Converter"]
- [miniapp type="checklist" title="Your action checklist" items="Step one|Step two|Step three|Step four"]
- [miniapp type="poll" title="Quick poll question?" options="Option A|Option B|Option C"]
- [miniapp type="quiz" title="Test yourself" data="[{\\"q\\":\\"Question?\\",\\"options\\":[\\"A\\",\\"B\\",\\"C\\"],\\"answer\\":1}]"]
- [miniapp type="ai" title="Ask the AI business assistant" topic="the article topic"]
Choose types that match the topic (finance topics get loan/roi/breakeven, how-to topics get checklist/quiz, opinion topics get poll). Always include at least one.

CONTENT RULES:
- Do NOT focus on importation/mini-importation.
- Cover: side hustles, marketing, freelancing, productivity, personal finance, branding, e-commerce, fintech, agriculture, tech.
- Practical and locally relevant (Lagos / Nigeria).

CATEGORY RULE: "suggested_category" MUST be the exact slug of the single best-fitting category from this list: ${categoryMenu}. Return the slug only — never invent a new slug.

Return ONLY valid JSON:
{
  "title": "SEO title 45-60 chars",
  "excerpt": "Hook excerpt under 160 chars",
  "meta_description": "SEO meta 140-160 chars",
  "primary_keyword": "main keyword phrase",
  "keywords": ["primary", "lsi 1", "lsi 2", "lsi 3", "lsi 4", "lsi 5"],
  "tags": ["tag1", "tag2", "tag3"],
  "key_takeaways": ["insight 1", "insight 2", "insight 3", "insight 4"],
  "suggested_category": "exact-slug-from-the-list",
  "sections": [
    {"heading": "Keyword-rich H2 (under 9 words)", "content": "HTML <p>, <ul>, <li>, <ol>, <table>, <strong>, plus mini-app shortcodes. 200-400 words.", "image_query": "specific Pexels query"}
  ],
  "faq": [{"question": "Real search question?", "answer": "40-70 word answer"}],
  "youtube_search": "specific search query, or null"
}
6-9 sections, 5-7 FAQs.`;
      const userProvidedTopic = !!topic && !useTrending;
      userPrompt = `Write a comprehensive, deeply researched, SEO-optimized long-form article (1500-3500 words) about: "${finalTopic}"${keywords ? `\nTarget keywords: ${keywords}` : ""}${tone ? `\nTone: ${tone}` : ""}\n\nGoal: outrank every other page on Google for this topic. Be specific, cite real Nigerian numbers, platforms and processes, and make it genuinely useful and interactive.${userProvidedTopic ? `\n\nCRITICAL: The user supplied this EXACT topic. Use it VERBATIM as the article title — do NOT rephrase, expand, shorten, add years, or change wording. The "title" field in your JSON output MUST equal: "${finalTopic}"` : ""}`;
    }


    const rawPost = await aiCall(LOVABLE_API_KEY, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);

    let postData;
    try { postData = parseJSON(rawPost); } catch {
      console.error("Parse fail:", rawPost.substring(0, 500));
      throw new Error("AI returned invalid format. Please try again.");
    }
    // Force exact user-provided topic as title; keep automatic titles short for admin tables/cards.
    if (topic && !useTrending) {
      postData.title = topic;
    } else {
      postData.title = makeShortTitle(postData.title || finalTopic);
    }

    // --- Fetch Pexels images for sections (smart picker: multi-query + keyword scoring) ---
    if (PEXELS_API_KEY && postData.sections) {
      const kws = [postData.primary_keyword, ...(postData.keywords || [])].filter(Boolean) as string[];
      for (const section of postData.sections) {
        if (section.image_query) {
          const pick = await pickBestPexels(PEXELS_API_KEY, section.image_query, [...kws, section.heading || ""]);
          if (pick) {
            section.image_url = pick.url;
            section.image_alt = pick.alt;
            section.image_credit = pick.photographer;
          }
        }
      }
    }

    // --- Featured cover: pick best stock image and overlay the EXACT blog title ---
    let stockCoverImage: string | null = null;
    try {
      const shouldOverlay = !guestSubmission; // guests have their own banner
      if (shouldOverlay && PEXELS_API_KEY) {
        const kws = [postData.primary_keyword, ...(postData.keywords || [])].filter(Boolean) as string[];
        const pick = await pickBestPexels(PEXELS_API_KEY, postData.primary_keyword || postData.title, [...kws, postData.title]);
        if (pick) {
          const tag = (postData.primary_keyword || postData.suggested_category || "Bethelincovibe TV").toString();
          const svg = await buildTitleOverlaySVG(pick.url, postData.title, tag);
          const bytes = new TextEncoder().encode(svg);
          const path = `stock-covers/${generateSlug(postData.title)}-${Date.now()}.svg`;
          const { error: upErr } = await sb.storage.from("blog-images").upload(path, bytes, { contentType: "image/svg+xml", upsert: true });
          if (!upErr) {
            const { data: pub } = sb.storage.from("blog-images").getPublicUrl(path);
            stockCoverImage = pub.publicUrl;
          } else { console.error("Stock cover upload error:", upErr); }
        }
      }
    } catch (e) { console.error("Stock cover overlay error:", e); }


    // --- AI-generated cover image (admin toggle) ---
    let aiCoverImage: string | null = null;
    try {
      const { data: aiToggle } = await sb.from("site_settings").select("value").eq("key", "ai_cover_image_enabled").maybeSingle();
      if (aiToggle?.value === "true") {
        const { data: modelRow } = await sb.from("site_settings").select("value").eq("key", "ai_cover_image_model").maybeSingle();
        // Default to higher-quality image model for legible text
        const imgModel = modelRow?.value || "google/gemini-3-pro-image-preview";
        const imgPrompt = `Design a STUNNING, click-worthy blog featured cover image (16:9) for an article titled: "${postData.title}".

REQUIREMENTS:
- Render the EXACT title text "${postData.title}" prominently and LEGIBLY on the image as bold modern typography (sans-serif, high contrast, with subtle shadow or gradient backdrop so it pops).
- Magazine / YouTube-thumbnail style: vibrant colors, dramatic lighting, eye-catching composition that compels people to click.
- Include a relevant background scene/illustration tied to: ${(postData.keywords || []).slice(0, 4).join(", ")}.
- Add a small "Bethelincovibe TV" badge in a corner.
- High production quality, sharp, professional. Nigerian / African business context where relevant.
- NO watermarks, NO spelling mistakes, NO lorem ipsum. Title text must be spelled exactly as given.`;
        const imgRes = await fetch(AI_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: imgModel,
            messages: [{ role: "user", content: imgPrompt }],
            modalities: ["image", "text"],
          }),
        });
        if (imgRes.ok) {
          const imgData = await imgRes.json();
          const dataUrl = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (dataUrl?.startsWith("data:image")) {
            // Upload to storage
            const base64 = dataUrl.split(",")[1];
            const mime = dataUrl.match(/data:(image\/\w+);/)?.[1] || "image/png";
            const ext = mime.split("/")[1];
            const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
            const path = `ai-covers/${generateSlug(postData.title)}-${Date.now()}.${ext}`;
            const { error: upErr } = await sb.storage.from("blog-images").upload(path, bytes, { contentType: mime, upsert: true });
            if (!upErr) {
              const { data: pub } = sb.storage.from("blog-images").getPublicUrl(path);
              aiCoverImage = pub.publicUrl;
            } else { console.error("AI cover upload error:", upErr); }
          }
        } else {
          console.error("AI image gen failed:", imgRes.status, await imgRes.text());
        }
      }
    } catch (e) { console.error("AI cover image error:", e); }

    // --- YouTube (accurate matcher: multi-query + oEmbed keyword scoring) ---
    let youtubeEmbed: string | null = null;
    try {
      youtubeEmbed = await findAccurateYouTube(
        postData.title,
        postData.primary_keyword,
        postData.keywords || [],
        postData.youtube_search && postData.youtube_search !== "null" ? postData.youtube_search : undefined,
      );
    } catch (e) { console.error("YouTube match error:", e); }

    // --- Build HTML ---
    let fullHtml = "";

    // Guest submission banner
    if (guestSubmission?.banner_url) {
      fullHtml += `<figure><img src="${guestSubmission.banner_url}" alt="${guestSubmission.business_name}" style="width:100%;border-radius:12px;margin:0 0 24px 0" loading="lazy" /></figure>`;
    }

    // TOC
    fullHtml += `<nav aria-label="Table of Contents"><h2>Table of Contents</h2><ul>`;
    postData.sections.forEach((s: any, i: number) => {
      fullHtml += `<li><a href="#section-${i}">${s.heading}</a></li>`;
    });
    fullHtml += `<li><a href="#faq">Frequently Asked Questions</a></li></ul></nav><hr/>`;

    // Key takeaways box
    if (Array.isArray(postData.key_takeaways) && postData.key_takeaways.length) {
      fullHtml += `<aside aria-label="Key takeaways" style="background:#faf5ff;border:1px solid #e9d5ff;border-left:5px solid #8b5cf6;border-radius:12px;padding:16px 18px;margin:0 0 24px 0"><h2 style="margin:0 0 8px 0;font-size:1.05rem;text-transform:uppercase;letter-spacing:.06em;color:#7c3aed">Key Takeaways</h2><ul style="margin:0;padding-left:1.1rem">`;
      postData.key_takeaways.forEach((k: string) => { fullHtml += `<li>${k}</li>`; });
      fullHtml += `</ul></aside>`;
    }


    postData.sections.forEach((s: any, i: number) => {
      fullHtml += `<h2 id="section-${i}">${s.heading}</h2>`;
      if (s.image_url) {
        fullHtml += `<figure><img src="${s.image_url}" alt="${s.image_alt || s.heading}" style="width:100%;border-radius:8px;margin:16px 0" loading="lazy" /><figcaption style="text-align:center;font-size:0.85em;color:#666">Photo by ${s.image_credit || "Pexels"}</figcaption></figure>`;
      }
      fullHtml += s.content;
    });

    // Guest submission photo gallery (from guest_submission_photos relation and direct photos array)
    const galleryItems: Array<{ url: string; caption?: string }> = [
      ...(guestSubmission?.guest_submission_photos || []).map((photo: any) => ({
        url: photo.image_url,
        caption: photo.caption || guestSubmission?.business_name,
      })),
      ...(Array.isArray(guestSubmission?.photos) ? guestSubmission.photos.map((url: string) => ({
        url,
        caption: guestSubmission?.business_name,
      })) : [])
    ].filter((item) => Boolean(item.url));

    const seenGalleryUrls = new Set<string>();
    const uniqueGalleryItems = galleryItems.filter((item) => {
      if (seenGalleryUrls.has(item.url)) return false;
      seenGalleryUrls.add(item.url);
      return true;
    });

    if (uniqueGalleryItems.length > 0) {
      fullHtml += `<h2>Gallery</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin:16px 0">`;
      for (const photo of uniqueGalleryItems) {
        fullHtml += `<figure><img src="${photo.url}" alt="${photo.caption || guestSubmission?.business_name}" style="width:100%;border-radius:8px" loading="lazy" />${photo.caption ? `<figcaption style="text-align:center;font-size:0.85em;color:#666">${photo.caption}</figcaption>` : ""}</figure>`;
      }
      fullHtml += `</div>`;
    }

    // Guest contact CTA
    if (guestSubmission) {
      fullHtml += `<h2>Get In Touch With ${guestSubmission.business_name}</h2><div style="background:#f9fafb;padding:20px;border-radius:12px;border-left:4px solid #8b5cf6"><ul style="list-style:none;padding:0">`;
      if (guestSubmission.website) fullHtml += `<li>🌐 <a href="${guestSubmission.website}" target="_blank" rel="noopener">${guestSubmission.website}</a></li>`;
      if (guestSubmission.contact_phone) fullHtml += `<li>📞 ${guestSubmission.contact_phone}</li>`;
      if (guestSubmission.contact_whatsapp) fullHtml += `<li>💬 WhatsApp: <a href="https://wa.me/${guestSubmission.contact_whatsapp.replace(/\D/g, "")}" target="_blank" rel="noopener">${guestSubmission.contact_whatsapp}</a></li>`;
      if (guestSubmission.contact_email) fullHtml += `<li>✉️ <a href="mailto:${guestSubmission.contact_email}">${guestSubmission.contact_email}</a></li>`;
      fullHtml += `</ul></div>`;
    }

    if (youtubeEmbed) {
      fullHtml += `<h2>Related Video</h2>`;
      fullHtml += `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px;margin:16px 0"><iframe src="${youtubeEmbed}" style="position:absolute;top:0;left:0;width:100%;height:100%" frameborder="0" allowfullscreen loading="lazy"></iframe></div>`;
    }

    if (postData.faq?.length) {
      fullHtml += `<h2 id="faq">Frequently Asked Questions</h2>`;
      postData.faq.forEach((f: any) => {
        fullHtml += `<details style="margin-bottom:12px;border:1px solid #e5e7eb;border-radius:8px;padding:12px"><summary style="font-weight:600;cursor:pointer">${f.question}</summary><p style="margin-top:8px">${f.answer}</p></details>`;
      });
    }

    // ============ BACKLINKS INJECTION ============
    const backlinks: Array<{ keyword: string; url: string; rel?: string; title?: string }> = [];

    // 1. Internal: suppliers
    try {
      const { data: suppliers } = await sb.from("suppliers")
        .select("name,slug").eq("status", "approved").eq("active", true).limit(30);
      for (const s of suppliers || []) {
        backlinks.push({ keyword: s.name, url: `/suppliers/${s.slug}`, title: `Visit ${s.name}` });
      }
    } catch (e) { console.error("Supplier backlink error:", e); }

    // 2. Internal: related blog posts
    try {
      const { data: posts } = await sb.from("blog_posts")
        .select("title,slug").eq("published", true).order("created_at", { ascending: false }).limit(30);
      for (const p of posts || []) {
        const firstWord = p.title.split(" ").slice(0, 4).join(" ");
        backlinks.push({ keyword: firstWord, url: `/blog/${p.slug}`, title: p.title });
      }
    } catch (e) { console.error("Blog backlink error:", e); }

    // 3. Affiliate links (admin-managed)
    try {
      const { data: affiliates } = await sb.from("affiliate_links")
        .select("label,url,keywords").eq("active", true);
      for (const a of affiliates || []) {
        const keys = a.keywords?.length ? a.keywords : [a.label];
        for (const k of keys) {
          backlinks.push({ keyword: k, url: a.url, rel: "sponsored noopener", title: a.label });
        }
      }
    } catch (e) { console.error("Affiliate backlink error:", e); }

    // 4. External authority links (auto-detect well-known terms)
    const authorityKeywords = [
      { keyword: "Central Bank of Nigeria", url: "https://www.cbn.gov.ng/" },
      { keyword: "CBN", url: "https://www.cbn.gov.ng/" },
      { keyword: "Wikipedia", url: "https://en.wikipedia.org/" },
      { keyword: "VAT", url: "https://en.wikipedia.org/wiki/Value-added_tax", title: "Value-added tax" },
      { keyword: "SEO", url: "https://en.wikipedia.org/wiki/Search_engine_optimization" },
      { keyword: "freelancing", url: "https://en.wikipedia.org/wiki/Freelancer" },
      { keyword: "fintech", url: "https://en.wikipedia.org/wiki/Financial_technology" },
      { keyword: "e-commerce", url: "https://en.wikipedia.org/wiki/E-commerce" },
    ];
    for (const ak of authorityKeywords) {
      backlinks.push({ ...ak, rel: "noopener" });
    }

    fullHtml = injectBacklinks(fullHtml, backlinks);

    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: postData.faq?.map((f: any) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })) || [],
    };

    const result: any = {
      title: postData.title,
      excerpt: postData.excerpt || postData.meta_description,
      content: fullHtml,
      faq_schema: JSON.stringify(faqSchema),
      featured_image: guestSubmission?.banner_url || aiCoverImage || stockCoverImage || postData.sections?.[0]?.image_url || null,
      keywords: postData.keywords || [],
      suggested_category: postData.suggested_category || null,
      trending_topic: useTrending ? finalTopic : null,
      has_youtube: !!youtubeEmbed,
    };

    if (autoPublish && authorId) {
      try {
        const slug = generateSlug(postData.title);
        const { data: existing } = await sb.from("blog_posts").select("id").eq("slug", slug).maybeSingle();
        if (existing) {
          result.skipped = true;
          result.skip_reason = "Duplicate slug";
        } else {
          let catId = categoryId || guestSubmission?.category_id || null;
          if (!catId && postData.suggested_category) {
            const { data: cat } = await sb.from("categories").select("id").eq("slug", postData.suggested_category).eq("type", "blog").maybeSingle();
            if (cat) catId = cat.id;
          }

          const { data: newPost } = await sb.from("blog_posts").insert({
            title: postData.title,
            slug,
            excerpt: postData.excerpt,
            content: fullHtml,
            featured_image: result.featured_image,
            category_id: catId,
            published: true,
            published_at: new Date().toISOString(),
            author_id: authorId,
          }).select("id").single();

          result.auto_published = true;
          result.post_id = newPost?.id;
          result.slug = slug;

          if (guestSubmission && newPost) {
            await sb.from("guest_blog_submissions").update({
              status: "published",
              generated_post_id: newPost.id,
            }).eq("id", guestSubmission.id);

            // Notify submitter immediately
            if (guestSubmission.user_id) {
              try {
                await sb.from("user_notifications").insert({
                  user_id: guestSubmission.user_id,
                  title: "Your Business Blog is Live! 🎉",
                  body: `Your business feature for "${guestSubmission.business_name}" is published and live on Bethelincovibe TV. Tap to view your article!`,
                  url: `/blog/${slug}`,
                  is_read: false,
                });
              } catch (nErr) {
                console.error("Failed to insert notification:", nErr);
              }
            }
          }
        }
      } catch (e) {
        console.error("Auto-publish error:", e);
        result.auto_publish_error = e instanceof Error ? e.message : "Failed";
        if (guestSubmission) {
          await sb.from("guest_blog_submissions").update({ status: "review" }).eq("id", guestSubmission.id);
        }
      }
    } else if (guestSubmission) {
      // Generated but not auto-published — move to review
      await sb.from("guest_blog_submissions").update({ status: "review" }).eq("id", guestSubmission.id);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("ai-blogger error:", e);
    const code = e.status === 402
      ? "AI_CREDITS_EXHAUSTED"
      : e.status === 429 ? "RATE_LIMITED" : "SERVICE_FAILED";
    const userMessage = e.status === 402
      ? "AI credits exhausted. Please top up your Lovable AI balance in Settings → Workspace → Usage."
      : e.message || "Unknown error";
    // Always return 200 so the frontend doesn't crash; surface error in payload.
    return new Response(JSON.stringify({ error: code, message: userMessage }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
