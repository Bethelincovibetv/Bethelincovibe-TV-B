import { getGeminiClient } from "./aiCollaborationEngine";

export interface ServiceDesignInput {
  businessName?: string;
  category?: string;
  serviceConcept: string; // e.g. "we build websites for small businesses" or "solar inverter installation in Lagos"
  targetAudience?: string;
  pricingModel?: string;
  cityOrRegion?: string;
}

export interface DesignedService {
  id?: string;
  title: string;
  description: string;
  benefits: string[];
  ctaText: string;
  suggestedPrice?: string;
  keywords: string[];
  visualDirection: string;
  suggestedImageQuery: string;
  image_url?: string;
  link_url?: string;
}

export interface ServiceCatalogDesignResult {
  headline: string;
  services: DesignedService[];
  recommendedKeywords: string[];
}

export async function generateSingleServiceWithAI(
  input: ServiceDesignInput
): Promise<DesignedService> {
  const prompt = `You are an elite Business Service Designer and Direct-Response Copywriting Architect for modern African & global enterprises on Bethelincovibe.

A business owner wants to create a compelling, high-converting SERVICE listing.
BUSINESS CONTEXT:
- Business Name: "${input.businessName || "Verified Business"}"
- Industry / Category: "${input.category || "Professional Services"}"
- Service Concept / Offer: "${input.serviceConcept}"
- Target Clients: "${input.targetAudience || "High-value clients, businesses, and discerning consumers"}"
- Location: "${input.cityOrRegion || "Nigeria / Global"}"

YOUR TASK:
Transform this service concept into a polished, professional service product.
Return a STRICT JSON object matching this schema:
{
  "title": "Clear, professional, and appealing service title (3-6 words)",
  "description": "High-converting 2-3 sentence description explaining the key transformation, quality guarantee, and client outcome.",
  "benefits": [
    "Compelling benefit or deliverable 1",
    "Compelling benefit or deliverable 2",
    "Compelling benefit or deliverable 3",
    "Compelling benefit or deliverable 4"
  ],
  "ctaText": "Short action hook (e.g. 'Inquire on WhatsApp', 'Request Custom Quote', 'Book Free Consultation')",
  "suggestedPrice": "Realistic pricing guidance or 'Custom Quote / Negotiable' (e.g. 'From ₦85,000 / Project')",
  "keywords": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "visualDirection": "Visual description of the ideal photo representing this service (e.g. 'modern web developer workspace dual screens clean minimal')",
  "suggestedImageQuery": "1-3 high-impact photography keywords for searching stock photos (e.g. 'web designer workspace laptop')"
}

RULES:
1. Output clean JSON only, no markdown markers.
2. Tone: Professional, trustworthy, persuasive.
3. Relevant to African/Global commerce standards.`;

  try {
    const gemini = await getGeminiClient();
    if (gemini) {
      const response = await gemini.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          temperature: 0.7,
        },
      });

      const text = response?.text || "";
      const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (parsed && parsed.title && parsed.description) {
        return {
          title: parsed.title,
          description: parsed.description,
          benefits: Array.isArray(parsed.benefits) && parsed.benefits.length > 0
            ? parsed.benefits
            : ["Fast Turnaround & Milestone Updates", "100% Quality Satisfaction Guarantee", "Direct WhatsApp Support", "Competitive & Transparent Pricing"],
          ctaText: parsed.ctaText || "Inquire on WhatsApp",
          suggestedPrice: parsed.suggestedPrice || "Custom Quote / Negotiable",
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [input.category?.toLowerCase() || "services", "professional"],
          visualDirection: parsed.visualDirection || `${input.serviceConcept} professional photography`,
          suggestedImageQuery: parsed.suggestedImageQuery || getSmartPexelsQuery(parsed.title, input.category),
        };
      }
    }
  } catch (err) {
    console.warn("AI Service Designer Gemini notice, using smart algorithmic service engine:", err);
  }

  // Fallback smart generator
  return generateFallbackSingleService(input);
}

