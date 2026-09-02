import { ExtractedRequestInfo, POPULAR_REQUEST_CATEGORIES, UrgencyLevel, RequestServiceType } from "@/types/opportunityMatching";

/**
 * Intelligent Request Parser Service
 * Converts natural language requests into structured business opportunities.
 * Features fast client-side heuristics & deep Nigerian marketplace context.
 */

// Category dictionary with semantic synonyms & keywords
const CATEGORY_MAP: Array<{
  name: string;
  slug: string;
  keywords: string[];
  defaultPurpose: string;
  defaultServiceType: RequestServiceType;
}> = [
  {
    name: "Graphic Design",
    slug: "graphic-design",
    keywords: ["flyer", "logo", "graphic", "designer", "branding", "banner", "poster", "brochure", "mockup", "ui", "ux", "photoshop", "illustrator", "social media post", "menu design", "billboard", "business card", "sticker", "artwork"],
    defaultPurpose: "Business Promotion & Visual Branding",
    defaultServiceType: "service",
  },
  {
    name: "Web & Software Development",
    slug: "web-development",
    keywords: ["website", "web", "developer", "software", "app", "mobile app", "ecommerce", "online store", "shopify", "wordpress", "frontend", "backend", "fullstack", "landing page", "portal", "fintech", "coding", "programmer"],
    defaultPurpose: "Digital Infrastructure & Online Presence",
    defaultServiceType: "project",
  },
  {
    name: "Photography & Videography",
    slug: "media-production",
    keywords: ["photo", "photographer", "video", "videographer", "shoot", "camera", "drone", "editing", "film", "reels", "cinematography", "event coverage", "studio", "headshot", "product shoot"],
    defaultPurpose: "Media Production & Commercial Capture",
    defaultServiceType: "service",
  },
  {
    name: "Digital Marketing & Ads",
    slug: "digital-marketing",
    keywords: ["marketing", "ads", "advert", "facebook ads", "instagram ads", "meta ads", "google ads", "seo", "social media manager", "smm", "tiktok ads", "influencer", "lead generation", "funnel", "copywriting"],
    defaultPurpose: "Customer Acquisition & Brand Growth",
    defaultServiceType: "service",
  },
  {
    name: "Catering & Event Planning",
    slug: "catering-events",
    keywords: ["cater", "catering", "food", "cook", "chef", "baker", "cake", "small chops", "event planner", "wedding", "birthday", "party", "mc", "dj", "decorator", "hall", "cocktail", "buffet"],
    defaultPurpose: "Event Management & Hospitality",
    defaultServiceType: "service",
  },
  {
    name: "Printing & Branding",
    slug: "printing-branding",
    keywords: ["print", "printer", "printing", "tshirt", "t-shirt", "mug", "jotter", "souvenir", "rollup", "roll-up", "flex banner", "heat press", "screen print", "paper bag", "nylon", "branding material"],
    defaultPurpose: "Physical Branding & Merchandising",
    defaultServiceType: "product",
  },
  {
    name: "Logistics & Delivery",
    slug: "logistics",
    keywords: ["dispatch", "delivery", "rider", "courier", "haulage", "cargo", "freight", "waybill", "shipping", "transport", "van", "truck", "interstate delivery", "procurement"],
    defaultPurpose: "Supply Chain & Order Fulfillment",
    defaultServiceType: "service",
  },
  {
    name: "Fashion & Tailoring",
    slug: "fashion-tailoring",
    keywords: ["tailor", "sew", "fashion", "dressmaker", "designer", "cloth", "fabric", "ankara", "senator", "agbada", "aso ebi", "gown", "suit", "embroidery", "custom outfit"],
    defaultPurpose: "Apparel Creation & Bespoke Tailoring",
    defaultServiceType: "product",
  },
  {
    name: "Cleaning & Janitorial",
    slug: "cleaning",
    keywords: ["clean", "cleaning", "cleaner", "fumigation", "pest control", "deep clean", "janitor", "housekeeping", "laundry", "dry clean", "post-construction", "sofa cleaning", "carpet cleaning"],
    defaultPurpose: "Facility Maintenance & Hygiene",
    defaultServiceType: "service",
  },
  {
    name: "Legal & Business Registration",
    slug: "legal-cac",
    keywords: ["cac", "business name", "limited liability", "ltd", "lawyer", "attorney", "legal", "trademark", "patent", "tin", "tax", "scuml", "audit", "compliance", "contract agreement"],
    defaultPurpose: "Corporate Compliance & Legal Protection",
    defaultServiceType: "consultation",
  },
  {
    name: "Accounting & Tax",
    slug: "accounting-tax",
    keywords: ["accountant", "bookkeeper", "audit", "tax", "financial statements", "payroll", "quickbooks", "vat", "firs"],
    defaultPurpose: "Financial Management & Bookkeeping",
    defaultServiceType: "consultation",
  },
  {
    name: "Construction & Home Repairs",
    slug: "construction-repairs",
    keywords: ["plumber", "electrician", "painter", "carpenter", "mason", "ac repair", "generator", "tiler", "welder", "interior decor", "renovation", "handyman", "solar installation"],
    defaultPurpose: "Technical Repairs & Property Renovation",
    defaultServiceType: "service",
  },
];

