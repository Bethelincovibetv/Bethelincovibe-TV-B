import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/integrations/supabase/client";

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

// Built-in verified high-performing Lagos & Nigerian market trends
export const TRENDING_MARKET_INTELLIGENCE = [
  {
    topic: "Scaling a Tech-Enabled SME in Lagos (2026 Strategy)",
    category: "Business & Startups",
    isVlog: true,
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // fallback placeholder
    keywords: ["Lagos SME", "Business Growth", "Digital Marketing", "Cash Flow"],
    angle: "Actionable playbook on customer acquisition, logistics optimization, and online sales channels.",
  },
  {
    topic: "Top Funding, Grants & Angel Investor Programs in Nigeria",
    category: "Finance & Investment",
    isVlog: false,
    keywords: ["Nigeria Grants", "Startup Funding", "Pitch Deck", "Angel Capital"],
    angle: "Comprehensive directory of active grants, application deadlines, and evaluation secrets.",
  },
  {
    topic: "Wholesale Sourcing & Verified Suppliers in Alaba & Computer Village",
    category: "Marketplace & Directory",
    isVlog: true,
    keywords: ["Wholesale Nigeria", "Alaba Market", "Electronics Sourcing", "Verified Suppliers"],
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
    keywords: ["WhatsApp Marketing", "Lagos Sales", "Automated Catalog", "Customer Retention"],
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
 * Get configured Gemini Client or null
 */
export async function getGeminiClient(): Promise<GoogleGenAI | null> {
  try {
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
 * AI Admin Strategic Brainstorm with AI Blogger
 * Performs executive trend analysis, category selection, and formulates multi-post directives.
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
      "suggestedVideoUrl": "https://www.youtube.com/embed/VIDEO_ID or empty",
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
    // Map to existing category if possible
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
 * Turns strategic topics into full-length, formatted, high-converting blog/vlog posts.
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
  const gemini = await getGeminiClient();

  if (gemini) {
    try {
      const prompt = `You are the Lead AI Content Creator / Journalist for Bethelincovibe TV.
Your Executive AI Admin has assigned you the following directive:
Topic: "${topic}"
Strategic Angle: "${angle}"
Category: "${categoryName}"
Format: ${isVlog ? "Rich Vlog Video Article (include video commentary & time-stamped key points)" : "In-Depth Illustrated Business Guide"}
Keywords to Target: ${keywords.join(", ")}

Write a comprehensive, professional, captivating article in valid clean HTML (using <h2>, <h3>, <p>, <ul>, <li>, <blockquote>, <strong>).
Include practical takeaways, Lagos/Nigeria market specifics, and a call-to-action inviting readers to check out verified businesses on Bethelincovibe TV.

Return ONLY valid JSON:
{
  "title": "Final Catchy Headline",
  "slug": "url-friendly-slug",
  "excerpt": "2-3 sentence punchy summary",
  "content": "<h2>Section 1</h2><p>Full article body...</p>",
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

        return {
          title: parsed.title || topic,
          slug: (parsed.slug || topic).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
          excerpt: parsed.excerpt || angle,
          content: finalContent,
          is_vlog: isVlog,
          video_url: videoUrl,
          tags: parsed.tags || keywords,
          meta_description: parsed.meta_description || parsed.excerpt,
        };
      }
    } catch (err) {
      console.warn("Gemini article generation fallback:", err);
    }
  }

  // High-Grade Domain Fallback
  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let videoEmbedHtml = "";
  if (isVlog && videoUrl) {
    videoEmbedHtml = `
      <div style="position:relative; padding-bottom:56.25%; height:0; overflow:hidden; border-radius:16px; margin-bottom:24px; box-shadow:0 10px 25px rgba(0,0,0,0.15);">
        <iframe src="${videoUrl}" style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;" allowfullscreen></iframe>
      </div>
    `;
  }

  const fallbackHtml = `
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

    <div style="background:#eef2ff; border-left:4px solid #4f46e5; padding:16px 20px; border-radius:12px; margin-top:28px;">
      <h4 style="margin:0 0 6px; color:#312e81; font-weight:800;">🚀 Connect with Verified Suppliers & Directory Listings</h4>
      <p style="margin:0; font-size:14px; color:#3730a3;">Explore vetted suppliers, wholesale partners, and service providers across Lagos on <a href="/businesses" style="color:#4f46e5; font-weight:700;">Bethelincovibe TV Directory</a>.</p>
    </div>
  `;

  return {
    title: topic,
    slug: `${slug}-${Date.now().toString(36)}`,
    excerpt: angle,
    content: fallbackHtml,
    is_vlog: isVlog,
    video_url: videoUrl,
    tags: keywords.length ? keywords : ["Business", "Nigeria", "Growth", "Vlog"],
    meta_description: angle.slice(0, 155),
  };
}

/**
 * AI Admin Custom Page Architect
 * Generates an ultra-professional Landing / Sales / Showcase page ready for live publishing.
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
    { "title": "Benefit Title 3", "desc": "Concrete description of the outcome." },
    { "title": "Benefit Title 4", "desc": "Concrete description of the outcome." }
  ],
  "social_proof": [
    { "quote": "Working with this system doubled our revenue in 60 days.", "author": "Emeka O.", "role": "CEO, Lagos Retail Hub", "rating": 5 },
    { "quote": "The clarity and professional execution exceeded all expectations.", "author": "Fatima A.", "role": "Founder, TechGrowth", "rating": 5 }
  ],
  "cta_text": "Get Started Today / Order Now",
  "template_key": "modern",
  "seo_title": "SEO Optimized Page Title",
  "seo_description": "SEO meta description under 155 chars"
}`;

      const res = await gemini.models.generateContent({
        model: "gemini-3.7-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      const text = res.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const p = JSON.parse(jsonMatch[0]);
        return {
          product_name: p.product_name || pageConcept,
          slug: (p.slug || pageConcept).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
          headline: p.headline || `Accelerate Your Growth with ${pageConcept}`,
          subheadline: p.subheadline || `The complete professional solution designed specifically for ${targetAudience}.`,
          product_description: p.product_description || `A comprehensive, turnkey solution built to streamline operations and maximize revenue.`,
          problem: p.problem || `Most businesses struggle with inconsistent customer flow, complex tools, and lack of verified market access.`,
          solution: p.solution || `We provide an all-in-one verified platform that automates discovery, boosts visibility, and drives measurable results.`,
          benefits: Array.isArray(p.benefits) ? p.benefits : [
            { title: "Rapid Setup & Launch", desc: "Get live within minutes with verified assets." },
            { title: "Maximum Local Reach", desc: "Target thousands of verified buyers in Lagos." },
            { title: "Direct WhatsApp Conversion", desc: "Turn visitors into direct paying customers." }
          ],
          social_proof: Array.isArray(p.social_proof) ? p.social_proof : [
            { quote: "Exceptional platform performance and high ROI.", author: "Tunde B.", role: "Managing Partner", rating: 5 }
          ],
          price: pricingNaira,
          currency: "NGN",
          cta_text: p.cta_text || "Claim Exclusive Access Now",
          product_image_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80",
          contact_whatsapp: contactWhatsApp,
          contact_email: contactEmail,
          template_key: p.template_key || "modern",
          lead_capture_enabled: true,
          seo_title: p.seo_title || `${pageConcept} | Bethelincovibe TV`,
          seo_description: p.seo_description || `Discover the best solution for ${pageConcept} in Nigeria.`,
        };
      }
    } catch (err) {
      console.warn("Gemini page generation fallback:", err);
    }
  }

  // High-Grade Domain Fallback Page
  const slug = pageConcept.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    product_name: pageConcept,
    slug: `${slug}-${Date.now().toString(36)}`,
    headline: `Unlock Premium Results with ${pageConcept}`,
    subheadline: `The definitive, high-converting framework engineered for ${targetAudience}.`,
    product_description: `Designed for discerning business leaders, this custom page delivers end-to-end capabilities, seamless customer acquisition, and high-trust conversion touchpoints.`,
    problem: `Entrepreneurs frequently waste capital on fragmented tools, unreliable traffic sources, and low-converting pages that fail to build authority.`,
    solution: `Our specialized framework unifies verified directory credibility, direct WhatsApp integration, and optimized user journeys to turn visitors into buyers.`,
    benefits: [
      { title: "Verified Authority Badge", desc: "Gain instant credibility with our official platform backing." },
      { title: "Direct WhatsApp Funnels", desc: "Capture qualified leads straight to your phone with zero delay." },
      { title: "Zero Technical Hassle", desc: "Fully hosted, mobile-responsive, and ultra-fast loading." },
      { title: "Dedicated Search Visibility", desc: "Indexed across Google and Bethelincovibe TV directories." },
    ],
    social_proof: [
      { quote: "Our inquiries tripled within 48 hours of launching this page.", author: "Chinedu M.", role: "Director, Apex Logistics", rating: 5 },
      { quote: "Super clean layout and fantastic customer experience.", author: "Amina K.", role: "Founder, Luxe Beauty Hub", rating: 5 },
    ],
    price: pricingNaira,
    currency: "NGN",
    cta_text: "Contact Us & Get Started",
    product_image_url: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200&auto=format&fit=crop&q=80",
    contact_whatsapp: contactWhatsApp,
    contact_email: contactEmail,
    template_key: "modern",
    lead_capture_enabled: true,
    seo_title: `${pageConcept} - Bethelincovibe TV`,
    seo_description: `Comprehensive guide and showcase for ${pageConcept}.`,
  };
}
