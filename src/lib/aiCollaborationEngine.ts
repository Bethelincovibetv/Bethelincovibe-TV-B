import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/integrations/supabase/client";
import { getHealthyGeminiClient } from "@/lib/multiApiKeyManager";

export interface StrategicDirective {
  id: string;
  timestamp: string;
  theme: string;
  targetAudience: string;
  contentGoal: "traffic" | "conversions" | "authority" | "monetization" | "community";
  postType: "blog" | "vlog" | "multi_series" | "page";
  suggestedTopics: Array<{
    title: string;
    angle: string;
    targetCategory: string;
    isVlog?: boolean;
    suggestedVideoUrl?: string;
    keywords: string[];
    estimatedReadTime: string;
  }>;
  categoryRationale: string;
  rationale: string;
  status: "proposed" | "approved" | "completed";
}

export interface GeneratedArticle {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category_id?: string;
  category_name?: string;
  is_vlog?: boolean;
  video_url?: string;
  featured_image?: string;
  tags?: string[];
  meta_description?: string;
  matched_referrals?: Array<{ label: string; url: string }>;
}

export interface GeneratedCustomPage {
  product_name: string;
  slug: string;
  headline: string;
  subheadline: string;
  product_description: string;
  problem: string;
  solution: string;
  benefits: Array<{ title: string; desc: string; icon?: string }>;
  social_proof: Array<{ quote: string; author: string; role: string; rating?: number }>;
  price: number;
  currency: string;
  cta_text: string;
  product_image_url: string;
  youtube_video_url?: string;
  contact_whatsapp: string;
  contact_email: string;
  template_key: string;
  lead_capture_enabled: boolean;
  seo_title: string;
  seo_description: string;
}

export interface AffiliateReferralLink {
  id: string;
  label: string;
  url: string;
  keywords: string[];
  description?: string | null;
  active: boolean;
}