/**
 * Parses budget figures in Naira (₦, N, k, m, etc.)
 */
function extractBudget(text: string): { amount: number | null; formatted: string; type: "fixed" | "range" | "negotiable" } {
  // Pattern 1: ₦20,000, ₦20k, N20,000, 20k naira, etc.
  const regexPatterns = [
    /(?:₦|N|NGN|\$)?\s*(\d{1,3}(?:,\d{3})+|\d+)\s*(k|m|million|thousand)?\s*(?:naira|budget|kobo)?/i,
    /budget\s*(?:is|of|around|:)?\s*(?:₦|N|NGN|\$)?\s*(\d{1,3}(?:,\d{3})+|\d+)\s*(k|m|million|thousand)?/i,
    /(\d+)\s*(?:k|thousand)\s*(?:naira)?/i,
  ];

  // Check for range: e.g. 10k - 20k or ₦10,000 to ₦20,000
  const rangeMatch = text.match(/(?:₦|N|NGN)?\s*(\d+k?|\d{1,3}(?:,\d{3})+)\s*(?:-|to)\s*(?:₦|N|NGN)?\s*(\d+k?|\d{1,3}(?:,\d{3})+)/i);
  if (rangeMatch) {
    const rawVal1 = parseNumberWithSuffix(rangeMatch[1]);
    const rawVal2 = parseNumberWithSuffix(rangeMatch[2]);
    if (rawVal1 && rawVal2) {
      const avg = Math.round((rawVal1 + rawVal2) / 2);
      return {
        amount: avg,
        formatted: `₦${rawVal1.toLocaleString()} - ₦${rawVal2.toLocaleString()}`,
        type: "range",
      };
    }
  }

  for (const pattern of regexPatterns) {
    const match = text.match(pattern);
    if (match) {
      const numStr = match[1].replace(/,/g, "");
      let val = parseFloat(numStr);
      const suffix = (match[2] || "").toLowerCase();
      if (suffix === "k" || suffix === "thousand") val *= 1000;
      if (suffix === "m" || suffix === "million") val *= 1000000;

      // Realistic sanity check (e.g. not year numbers like 2026 or single digit unless suffix)
      if (val >= 500 && val <= 500000000) {
        return {
          amount: val,
          formatted: `₦${val.toLocaleString()}`,
          type: "fixed",
        };
      }
    }
  }

  // Check if negotiable or open
  if (text.toLowerCase().includes("negotiable") || text.toLowerCase().includes("open to offers") || text.toLowerCase().includes("best price")) {
    return {
      amount: null,
      formatted: "Negotiable / Open to Offers",
      type: "negotiable",
    };
  }

  return {
    amount: null,
    formatted: "Open / Budget on discussion",
    type: "negotiable",
  };
}