export async function generateServiceCatalogWithAI(
  businessName: string,
  category: string,
  businessSummary: string
): Promise<ServiceCatalogDesignResult> {
  const prompt = `You are a Senior Business Product Strategist. Create a complete, structured catalog of 3 to 4 distinct, high-margin services for this business:

- Business Name: "${businessName}"
- Category: "${category}"
- Summary: "${businessSummary}"

Return a STRICT JSON object matching this schema:
{
  "headline": "Compelling service suite headline (e.g. 'Comprehensive Digital & Web Solutions for Scaling Brands')",
  "services": [
    {
      "title": "Service Name",
      "description": "Professional 2-sentence description highlighting client benefits.",
      "benefits": ["Benefit 1", "Benefit 2", "Benefit 3"],
      "ctaText": "Inquire on WhatsApp",
      "suggestedPrice": "From ₦50,000",
      "keywords": ["tag1", "tag2"],
      "visualDirection": "Visual prompt description",
      "suggestedImageQuery": "search query"
    }
  ],
  "recommendedKeywords": ["keyword1", "keyword2", "keyword3"]
}

Output valid JSON only.`;

  try {
    const gemini = await getGeminiClient();
    if (gemini) {
      const response = await gemini.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          temperature: 0.7,
        },
      });

      const text = response?.text || "";
      const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (parsed && Array.isArray(parsed.services) && parsed.services.length > 0) {
        return {
          headline: parsed.headline || `Core Services by ${businessName}`,
          services: parsed.services.map((s: any) => ({
            title: s.title || "Professional Service",
            description: s.description || "High-quality professional service tailored to your requirements.",
            benefits: Array.isArray(s.benefits) ? s.benefits : ["Quality Guarantee", "Prompt Delivery"],
            ctaText: s.ctaText || "Inquire on WhatsApp",
            suggestedPrice: s.suggestedPrice || "Custom Quote",
            keywords: Array.isArray(s.keywords) ? s.keywords : [category.toLowerCase()],
            visualDirection: s.visualDirection || `${s.title} visual`,
            suggestedImageQuery: s.suggestedImageQuery || getSmartPexelsQuery(s.title, category),
          })),
          recommendedKeywords: Array.isArray(parsed.recommendedKeywords) ? parsed.recommendedKeywords : [category.toLowerCase(), "lagos", "nigeria"],
        };
      }
    }
  } catch (err) {
    console.warn("AI Catalog Generator notice, using smart algorithmic catalog engine:", err);
  }

  // Smart fallback catalog
  return generateFallbackCatalog(businessName, category, businessSummary);
}

function getSmartPexelsQuery(title: string, category?: string): string {
  const clean = title.toLowerCase().replace(/[^a-z0-9\s]/g, "");
  const words = clean.split(/\s+/).filter(w => w.length > 2 && !["and", "the", "for", "with", "our"].includes(w));
  return words.slice(0, 3).join(" ") || category?.toLowerCase() || "business";
}

function generateFallbackSingleService(input: ServiceDesignInput): DesignedService {
  const concept = input.serviceConcept.trim();
  const title = formatServiceTitle(concept, input.category);
  const cat = input.category || "Professional Services";
  const city = input.cityOrRegion || "Nigeria";

  return {
    title,
    description: `Expert ${title.toLowerCase()} tailored to exceed client expectations. We deliver end-to-end reliability, premium craftsmanship, and prompt completion in ${city}.`,
    benefits: [
      "Customized Solution Designed For Your Needs",
      "Fast Turnaround & Transparent Updates",
      "Direct Priority WhatsApp Communication",
      "100% Satisfaction & Quality Assurance"
    ],
    ctaText: "Inquire on WhatsApp",
    suggestedPrice: "Custom Quote / Negotiable",
    keywords: [cat.toLowerCase().replace(/\s+/g, "-"), "verified", "direct-support", "nationwide"],
    visualDirection: `${title} modern workspace photography HD`,
    suggestedImageQuery: getSmartPexelsQuery(title, cat),
  };
}

function formatServiceTitle(concept: string, category?: string): string {
  const c = concept.toLowerCase();
  if (c.includes("web") || c.includes("site") || c.includes("software")) return "Custom Website & Software Development";
  if (c.includes("solar") || c.includes("inverter") || c.includes("power")) return "Solar Power & Inverter Installation";
  if (c.includes("tailor") || c.includes("fashion") || c.includes("cloth") || c.includes("wear")) return "Bespoke Fashion Design & Tailoring";
  if (c.includes("photo") || c.includes("video") || c.includes("shoot")) return "Professional Photography & Video Production";
  if (c.includes("food") || c.includes("cater") || c.includes("cake") || c.includes("chef")) return "Event Catering & Culinary Services";
  if (c.includes("legal") || c.includes("law") || c.includes("cac") || c.includes("reg")) return "Corporate CAC Registration & Legal Advisory";
  if (c.includes("clean") || c.includes("house") || c.includes("estate") || c.includes("build")) return "Premium Property & Facility Services";
  if (c.includes("logist") || c.includes("deliver") || c.includes("dispatch")) return "Same-Day Logistics & Express Dispatch";
  
  // Capitalize title words
  return concept
    .split(/\s+/)
    .slice(0, 5)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ") || `${category || "Business"} Service`;
}