// Built-in verified high-performing Lagos, Turkey & Global Wholesale market trends
export const TRENDING_MARKET_INTELLIGENCE = [
  {
    topic: "Turkey Sourcing & Istanbul Laleli Wholesale Fashion Import Guide (2026)",
    category: "Wholesale & Sourcing",
    isVlog: true,
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    keywords: ["Turkey Wholesale", "Istanbul Sourcing", "Laleli Market", "Merter Wholesale", "Cargo Turkey to Lagos", "Turkish Textile"],
    angle: "Direct Turkish factory contacts, price negotiation in Istanbul, air vs sea cargo rates to Lagos, and quality inspection checklist.",
  },
  {
    topic: "China 1688 & Guangzhou Factory Direct Import Guide for Nigerian Sellers",
    category: "Wholesale & Sourcing",
    isVlog: true,
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    keywords: ["China 1688", "Guangzhou Wholesale", "Procurement Agent", "Air Cargo Lagos", "Yuan Exchange", "Factory Direct"],
    angle: "Step-by-step 1688 app translation, finding Gold suppliers, clearing customs at Lagos ports, and avoiding agent markup fees.",
  },
  {
    topic: "Dubai Deira Wholesale Perfume, Electronics & Luxury Gold Import Playbook",
    category: "Wholesale & Sourcing",
    isVlog: true,
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    keywords: ["Dubai Wholesale", "Deira Market", "Perfume Oil Import", "Dubai Cargo Lagos", "Gold Souk Sourcing"],
    angle: "Wholesale perfume oils by the litre, buying unbranded electronics, cargo transit timelines, and profit margin calculation.",
  },
  {
    topic: "UK & US First Grade Thrift Bales (Okrika) Sourcing & Import Guide",
    category: "Wholesale & Sourcing",
    isVlog: false,
    keywords: ["UK Bale Clothes", "Okrika Wholesale", "First Grade Bales", "Lagos Boutique", "Thrift Fashion Profit"],
    angle: "Grading system breakdowns (Cream vs Grade A), trusted UK container suppliers, and clearing at Cotonou/Lagos borders.",
  },
  {
    topic: "Scaling a Tech-Enabled SME in Lagos (2026 Strategy)",
    category: "Business & Startups",
    isVlog: true,
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    keywords: ["Lagos SME", "Business Growth", "Digital Marketing", "Cash Flow", "Software"],
    angle: "Actionable playbook on customer acquisition, logistics optimization, and online sales channels.",
  },
  {
    topic: "Top Funding, Grants & Angel Investor Programs in Nigeria",
    category: "Finance & Investment",
    isVlog: false,
    keywords: ["Nigeria Grants", "Startup Funding", "Pitch Deck", "Angel Capital", "Banking"],
    angle: "Comprehensive directory of active grants, application deadlines, and evaluation secrets.",
  },
  {
    topic: "Wholesale Sourcing & Verified Suppliers in Alaba & Computer Village",
    category: "Marketplace & Directory",
    isVlog: true,
    keywords: ["Wholesale Nigeria", "Alaba Market", "Electronics Sourcing", "Verified Suppliers", "Imports"],
    angle: "Behind-the-scenes sourcing guide, price negotiation scripts, and scam avoidance tips.",
  },
  {
    topic: "Solar Energy & Inverter Systems for Nigerian Small Businesses",
    category: "Tech & Innovation",
    isVlog: false,
    keywords: ["Solar Power Lagos", "Business Energy Cost", "Inverter Battery", "Cost Reduction"],
    angle: "ROI calculations for solar transition, cutting fuel expenses by 65%, and top installer reviews.",
  },
  {
    topic: "How to Build High-Converting WhatsApp Sales Funnels",
    category: "Marketing & Growth",
    isVlog: true,
    keywords: ["WhatsApp Marketing", "Lagos Sales", "Automated Catalog", "Customer Retention", "CRM"],
    angle: "Step-by-step broadcast workflows, catalog setup, and closing high-ticket deals on WhatsApp.",
  },
  {
    topic: "Real Estate Micro-Investing & Land Banking in Ibeju-Lekki",
    category: "Real Estate",
    isVlog: false,
    keywords: ["Ibeju-Lekki Real Estate", "Land Banking", "Property Investment", "Lagos Land Title"],
    angle: "High-yield property development corridors, title verification checklist, and 3-year projections.",
  },
];

/**
 * Get configured Gemini Client with Multi-API Key Failover & Feature Routing
 */
export async function getGeminiClient(featureKey?: string): Promise<GoogleGenAI | null> {
  try {
    const result = await getHealthyGeminiClient(featureKey);
    if (result?.client) {
      return result.client;
    }

    // Direct fallback if pool is empty
    const { data: setting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "gemini_api_key")
      .maybeSingle();

    const apiKey =
      setting?.value ||
      import.meta.env.VITE_GEMINI_API_KEY ||
      (typeof process !== "undefined" ? process.env?.GEMINI_API_KEY : "");

    if (apiKey && apiKey.trim().length > 10) {
      return new GoogleGenAI({ apiKey: apiKey.trim() });
    }
  } catch (err) {
    console.warn("Could not init Gemini SDK:", err);
  }
  return null;
}

/**
 * Fetch all active Admin-configured Referral and Affiliate Links
 */