function parseNumberWithSuffix(str: string): number | null {
  if (!str) return null;
  const clean = str.toLowerCase().replace(/[,₦n]/g, "").trim();
  if (clean.endsWith("k")) {
    const n = parseFloat(clean.slice(0, -1));
    return isNaN(n) ? null : n * 1000;
  }
  if (clean.endsWith("m")) {
    const n = parseFloat(clean.slice(0, -1));
    return isNaN(n) ? null : n * 1000000;
  }
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

/**
 * Extracts deadline & timeline urgency
 */
function extractDeadline(text: string): { deadlineText: string; urgency: UrgencyLevel } {
  const lower = text.toLowerCase();

  if (lower.includes("asap") || lower.includes("immediately") || lower.includes("today") || lower.includes("urgent") || lower.includes("emergency") || lower.includes("within 12 hours") || lower.includes("right now")) {
    return { deadlineText: "Today / Urgent (ASAP)", urgency: "urgent" };
  }
  if (lower.includes("tomorrow") || lower.includes("24 hours") || lower.includes("24hrs") || lower.includes("in 1 day") || lower.includes("next 24 hours")) {
    return { deadlineText: "Within 24 Hours", urgency: "high" };
  }
  if (lower.includes("before friday") || lower.includes("by friday") || lower.includes("friday")) {
    return { deadlineText: "This Friday", urgency: "medium" };
  }
  if (lower.includes("this weekend") || lower.includes("saturday") || lower.includes("sunday")) {
    return { deadlineText: "This Weekend", urgency: "medium" };
  }
  if (lower.includes("in 2 days") || lower.includes("48 hours") || lower.includes("48hrs") || lower.includes("in 3 days")) {
    return { deadlineText: "Within 2-3 Days", urgency: "medium" };
  }
  if (lower.includes("next week") || lower.includes("in a week") || lower.includes("within 7 days")) {
    return { deadlineText: "Next Week (7 Days)", urgency: "low" };
  }
  if (lower.includes("this month") || lower.includes("end of the month") || lower.includes("no rush")) {
    return { deadlineText: "Within This Month", urgency: "low" };
  }

  // Check for day of week mentions (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday)
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  for (const day of days) {
    if (lower.includes(`before ${day}`) || lower.includes(`by ${day}`) || lower.includes(`on ${day}`)) {
      const cap = day.charAt(0).toUpperCase() + day.slice(1);
      return { deadlineText: `By ${cap}`, urgency: "medium" };
    }
  }

  return { deadlineText: "Flexible / Standard turnaround", urgency: "medium" };
}

/**
 * Extracts location preference (Online/Remote vs physical city)
 */
function extractLocation(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("lagos") || lower.includes("ikeja") || lower.includes("lekki") || lower.includes("vi") || lower.includes("yaba") || lower.includes("surulere") || lower.includes("island") || lower.includes("mainland")) {
    return "Lagos, Nigeria";
  }
  if (lower.includes("abuja") || lower.includes("fct") || lower.includes("wuse") || lower.includes("garki") || lower.includes("maitama")) {
    return "Abuja (FCT)";
  }
  if (lower.includes("port harcourt") || lower.includes("ph") || lower.includes("rivers")) {
    return "Port Harcourt, Rivers";
  }
  if (lower.includes("ibadan") || lower.includes("oyo")) {
    return "Ibadan, Oyo";
  }
  if (lower.includes("enugu") || lower.includes("anambra") || lower.includes("onitsha") || lower.includes("awka")) {
    return "South East (Enugu/Anambra)";
  }
  if (lower.includes("remote") || lower.includes("online") || lower.includes("digital") || lower.includes("anywhere")) {
    return "Online / Remote";
  }
  return "Online / Nationwide";
}

/**
 * Extracts specific requirements and bullet points
 */
function extractSpecificRequirements(text: string, category: string): string[] {
  const requirements: string[] = [];
  const lower = text.toLowerCase();

  // Keyword-based deliverables
  if (lower.includes("flyer")) requirements.push("Professional single/double-sided flyer design");
  if (lower.includes("logo")) requirements.push("High-resolution vector logo with transparent background");
  if (lower.includes("revision") || lower.includes("revisions")) requirements.push("Revision rounds included");
  if (lower.includes("source file") || lower.includes("psd") || lower.includes("ai file")) requirements.push("Editable source files (PSD / AI / Figma)");
  if (lower.includes("print ready") || lower.includes("cmyk")) requirements.push("Print-ready 300 DPI high-resolution output");
  if (lower.includes("social media") || lower.includes("instagram")) requirements.push("Optimized for social media sharing");
  if (lower.includes("responsive") || lower.includes("mobile friendly")) requirements.push("Mobile-responsive design");
  if (lower.includes("fast") || lower.includes("urgent")) requirements.push("Priority fast-track turnaround");
  if (lower.includes("samples") || lower.includes("portfolio")) requirements.push("Provide verified samples of past work");

  // If none extracted, create tailored default deliverables
  if (requirements.length === 0) {
    if (category.toLowerCase().includes("design")) {
      requirements.push("High-resolution digital formats (PNG, JPG, PDF)");
      requirements.push("Clean commercial layout tailored to business branding");
    } else if (category.toLowerCase().includes("web")) {
      requirements.push("Clean, secure, and modern functional implementation");
      requirements.push("Full testing and deployment support");
    } else if (category.toLowerCase().includes("market")) {
      requirements.push("Target audience research and creative strategy");
      requirements.push("Performance metrics and delivery report");
    } else {
      requirements.push("Professional delivery meeting project specifications");
      requirements.push("Transparent timeline and prompt communication");
    }
  }

  return requirements;
}

/**
 * Generates an intelligent, clean title from prompt
 */