function generateFallbackCatalog(
  businessName: string,
  category: string,
  _businessSummary: string
): ServiceCatalogDesignResult {
  const catLower = (category || "").toLowerCase();
  
  if (catLower.includes("tech") || catLower.includes("soft")) {
    return {
      headline: `Digital Solutions & Tech Services by ${businessName}`,
      services: [
        {
          title: "Custom Web Application & E-Commerce",
          description: "High-performance websites and online stores with integrated Nigerian payment gateways (Paystack/Flutterwave).",
          benefits: ["Mobile Responsive & Ultra Fast", "Paystack & WhatsApp Integration", "SEO & Speed Optimization", "1 Year Maintenance Support"],
          ctaText: "Inquire on WhatsApp",
          suggestedPrice: "From ₦95,000",
          keywords: ["web-design", "ecommerce", "lagos-tech"],
          visualDirection: "modern software developer dual monitors glowing code",
          suggestedImageQuery: "web development laptop",
        },
        {
          title: "Mobile App Design & Development",
          description: "Cross-platform iOS and Android mobile solutions with seamless user experiences and real-time synchronization.",
          benefits: ["Intuitive UI/UX Flow", "Push Notifications & Offline Support", "App Store / Play Store Deployment", "API Integration"],
          ctaText: "Request Quote",
          suggestedPrice: "From ₦250,000",
          keywords: ["mobile-app", "flutter", "react-native"],
          visualDirection: "smartphone app interface ui ux design desk",
          suggestedImageQuery: "mobile app design",
        },
        {
          title: "IT Support, Cloud & Cybersecurity",
          description: "Reliable enterprise infrastructure management, cloud backups, domain setups, and proactive security monitoring.",
          benefits: ["24/7 Uptime Monitoring", "Cloud Storage & Backup", "Email & Domain Configuration", "Fast Remote Assistance"],
          ctaText: "Contact IT Team",
          suggestedPrice: "₦40,000 / Month",
          keywords: ["cloud", "it-support", "cybersecurity"],
          visualDirection: "modern cloud server data center sleek tech",
          suggestedImageQuery: "data server cloud",
        }
      ],
      recommendedKeywords: ["technology", "software-engineering", "nigeria-tech", "lagos-developer"]
    };
  }

  // Universal high-end fallback
  return {
    headline: `Professional Solutions by ${businessName}`,
    services: [
      {
        title: "Comprehensive Advisory & Execution",
        description: "End-to-end bespoke delivery crafted with stringent quality controls and responsive progress tracking.",
        benefits: ["Personalized Consultation", "Milestone-Driven Execution", "Guaranteed Turnaround", "Dedicated Account Manager"],
        ctaText: "Inquire on WhatsApp",
        suggestedPrice: "Custom Quote",
        keywords: ["consultation", "bespoke-services"],
        visualDirection: "corporate modern executive meeting professional",
        suggestedImageQuery: "business meeting office",
      },
      {
        title: "Express Premium Delivery",
        description: "Priority expedited service for urgent commercial requirements without compromising on precision.",
        benefits: ["Same-Day Priority Queue", "Real-Time Tracking", "Insured & Verified", "Direct Hotline Support"],
        ctaText: "Book Fast-Track",
        suggestedPrice: "Competitive Rate",
        keywords: ["express-service", "priority"],
        visualDirection: "speed modern dynamic professional delivery",
        suggestedImageQuery: "professional service teamwork",
      },
      {
        title: "Corporate Retainer & Maintenance",
        description: "Ongoing partnership package providing continuous support, priority discounts, and periodic audits.",
        benefits: ["Discounted Retainer Rates", "Scheduled Periodic Audits", "Zero Downtime SLA", "VIP WhatsApp Access"],
        ctaText: "Discuss Retainer",
        suggestedPrice: "Flexible Monthly Plan",
        keywords: ["corporate-retainer", "maintenance"],
        visualDirection: "handshake business partnership modern office",
        suggestedImageQuery: "business partnership handshake",
      }
    ],
    recommendedKeywords: ["verified-business", "direct-support", "lagos-commerce"]
  };
}