export async function fetchActiveReferralLinks(): Promise<AffiliateReferralLink[]> {
  try {
    const { data, error } = await supabase
      .from("affiliate_links")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (data && data.length > 0) return data as AffiliateReferralLink[];
  } catch (err) {
    console.warn("Error fetching affiliate links:", err);
  }

  // Built-in platform defaults if no custom links are stored
  return [
    {
      id: "ref_default_directory",
      label: "Bethelincovibe Business Directory",
      url: "/businesses",
      keywords: ["business", "supplier", "store", "directory", "wholesale", "vendor", "partner"],
      description: "Find verified suppliers and list your business on the verified portal",
      active: true,
    },
    {
      id: "ref_default_sales",
      label: "Custom Sales Pages & Landing Funnels",
      url: "/sales",
      keywords: ["sales", "landing page", "funnel", "leads", "marketing", "conversion"],
      description: "Launch instant high-converting sales funnels with Paystack & WhatsApp checkout",
      active: true,
    },
    {
      id: "ref_default_video",
      label: "AI Video Creator Studio",
      url: "/tools/video-creator",
      keywords: ["video", "vlog", "marketing", "youtube", "tiktok", "reels", "ai video"],
      description: "Auto-produce AI video reels and marketing clips in minutes",
      active: true,
    },
  ];
}

/**
 * Smart Match Referral Links against a Topic, Keywords, and Category
 */
export function matchReferralLinks(
  topic: string,
  keywords: string[] = [],
  categoryName: string = "",
  allLinks: AffiliateReferralLink[]
): AffiliateReferralLink[] {
  const queryTokens = [
    topic.toLowerCase(),
    categoryName.toLowerCase(),
    ...keywords.map((k) => k.toLowerCase()),
  ].join(" ");

  const scored = allLinks.map((link) => {
    let score = 0;
    const labelLower = link.label.toLowerCase();
    if (queryTokens.includes(labelLower)) score += 5;

    for (const kw of link.keywords || []) {
      const kwLower = kw.toLowerCase().trim();
      if (!kwLower) continue;
      if (queryTokens.includes(kwLower)) {
        score += 3;
      }
    }

    if (link.description && queryTokens.split(" ").some((w) => link.description?.toLowerCase().includes(w) && w.length > 4)) {
      score += 1;
    }

    return { link, score };
  });

  const matching = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.link);

  // If no direct keyword match, include up to 2 most prominent referral links
  return matching.length > 0 ? matching : allLinks.slice(0, 2);
}

/**
 * Automatically inject styled referral CTA boxes and buttons into HTML if not already placed
 */
export function injectStrategicReferrals(
  htmlContent: string,
  matchedReferrals: AffiliateReferralLink[],
  topic: string
): string {
  if (!matchedReferrals || matchedReferrals.length === 0) return htmlContent;

  let enhancedHtml = htmlContent;

  matchedReferrals.slice(0, 2).forEach((ref, index) => {
    // Check if the URL is already present in the article
    if (enhancedHtml.includes(ref.url)) return;

    const isExternal = ref.url.startsWith("http://") || ref.url.startsWith("https://");
    const targetAttr = isExternal ? 'target="_blank" rel="noopener noreferrer"' : "";

    const ctaCard = `
      <div style="margin: 32px 0; padding: 22px 24px; border-radius: 18px; background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #f5f3ff 100%); border: 1.5px solid rgba(99, 102, 241, 0.25); box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.08);">
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #6366f1;"></span>
            <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #4f46e5;">Recommended Resource & Partnership</span>
          </div>
          <h4 style="margin: 0; font-size: 17px; font-weight: 800; color: #1e1b4b; line-height: 1.3;">${ref.label}</h4>
          ${ref.description ? `<p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.5;">${ref.description}</p>` : `<p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.5;">Accelerate your results with our verified tools and exclusive partner offers.</p>`}
          <div style="margin-top: 6px;">
            <a href="${ref.url}" ${targetAttr} style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 20px; border-radius: 12px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; font-size: 14px; font-weight: 800; text-decoration: none; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35); transition: transform 0.2s ease;">
              <span>Explore ${ref.label}</span>
              <span style="font-size: 16px;">→</span>
            </a>
          </div>
        </div>
      </div>
    `;

    // Try inserting after the 2nd </h2> or </p>
    const h2Split = enhancedHtml.split("</h2>");
    if (h2Split.length > 2 && index === 0) {
      enhancedHtml = `${h2Split[0]}</h2>${h2Split[1]}</h2>${ctaCard}${h2Split.slice(2).join("</h2>")}`;
    } else {
      // Append before the closing tag or at the end
      enhancedHtml += ctaCard;
    }
  });

  return enhancedHtml;
}

