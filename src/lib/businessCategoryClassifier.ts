import { supabase } from "@/integrations/supabase/client";
import { getGeminiClient } from "@/lib/aiCollaborationEngine";
import { PRESET_BUSINESS_CATEGORIES, BusinessCategoryDef } from "@/lib/businessCategories";

export interface CategoryClassificationResult {
  assignedCategoryId: string | null;
  assignedCategoryName: string;
  assignedCategorySlug: string;
  confidence: number; // 0 to 100
  classificationReason: string;
  originalCategoryName: string;
  originalCategoryId: string | null;
  isCorrect: boolean;
  status: "verified" | "auto_corrected" | "flagged_for_review";
  evidenceKeywords: string[];
}

export interface BusinessCategoryAuditItem {
  businessId: string;
  businessName: string;
  submittedBy?: string;
  currentCategoryId: string | null;
  currentCategoryName: string;
  aiSuggestedCategoryId: string | null;
  aiSuggestedCategoryName: string;
  confidence: number;
  reason: string;
  status: "correct" | "possibly_incorrect" | "incorrect";
  evidenceKeywords: string[];
  descriptionSnippet: string;
}

export interface BusinessCategoryAuditReport {
  totalAudited: number;
  correctCount: number;
  possiblyIncorrectCount: number;
  incorrectCount: number;
  items: BusinessCategoryAuditItem[];
  auditedAt: string;
}

// Rule-based classification dictionary for fallback and grounding
const CATEGORY_HEURISTIC_RULES: Array<{
  categorySlug: string;
  categoryName: string;
  keywords: string[];
  antiKeywords?: string[];
  weightMultiplier?: number;
}> = [
  {
    categorySlug: "fashion-luxury",
    categoryName: "Fashion & Luxury",
    keywords: [
      "fashion", "clothing", "dress", "dresses", "boutique", "tailoring", "bespoke", "tailor",
      "suit", "native wear", "ankara", "senator", "agbada", "shoes", "handbag", "handbags",
      "jewelry", "accessories", "apparel", "wear", "couture", "bridal", "gown", "fabrics", "lace"
    ],
    antiKeywords: ["restaurant", "food", "catering", "burger", "pizza", "pharmacy", "solar"],
  },
  {
    categorySlug: "food-hospitality",
    categoryName: "Food, Catering & Events",
    keywords: [
      "restaurant", "food", "catering", "caterer", "bakery", "cake", "cakes", "pastry", "chef",
      "kitchen", "meals", "small chops", "jollof", "cocktails", "drinks", "hospitality", "event planning",
      "buffet", "cafe", "bistro", "grill", "bbq", "shawarma"
    ],
    antiKeywords: ["software", "cybersecurity", "tailoring", "fashion", "boutique", "real estate"],
  },
  {
    categorySlug: "tech-it",
    categoryName: "Technology & Software",
    keywords: [
      "software", "web development", "website", "mobile app", "it support", "cloud", "cybersecurity",
      "programming", "coding", "saas", "tech", "computer", "network", "ui/ux", "devops", "hosting", "ai"
    ],
    antiKeywords: ["catering", "dress", "fashion boutique", "restaurant", "hair salon", "farming"],
  },
  {
    categorySlug: "creative-media",
    categoryName: "Creative & Media",
    keywords: [
      "photography", "videography", "video production", "graphic design", "branding", "logo design",
      "media", "advertising", "studio", "filmmaking", "animation", "content creation", "podcast"
    ],
    antiKeywords: ["restaurant", "real estate", "solar installation", "haulage"],
  },
  {
    categorySlug: "finance-legal",
    categoryName: "Finance, Accounting & Legal",
    keywords: [
      "accounting", "bookkeeping", "tax", "audit", "legal", "lawyer", "solicitor", "cac registration",
      "wealth management", "corporate law", "finance", "investment", "compliance", "consulting"
    ],
    antiKeywords: ["dresses", "tailoring", "catering", "restaurant", "spa", "haircut"],
  },
  {
    categorySlug: "real-estate-construction",
    categoryName: "Real Estate & Construction",
    keywords: [
      "real estate", "property", "properties", "apartment", "shortlet", "land", "building", "construction",
      "architecture", "interior decor", "interior design", "facility management", "realtor", "houses"
    ],
    antiKeywords: ["bakery", "food", "hair braiding", "software coding"],
  },
  {
    categorySlug: "health-beauty-wellness",
    categoryName: "Health, Beauty & Wellness",
    keywords: [
      "beauty", "spa", "skincare", "massage", "hair salon", "barbershop", "makeup", "cosmetics",
      "wellness", "fitness", "gym", "pedicure", "manicure", "hair braiding", "wig", "wigs", "nails"
    ],
    antiKeywords: ["solar inverter", "real estate", "truck haulage", "tax audit"],
  },
  {
    categorySlug: "logistics-transport",
    categoryName: "Logistics, Haulage & Auto",
    keywords: [
      "logistics", "dispatch", "delivery", "courier", "haulage", "freight", "cargo", "interstate delivery",
      "auto repair", "mechanic", "car hire", "car rental", "automotive", "spare parts", "transportation"
    ],
    antiKeywords: ["dresses", "haircut", "catering", "software"],
  },
  {
    categorySlug: "retail-wholesale-solar",
    categoryName: "Retail, Wholesale & Solar",
    keywords: [
      "solar", "inverter", "solar installation", "solar panels", "batteries", "electronics", "appliances",
      "wholesale", "retail", "general merchandise", "supermarket", "gadgets", "importation"
    ],
    antiKeywords: ["event catering", "hair styling", "legal advice"],
  },
  {
    categorySlug: "education-training",
    categoryName: "Education, Training & Coaching",
    keywords: [
      "training", "coaching", "tutoring", "masterclass", "academy", "school", "bootcamp", "education",
      "courses", "exam prep", "consultant", "mentorship", "skill acquisition"
    ],
    antiKeywords: ["solar panels", "car rental", "restaurant"],
  },
  {
    categorySlug: "agriculture-farming",
    categoryName: "Agriculture & Agro-Allied",
    keywords: [
      "farming", "agriculture", "poultry", "livestock", "agro", "crops", "farm", "fertilizer",
      "greenhouse", "feed", "fish farming", "catfish", "agro-processing", "plantation"
    ],
    antiKeywords: ["software", "boutique", "law firm", "barbershop"],
  },
];