function generateServiceTitle(text: string, category: string): string {
  const lower = text.toLowerCase();

  if (lower.includes("flyer")) return "Professional Business Flyer Design";
  if (lower.includes("logo") && lower.includes("brand")) return "Full Business Brand Identity & Logo Kit";
  if (lower.includes("logo")) return "Custom Business Logo Design";
  if (lower.includes("website") || lower.includes("web app")) return "Modern Responsive Business Website";
  if (lower.includes("ecommerce") || lower.includes("online store")) return "E-Commerce Store Setup & Integration";
  if (lower.includes("photo shoot") || lower.includes("photographer")) return "Commercial & Product Photography Session";
  if (lower.includes("video edit") || lower.includes("reels")) return "Professional Video Editing & Social Media Reels";
  if (lower.includes("facebook ads") || lower.includes("instagram ads")) return "Targeted Social Media Advertising Campaign";
  if (lower.includes("cac") || lower.includes("business registration")) return "CAC Business Registration & Documentation";
  if (lower.includes("catering") || lower.includes("small chops")) return "Custom Event Catering & Small Chops Supply";
  if (lower.includes("tshirt") || lower.includes("printing")) return "High-Quality Custom T-Shirt / Merchandise Printing";
  if (lower.includes("dispatch") || lower.includes("delivery")) return "Reliable Express Dispatch & Logistics Service";
  if (lower.includes("cleaning") || lower.includes("fumigation")) return "Deep Facility Cleaning & Pest Fumigation";

  // Fallback: clean prompt snippet
  const cleaned = text
    .replace(/^i('m| am)?\s*(looking for|in need of|need|want)\s*(a|an)?/i, "")
    .replace(/my budget is.*$/i, "")
    .replace(/before friday.*$/i, "")
    .replace(/urgent.*$/i, "")
    .trim();

  if (cleaned.length > 5 && cleaned.length < 60) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return `Custom ${category} Project Request`;
}

/**
 * Main parser entry point: extracts structured data from natural language prompt
 */
export async function parseNaturalRequest(rawPrompt: string): Promise<ExtractedRequestInfo> {
  const prompt = (rawPrompt || "").trim();
  const lower = prompt.toLowerCase();

  // 1. Determine Category
  let bestCategory = CATEGORY_MAP[0];
  let highestScore = 0;

  for (const cat of CATEGORY_MAP) {
    let score = 0;
    for (const kw of cat.keywords) {
      if (lower.includes(kw)) {
        score += kw.length > 6 ? 3 : 2;
      }
    }
    if (score > highestScore) {
      highestScore = score;
      bestCategory = cat;
    }
  }

  // 2. Extract Budget
  const budgetInfo = extractBudget(prompt);

  // 3. Extract Deadline & Urgency
  const deadlineInfo = extractDeadline(prompt);

  // 4. Extract Location
  const locationPref = extractLocation(prompt);

  // 5. Generate Title & Deliverables
  const serviceTitle = generateServiceTitle(prompt, bestCategory.name);
  const specificRequirements = extractSpecificRequirements(prompt, bestCategory.name);

  // 6. Check if clarification question is genuinely needed
  let clarificationQuestion: string | undefined;
  const wordCount = prompt.split(/\s+/).filter(Boolean).length;
  if (wordCount < 4 && highestScore === 0) {
    clarificationQuestion = "Could you tell us a bit more about the specific service or product you need, and any deadline or budget you have in mind?";
  } else if (!budgetInfo.amount && budgetInfo.type === "negotiable" && wordCount < 6) {
    clarificationQuestion = "Do you have an approximate budget in mind (e.g. ₦10,000, ₦50,000) or would you prefer providers to quote freely?";
  }

  // 7. Calculate confidence
  const confidenceScore = Math.min(
    98,
    Math.max(
      50,
      (highestScore > 0 ? 35 : 15) +
      (budgetInfo.amount ? 25 : 15) +
      (deadlineInfo.deadlineText !== "Flexible / Standard turnaround" ? 20 : 10) +
      (wordCount > 6 ? 18 : 5)
    )
  );

  return {
    category: bestCategory.name,
    categorySlug: bestCategory.slug,
    serviceTitle,
    serviceType: bestCategory.defaultServiceType,
    purpose: bestCategory.defaultPurpose,
    budget: budgetInfo.amount,
    budgetFormatted: budgetInfo.formatted,
    budgetType: budgetInfo.type,
    deadline: deadlineInfo.deadlineText,
    urgency: deadlineInfo.urgency,
    locationPreference: locationPref,
    specificRequirements,
    clarificationQuestion,
    confidenceScore,
  };
}