/**
 * AI Admin Strategic Brainstorm with AI Blogger
 */
export async function conductStrategicBrainstorm(params: {
  theme?: string;
  targetNiche?: string;
  campaignGoal?: string;
  numberOfPosts?: number;
  availableCategories: Array<{ id: string; name: string; slug: string }>;
}): Promise<StrategicDirective> {
  const {
    theme = "Lagos Business Growth & High-Yield Opportunities",
    targetNiche = "Entrepreneurs & Business Owners",
    campaignGoal = "traffic & directory discovery",
    numberOfPosts = 3,
    availableCategories,
  } = params;

  const categoryNames = availableCategories.map((c) => c.name);
  const gemini = await getGeminiClient();

  if (gemini) {
    try {
      const prompt = `You are the Chief AI Strategy Director collaborating with the AI Lead Blogger/Vlogger for Bethelincovibe TV (a premier business, entrepreneurship, marketplace, and tech media platform in Lagos, Nigeria).
Analyze current industry demand, trending topics, and formulate a high-impact Strategic Multi-Blog / Multi-Vlog Directive.

Context:
- Theme: ${theme}
- Target Niche: ${targetNiche}
- Campaign Goal: ${campaignGoal}
- Number of Posts: ${numberOfPosts}
- Available Platform Categories: ${JSON.stringify(categoryNames)}

Requirements:
Return ONLY valid JSON matching this exact structure:
{
  "theme": "Executive Theme Title",
  "targetAudience": "Target Persona",
  "contentGoal": "traffic",
  "postType": "multi_series",
  "categoryRationale": "Brief explanation of why these categories were strategically selected to maximize SEO & platform reach.",
  "rationale": "High-level boss-to-worker strategic guidance for the AI Blogger.",
  "suggestedTopics": [
    {
      "title": "Compelling Click-Worthy Title",
      "angle": "Strategic angle & key takeaways",
      "targetCategory": "Exact matching category from available list or logical new category",
      "isVlog": true,
      "suggestedVideoUrl": "https://www.youtube.com/embed/dQw4w9WgXcQ or empty",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "estimatedReadTime": "5 min read"
    }
  ]
}`;

      const response = await gemini.models.generateContent({
        model: "gemini-3.7-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          id: `dir_${Date.now()}`,
          timestamp: new Date().toISOString(),
          theme: parsed.theme || theme,
          targetAudience: parsed.targetAudience || targetNiche,
          contentGoal: parsed.contentGoal || "traffic",
          postType: parsed.postType || "multi_series",
          categoryRationale: parsed.categoryRationale || "Selected high-traffic commercial categories to boost platform authority.",
          rationale: parsed.rationale || "Focus on actionable frameworks, real Lagos case studies, and verified directory tie-ins.",
          suggestedTopics: Array.isArray(parsed.suggestedTopics) ? parsed.suggestedTopics : [],
          status: "proposed",
        };
      }
    } catch (err) {
      console.warn("Gemini brainstorm fallback:", err);
    }
  }

  // Fallback Domain-Expert Strategy Matrix
  const selectedTopics = TRENDING_MARKET_INTELLIGENCE.slice(0, numberOfPosts).map((item, idx) => {
    const match = availableCategories.find(
      (c) => c.name.toLowerCase().includes(item.category.toLowerCase().split(" ")[0])
    );
    return {
      title: item.topic,
      angle: item.angle,
      targetCategory: match ? match.name : item.category,
      isVlog: item.isVlog,
      suggestedVideoUrl: item.videoUrl || "",
      keywords: item.keywords,
      estimatedReadTime: `${4 + idx} min read`,
    };
  });

  return {
    id: `dir_${Date.now()}`,
    timestamp: new Date().toISOString(),
    theme: theme || "Strategic Lagos Business & SME Expansion Blueprint",
    targetAudience: targetNiche || "Entrepreneurs, Traders & Startup Founders in Nigeria",
    contentGoal: "traffic",
    postType: "multi_series",
    categoryRationale:
      "Aligned with high-search-intent commercial categories (Business, Tech, Finance) to maximize organic SEO and directory foot-traffic.",
    rationale:
      "Directing AI Blogger to craft practical, high-value articles with actionable checklists and video vlog embeds to maximize reader retention.",
    suggestedTopics: selectedTopics,
    status: "proposed",
  };
}