/**
 * Intelligent Business Category Classification Engine
 * Analyzes business data against platform taxonomy with confidence scoring.
 */
export async function classifyBusinessCategory(businessData: {
  name: string;
  description?: string;
  services?: any[];
  products?: any[];
  phone?: string;
  website?: string;
  currentCategoryId?: string | null;
  currentCategoryName?: string;
}): Promise<CategoryClassificationResult> {
  const {
    name,
    description = "",
    services = [],
    products = [],
    currentCategoryId = null,
    currentCategoryName = "Uncategorized",
  } = businessData;

  // 1. Fetch live database categories to map real UUIDs
  let dbCategories: Array<{ id: string; name: string; slug?: string }> = [];
  try {
    const { data } = await supabase
      .from("categories")
      .select("id, name, slug")
      .eq("type", "business");
    if (data && data.length > 0) {
      dbCategories = data;
    }
  } catch (err) {
    console.warn("Could not query live categories:", err);
  }

  // 2. Synthesize corpus
  const serviceText = Array.isArray(services)
    ? services.map((s) => (typeof s === "string" ? s : `${s.title || ""} ${s.description || ""}`)).join(" ")
    : "";
  const productText = Array.isArray(products)
    ? products.map((p) => (typeof p === "string" ? p : `${p.name || p.title || ""} ${p.description || ""}`)).join(" ")
    : "";

  const corpus = `${name} ${description} ${serviceText} ${productText}`.toLowerCase();

  // 3. AI-powered classification via Gemini
  const prompt = `You are the Lead Business Verification & Category Classification AI for Bethelincovibe TV (Nigeria's premier SME ecosystem).

TASK:
Analyze the submitted business data and determine the EXACT, most accurate business category from the standard platform taxonomy.
Never blindly accept an incorrect category (e.g. A boutique selling dresses and handbags MUST NOT be categorized as Food or Restaurant).

BUSINESS SUBMISSION:
- Business Name: "${name}"
- Description: "${description || "Not provided"}"
- Services Mentioned: "${serviceText || "None specified"}"
- Products Mentioned: "${productText || "None specified"}"
- Current Category Selected by User: "${currentCategoryName || "None"}"

AVAILABLE STANDARD CATEGORIES:
1. Fashion & Luxury (slug: "fashion-luxury") - Bespoke tailoring, native wear, dresses, boutique, shoes, bags, jewelry
2. Food, Catering & Events (slug: "food-catering-events") - Restaurants, catering, bakery, cakes, drinks, small chops, event planning
3. Technology & Software (slug: "technology-software") - Web development, apps, IT support, cloud, cybersecurity, software
4. Creative & Media (slug: "creative-media") - Photography, video production, graphic design, branding, studio
5. Finance, Accounting & Legal (slug: "finance-accounting-legal") - CAC registration, tax, audit, legal advisory, bookkeeping
6. Real Estate & Construction (slug: "real-estate-construction") - Property sales, shortlets, architectural design, building, interior decor
7. Health, Beauty & Wellness (slug: "health-beauty-wellness") - Spa, skincare, hair salon, wigs, barbershop, cosmetics, gym
8. Logistics, Haulage & Auto (slug: "logistics-haulage-auto") - Dispatch delivery, haulage, car repair, auto mechanics, vehicle hire
9. Retail, Wholesale & Solar (slug: "retail-wholesale-solar") - Solar inverters, batteries, electronics, general merchandise
10. Education, Training & Coaching (slug: "education-training-coaching") - Tech bootcamps, tutoring, courses, business coaching
11. Agriculture & Agro-Allied (slug: "agriculture-agro-allied") - Farming, poultry, livestock, agro commodities

OUTPUT JSON FORMAT ONLY:
{
  "categorySlug": "fashion-luxury",
  "categoryName": "Fashion & Luxury",
  "confidence": 98, // Number between 0 and 100
  "isCurrentCategoryCorrect": false, // true if user category is aligned, false if misclassified
  "reason": "Business clearly offers women's clothing, bespoke tailoring, and handbags which belongs under Fashion & Luxury, not Food.",
  "evidenceKeywords": ["dresses", "handbags", "boutique", "fashion"]
}`;

  try {
    const gemini = await getGeminiClient();
    if (gemini) {
      const response = await gemini.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          temperature: 0.2,
        },
      });

      const raw = response?.text || "";
      const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (parsed && parsed.categorySlug && parsed.confidence !== undefined) {
        // Find matching DB Category ID
        const matchedDbCat = dbCategories.find(
          (c) =>
            (c.slug && c.slug.toLowerCase() === parsed.categorySlug.toLowerCase()) ||
            c.name.toLowerCase() === parsed.categoryName.toLowerCase()
        );

        const confidence = Math.min(Math.max(Number(parsed.confidence) || 50, 0), 100);
        const isCorrect = Boolean(parsed.isCurrentCategoryCorrect);

        let status: "verified" | "auto_corrected" | "flagged_for_review" = "verified";
        if (!isCorrect) {
          status = confidence >= 80 ? "auto_corrected" : "flagged_for_review";
        }

        return {
          assignedCategoryId: matchedDbCat?.id || currentCategoryId,
          assignedCategoryName: parsed.categoryName,
          assignedCategorySlug: parsed.categorySlug,
          confidence,
          classificationReason: parsed.reason || "Classified based on contextual business signals.",
          originalCategoryName: currentCategoryName,
          originalCategoryId: currentCategoryId,
          isCorrect,
          status,
          evidenceKeywords: Array.isArray(parsed.evidenceKeywords) ? parsed.evidenceKeywords : [],
        };
      }
    }
  } catch (err) {
    console.warn("AI Category Classifier notice, running heuristic engine:", err);
  }

  // 4. Heuristic Fallback Engine
  return classifyByHeuristic(corpus, currentCategoryName, currentCategoryId, dbCategories);
}

