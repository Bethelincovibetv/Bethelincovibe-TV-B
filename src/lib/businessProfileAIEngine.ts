import { getGeminiClient } from "./aiCollaborationEngine";

export interface BusinessProfileEnhanceInput {
  businessName: string;
  category?: string;
  currentBio?: string;
  currentServices?: any[];
  phone?: string;
  whatsapp?: string;
  location?: string;
  targetAudience?: string;
}

export interface BusinessProfileEnhanceResult {
  tagline: string;
  bio: string;
  aboutStory: string;
  suggestedServices: {
    title: string;
    description: string;
    suggestedPrice?: string;
  }[];
  salesOfferHook: string;
  trustPillars: string[];
}

export async function enhanceBusinessProfileWithAI(
  input: BusinessProfileEnhanceInput
): Promise<BusinessProfileEnhanceResult> {
  const prompt = `You are a world-class Nigerian & Global Business Brand Strategist, Copywriter, and Conversion Optimization Specialist for Bethelincovibe.

A business owner wants to optimize their official Public Business Profile, Directory Listing, and Sales Copy to attract high-paying clients, establish immense trust, and drive WhatsApp and phone inquiries.

BUSINESS DETAILS:
- Business Name: "${input.businessName || "My Business"}"
- Industry / Category: "${input.category || "General Business & Commerce"}"
- Current Bio / Summary: "${input.currentBio || "Quality products and services for customers."}"
- Location: "${input.location || "Nigeria / Global"}"
- Target Customers: "${input.targetAudience || "Retail and wholesale buyers, businesses, and individuals"}"

YOUR TASK:
Generate an irresistible, ultra-professional, and high-converting copy set tailored for Nigerian and international commerce.
Return a STRICT JSON object matching this exact schema:
{
  "tagline": "A punchy, memorable 5-10 word slogan/tagline.",
  "bio": "A compelling, trust-building 2-3 sentence summary (under 300 characters) ideal for profile headers and directory cards.",
  "aboutStory": "A 2-paragraph authentic brand story highlighting dedication to quality, customer satisfaction, rapid delivery, and integrity.",
  "suggestedServices": [
    {
      "title": "Clear, appealing service name",
      "description": "1-2 sentence description highlighting the specific client benefit and turnaround.",
      "suggestedPrice": "Optional realistic pricing or 'Custom Quote / Negotiable'"
    }
  ],
  "salesOfferHook": "A high-converting WhatsApp promotional hook or limited-time offer template (e.g. 'Enjoy 10% off your first order this month when you connect with us directly on WhatsApp!').",
  "trustPillars": ["Fast Nationwide Delivery", "100% Verified Quality", "Direct WhatsApp Support", "Competitive Pricing"]
}

STRICT RULES:
1. Do NOT use markdown code fences around the JSON if possible, or output clean JSON only.
2. Ensure realistic Nigerian market terms (Naira ₦, Lagos/Abuja context if relevant, WhatsApp focus).
3. Do NOT include placeholder asterisks ** in text.`;

  try {
    const gemini = await getGeminiClient();
    if (gemini) {
      const response = await gemini.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          temperature: 0.7,
        },
      });

      const text = response?.text || "";
      const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (parsed && parsed.bio && parsed.tagline) {
        return {
          tagline: parsed.tagline,
          bio: parsed.bio,
          aboutStory: parsed.aboutStory || parsed.bio,
          suggestedServices: Array.isArray(parsed.suggestedServices) && parsed.suggestedServices.length > 0
            ? parsed.suggestedServices
            : getDefaultServices(input.businessName, input.category),
          salesOfferHook: parsed.salesOfferHook || "Special limited-time discount available for all new WhatsApp inquiries!",
          trustPillars: Array.isArray(parsed.trustPillars) ? parsed.trustPillars : ["Verified Quality", "Swift Delivery", "Secure Payments"],
        };
      }
    }
  } catch (err) {
    console.warn("Gemini API call notice, using smart algorithmic brand enhancer fallback:", err);
  }

  // Smart fallback template engine
  return generateFallbackEnhancement(input);
}

function getDefaultServices(name: string, category: string = "Commerce") {
  return [
    {
      title: `Premium ${category} Consultation & Orders`,
      description: `Direct sourcing, quality assurance, and swift fulfillment for all ${category.toLowerCase()} requirements.`,
      suggestedPrice: "Custom Quote",
    },
    {
      title: "Express Delivery & Customer Support",
      description: "Dedicated account handling with real-time dispatch updates and nationwide logistics support.",
      suggestedPrice: "Flexible Rates",
    },
    {
      title: "Bulk & Wholesale Procurement",
      description: "Discounted commercial volume packages tailored for corporate clients and resellers.",
      suggestedPrice: "Special Wholesale Rates",
    },
  ];
}

function generateFallbackEnhancement(input: BusinessProfileEnhanceInput): BusinessProfileEnhanceResult {
  const name = input.businessName || "Our Enterprise";
  const cat = input.category || "Professional Services";
  const loc = input.location || "Nigeria";

  return {
    tagline: `Your Trusted Partner in Premium ${cat} & Excellence`,
    bio: `${name} is a premier provider of top-tier ${cat.toLowerCase()} in ${loc}. We combine uncompromised quality, transparent pricing, and rapid delivery to provide an outstanding customer experience.`,
    aboutStory: `At ${name}, we are committed to delivering excellence across all our ${cat.toLowerCase()} solutions. Founded with a vision to redefine reliability, our team works tirelessly to source the finest materials and provide seamless customer service.\n\nWhether you are placing an individual order or seeking long-term commercial partnerships, we pride ourselves on honesty, speed, and exceptional craftsmanship. Reach out to us today to experience the difference.`,
    suggestedServices: getDefaultServices(name, cat),
    salesOfferHook: `🎉 Exclusive Offer: Connect with ${name} today on WhatsApp and receive priority dispatch plus 5% off your first qualifying order!`,
    trustPillars: [
      "100% Quality Guaranteed",
      "Fast Nationwide Fulfillment",
      "Responsive WhatsApp Support",
      "Secure & Transparent Pricing",
    ],
  };
}