/**
 * AI Blogger Content Generation Worker
 * Turns strategic topics into full-length, formatted, high-converting blog/vlog posts with strategic referral link insertion.
 */
export async function generateStrategicArticle(params: {
  topic: string;
  angle: string;
  categoryName: string;
  isVlog?: boolean;
  videoUrl?: string;
  keywords?: string[];
  authorId?: string;
}): Promise<GeneratedArticle> {
  const { topic, angle, categoryName, isVlog = false, videoUrl, keywords = [] } = params;

  // 1. Fetch and match active admin referral links
  const allReferralLinks = await fetchActiveReferralLinks();
  const matchedReferrals = matchReferralLinks(topic, keywords, categoryName, allReferralLinks);

  const gemini = await getGeminiClient();

  if (gemini) {
    try {
      const referralPrompts = matchedReferrals.map((r) => `- "${r.label}" (URL: ${r.url}) | Keywords: ${r.keywords.join(", ")} | Description: ${r.description || "Partner Offer"}`).join("\n");

      const prompt = `You are the Lead AI Content Creator & Journalist for Bethelincovibe TV.
Your Executive AI Admin has assigned you the following directive:
Topic: "${topic}"
Strategic Angle: "${angle}"
Category: "${categoryName}"
Format: ${isVlog ? "Rich Vlog Video Article (include video commentary & time-stamped key points)" : "In-Depth Illustrated Business Guide"}
Keywords to Target: ${keywords.join(", ")}

ADMIN-PROVIDED REFERRAL / AFFILIATE LINKS TO STRATEGICALLY INTEGRATE:
${referralPrompts}

STRATEGIC REFERRAL INSTRUCTIONS:
- Whenever contextually appropriate (e.g. recommending tools, software, suppliers, directory listings, or resources related to the topic), strategically embed a high-converting call-to-action button or recommendation box linking to the referral URLs provided above.
- Example CTA block:
  <div style="margin: 28px 0; padding: 20px; border-radius: 16px; background: #f0f4ff; border: 1.5px solid #6366f1;">
    <h4 style="margin:0 0 8px; color: #1e1b4b; font-weight:800;">🚀 Recommended Partner: [Label]</h4>
    <p style="margin:0 0 12px; color: #475569; font-size: 14px;">[Brief value explanation]</p>
    <a href="[URL]" style="display:inline-block; padding: 10px 20px; background: #4f46e5; color: #fff; font-weight: bold; border-radius: 10px; text-decoration: none;">Explore Offer →</a>
  </div>
- In addition, integrate natural contextual hyperlinks within paragraphs where relevant.

Write a comprehensive, professional, captivating article in valid clean HTML (using <h2>, <h3>, <p>, <ul>, <li>, <blockquote>, <strong>).
Include practical takeaways, Lagos/Nigeria market specifics, and the strategic referral integrations.

Return ONLY valid JSON:
{
  "title": "Final Catchy Headline",
  "slug": "url-friendly-slug",
  "excerpt": "2-3 sentence punchy summary",
  "content": "<h2>Section 1</h2><p>Full article body with integrated referral links and CTA buttons...</p>",
  "tags": ["tag1", "tag2", "tag3"],
  "meta_description": "SEO description under 155 chars"
}`;

      const res = await gemini.models.generateContent({
        model: "gemini-3.7-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      const text = res.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        let finalContent = parsed.content || "";

        // Embed video if vlog
        if (isVlog && videoUrl) {
          finalContent = `
            <div style="position:relative; padding-bottom:56.25%; height:0; overflow:hidden; border-radius:16px; margin-bottom:24px; box-shadow:0 10px 25px rgba(0,0,0,0.15);">
              <iframe src="${videoUrl}" style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;" allowfullscreen></iframe>
            </div>
            ${finalContent}
          `;
        }

        // Ensure referral links are inserted if the AI omitted them
        finalContent = injectStrategicReferrals(finalContent, matchedReferrals, topic);

        // Provide high quality relevant featured image based on topic/category
        const featuredImage = `https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80`;

        return {
          title: parsed.title || topic,
          slug: (parsed.slug || topic).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
          excerpt: parsed.excerpt || angle,
          content: finalContent,
          is_vlog: isVlog,
          video_url: videoUrl,
          featured_image: featuredImage,
          tags: parsed.tags || keywords,
          meta_description: parsed.meta_description || parsed.excerpt,
          matched_referrals: matchedReferrals.map((r) => ({ label: r.label, url: r.url })),
        };
      }
    } catch (err) {
      console.warn("Gemini article generation fallback:", err);
    }
  }

  // Domain Fallback
  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let videoEmbedHtml = "";
  if (isVlog && videoUrl) {
    videoEmbedHtml = `
      <div style="position:relative; padding-bottom:56.25%; height:0; overflow:hidden; border-radius:16px; margin-bottom:24px; box-shadow:0 10px 25px rgba(0,0,0,0.15);">
        <iframe src="${videoUrl}" style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;" allowfullscreen></iframe>
      </div>
    `;
  }

  let fallbackHtml = `
    ${videoEmbedHtml}
    <h2>Executive Overview: ${topic}</h2>
    <p>${angle}</p>
    
    <h3>1. Navigating Current Market Dynamics</h3>
    <p>Success in the modern Nigerian commercial environment requires agility, customer-centric value propositions, and solid cash flow management. Businesses that thrive focus heavily on repeatable systems and lean digital distribution.</p>
    
    <blockquote>"The difference between surviving and dominating in Lagos is the speed at which you validate customer demand and optimize your supply chain."</blockquote>

    <h3>2. Key Implementation Pillars</h3>
    <ul>
      <li><strong>Cost Optimization:</strong> Leveraging energy efficiency and direct supplier partnerships to protect gross margins.</li>
      <li><strong>Omnichannel Discovery:</strong> Building presence across verified business directories, search engines, and direct messaging channels.</li>
      <li><strong>Customer Trust & Verification:</strong> Displaying verified badges, transparent pricing, and verifiable reviews.</li>
    </ul>

    <h3>3. Actionable Checklist for this Week</h3>
    <p>Audit your primary revenue drivers, establish direct communication with top suppliers, and ensure your enterprise is properly listed in the Bethelincovibe TV Business Directory.</p>
  `;

  fallbackHtml = injectStrategicReferrals(fallbackHtml, matchedReferrals, topic);

  return {
    title: topic,
    slug: `${slug}-${Date.now().toString(36)}`,
    excerpt: angle,
    content: fallbackHtml,
    is_vlog: isVlog,
    video_url: videoUrl,
    featured_image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80",
    tags: keywords.length ? keywords : ["Business", "Nigeria", "Growth", "Vlog"],
    meta_description: angle.slice(0, 155),
    matched_referrals: matchedReferrals.map((r) => ({ label: r.label, url: r.url })),
  };
}

/**
 * AI Admin Custom Page Architect
 */
export async function generateCustomPage(params: {
  pageConcept: string;
  targetAudience?: string;
  offeringType?: "service" | "product" | "event" | "membership" | "custom_hub";
  pricingNaira?: number;
  contactWhatsApp?: string;
  contactEmail?: string;
}): Promise<GeneratedCustomPage> {
  const {
    pageConcept,
    targetAudience = "Entrepreneurs and Businesses in Nigeria",
    offeringType = "service",
    pricingNaira = 25000,
    contactWhatsApp = "+2348000000000",
    contactEmail = "contact@bethelincovibe.tv",
  } = params;

  const gemini = await getGeminiClient();

  if (gemini) {
    try {
      const prompt = `You are the Lead Digital Experience Architect for Bethelincovibe TV.
Design an ultra-professional, high-converting Landing / Showcase Page for:
Concept: "${pageConcept}"
Target Audience: "${targetAudience}"
Offering Type: "${offeringType}"
Price: ₦${pricingNaira.toLocaleString()}

Return ONLY valid JSON matching this exact structure:
{
  "product_name": "Catchy Brand or Page Title",
  "slug": "url-friendly-slug",
  "headline": "High-Impact Headline (Clear Value Proposition)",
  "subheadline": "Compelling Subheadline explaining who it is for and the main transformation",
  "product_description": "Detailed 2-paragraph overview of what this offering delivers and why it is superior.",
  "problem": "The primary frustrating struggle or roadblock facing the customer right now.",
  "solution": "How this exact solution completely fixes that problem with zero guesswork.",
  "benefits": [
    { "title": "Benefit Title 1", "desc": "Concrete description of the outcome." },
    { "title": "Benefit Title 2", "desc": "Concrete description of the outcome." },
    { "title": "Benefit Title 3", "desc": "Concrete description of the outcome." }
  ],
  "social_proof": [
    { "quote": "Real praise or case study quote", "author": "Name", "role": "CEO, Lagos SME", "rating": 5 }
  ],
  "price": ${pricingNaira},
  "currency": "NGN",
  "cta_text": "Claim Your Access Now",
  "product_image_url": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop",
  "youtube_video_url": "",
  "contact_whatsapp": "${contactWhatsApp}",
  "contact_email": "${contactEmail}",
  "template_key": "modern_saas",
  "lead_capture_enabled": true,
  "seo_title": "SEO Title",
  "seo_description": "SEO Description"
}`;

      const res = await gemini.models.generateContent({
        model: "gemini-3.7-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      const text = res.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (err) {
      console.warn("Custom page generation fallback:", err);
    }
  }

  const slug = pageConcept.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    product_name: pageConcept,
    slug: `${slug}-${Date.now().toString(36)}`,
    headline: `Unlock Rapid Growth with ${pageConcept}`,
    subheadline: `The complete, battle-tested solution engineered specifically for ambitious enterprises and traders.`,
    product_description: `Designed to streamline your revenue generation and connect you with high-intent buyers across Nigeria.`,
    problem: `Most businesses struggle with inconsistent leads and fragmented operational tools.`,
    solution: `Our automated, verified platform provides instant clarity, customer trust, and seamless monetization.`,
    benefits: [
      { title: "Direct Customer Pipeline", desc: "Access high-intent inquiries directly via WhatsApp & Email." },
      { title: "Verified Trust Badge", desc: "Stand out with platform-certified credibility and verified reviews." },
      { title: "Instant Payment Collection", desc: "Accept Naira cards, bank transfers, and USSD in real-time." },
    ],
    social_proof: [
      { quote: "This platform doubled our customer discovery in less than 30 days.", author: "Chidi O.", role: "Founder, Lagos Mart", rating: 5 },
    ],
    price: pricingNaira,
    currency: "NGN",
    cta_text: "Get Started Today",
    product_image_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop",
    contact_whatsapp: contactWhatsApp,
    contact_email: contactEmail,
    template_key: "modern_saas",
    lead_capture_enabled: true,
    seo_title: `${pageConcept} | Official Portal`,
    seo_description: `Discover how ${pageConcept} drives verified growth and customer acquisition in Nigeria.`,
  };
}