/**
 * Heuristic pattern classification based on weighted keyword occurrences
 */
function classifyByHeuristic(
  corpus: string,
  currentCategoryName: string,
  currentCategoryId: string | null,
  dbCategories: Array<{ id: string; name: string; slug?: string }>
): CategoryClassificationResult {
  let highestScore = 0;
  let bestRule = CATEGORY_HEURISTIC_RULES[0];
  let matchedKeywords: string[] = [];

  for (const rule of CATEGORY_HEURISTIC_RULES) {
    let score = 0;
    const matched: string[] = [];

    for (const kw of rule.keywords) {
      if (corpus.includes(kw.toLowerCase())) {
        score += 10;
        matched.push(kw);
      }
    }

    if (rule.antiKeywords) {
      for (const akw of rule.antiKeywords) {
        if (corpus.includes(akw.toLowerCase())) {
          score -= 15;
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestRule = rule;
      matchedKeywords = matched;
    }
  }

  const confidence = Math.min(Math.max(Math.round((highestScore / 30) * 100), 60), 96);
  const isCorrect = currentCategoryName.toLowerCase().includes(bestRule.categoryName.toLowerCase().split(" ")[0]);

  const matchedDbCat = dbCategories.find(
    (c) =>
      (c.slug && c.slug.toLowerCase() === bestRule.categorySlug.toLowerCase()) ||
      c.name.toLowerCase() === bestRule.categoryName.toLowerCase()
  );

  return {
    assignedCategoryId: matchedDbCat?.id || currentCategoryId,
    assignedCategoryName: bestRule.categoryName,
    assignedCategorySlug: bestRule.categorySlug,
    confidence,
    classificationReason: `Identified ${matchedKeywords.length} primary sector signals: [${matchedKeywords.slice(0, 4).join(", ")}] indicating ${bestRule.categoryName}.`,
    originalCategoryName: currentCategoryName,
    originalCategoryId: currentCategoryId,
    isCorrect,
    status: isCorrect ? "verified" : confidence >= 80 ? "auto_corrected" : "flagged_for_review",
    evidenceKeywords: matchedKeywords,
  };
}

/**
 * Scans and audits ALL businesses in the database for category correctness.
 * Returns an audit breakdown and identifies mismatches.
 */
export async function auditAllBusinessesCategories(): Promise<BusinessCategoryAuditReport> {
  const { data: businesses, error } = await supabase
    .from("suppliers")
    .select("id, name, description, services, category_id, submitted_by, categories(name, slug)")
    .order("created_at", { ascending: false });

  if (error || !businesses) {
    throw new Error(`Failed to load businesses for category audit: ${error?.message}`);
  }

  const { data: categoriesData } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("type", "business");

  const dbCategories = categoriesData || [];
  const auditItems: BusinessCategoryAuditItem[] = [];

  let correctCount = 0;
  let possiblyIncorrectCount = 0;
  let incorrectCount = 0;

  for (const biz of businesses) {
    const catObj = biz.categories as any;
    const currentCatName = catObj?.name || "Uncategorized";

    const classification = await classifyBusinessCategory({
      name: biz.name || "",
      description: biz.description || "",
      services: Array.isArray(biz.services) ? biz.services : [],
      currentCategoryId: biz.category_id,
      currentCategoryName: currentCatName,
    });

    let status: "correct" | "possibly_incorrect" | "incorrect" = "correct";

    if (!classification.isCorrect) {
      if (classification.confidence >= 80) {
        status = "incorrect";
        incorrectCount++;
      } else {
        status = "possibly_incorrect";
        possiblyIncorrectCount++;
      }
    } else {
      correctCount++;
    }

    // Match DB ID for suggested category
    const matchedDbCat = dbCategories.find(
      (c) =>
        (c.slug && c.slug.toLowerCase() === classification.assignedCategorySlug.toLowerCase()) ||
        c.name.toLowerCase() === classification.assignedCategoryName.toLowerCase()
    );

    auditItems.push({
      businessId: biz.id,
      businessName: biz.name || "Unnamed Business",
      submittedBy: biz.submitted_by,
      currentCategoryId: biz.category_id,
      currentCategoryName: currentCatName,
      aiSuggestedCategoryId: matchedDbCat?.id || biz.category_id,
      aiSuggestedCategoryName: classification.assignedCategoryName,
      confidence: classification.confidence,
      reason: classification.classificationReason,
      status,
      evidenceKeywords: classification.evidenceKeywords,
      descriptionSnippet: (biz.description || "").slice(0, 120),
    });
  }

  return {
    totalAudited: businesses.length,
    correctCount,
    possiblyIncorrectCount,
    incorrectCount,
    items: auditItems,
    auditedAt: new Date().toISOString(),
  };
}

/**
 * Idempotently applies category corrections to the database without duplicating listings.
 */
export async function batchApplyCategoryCorrections(
  corrections: Array<{ businessId: string; newCategoryId: string; newCategoryName: string }>
): Promise<{ successCount: number; failedCount: number }> {
  let successCount = 0;
  let failedCount = 0;

  for (const item of corrections) {
    if (!item.businessId || !item.newCategoryId) continue;

    try {
      // Update supplier category directly
      const { error } = await supabase
        .from("suppliers")
        .update({
          category_id: item.newCategoryId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.businessId);

      if (!error) {
        successCount++;
      } else {
        failedCount++;
      }
    } catch {
      failedCount++;
    }
  }

  return { successCount, failedCount };
}
